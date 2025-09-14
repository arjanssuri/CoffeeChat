# main.py
import os
import io
import time
import pathlib
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3 import Retry
from typing import Optional, Dict, Any

from dotenv import load_dotenv
import pandas as pd
import foundry_sdk
import subprocess

# =========================
# Config / Environment
# =========================
BRANCH_NAME = "master"  # Only needed for reading outputs & pipeline branch; upload endpoint uses default branch

# Inputs (filesystem datasets)
TXT_INPUT_DATASET_RID = "ri.foundry.main.dataset.466dbd70-55d3-4c38-999b-38e74d04f488"
IMG_INPUT_DATASET_RID = "ri.mio.main.media-set.fcf52fe6-b4a9-447d-bfa9-7112cf2770c8"

# Outputs (tabular datasets)
QNA_DATASET_RID     = "ri.foundry.main.dataset.057e6d95-da92-4ab6-bfd3-c9041c03b4d8"
SUMMARY_DATASET_RID = "ri.foundry.main.dataset.22bdd58a-35ea-44c8-a833-1bd2b971ee75"
GENERAL_DATASET_RID = "ri.foundry.main.dataset.65e79f76-ecf3-474b-b98e-3aa5f670c071"
EVENT_DATASET_RID   = "ri.foundry.main.dataset.be6a4779-3aa1-48af-9f96-d7f74d0c99f3"

EVENT_JOB_RID = os.getenv("EVENT_JOB_RID")

# Pipeline
PIPELINE_RID = "ri.eddie.main.pipeline.022569bf-ebb4-4e92-bb92-9f5f9bc526cf"

# .env (FOUNDRY_HOSTNAME, FOUNDRY_TOKEN, optional HTTPS_PROXY)
load_dotenv()
FOUNDRY_HOSTNAME = os.getenv("FOUNDRY_HOSTNAME")  # e.g. "waypoint-envoy.rubix-system.svc.cluster.local:8443"
FOUNDRY_TOKEN    = os.getenv("FOUNDRY_TOKEN")
HTTPS_PROXY      = os.getenv("HTTPS_PROXY", None)  # optional

if not FOUNDRY_HOSTNAME or not FOUNDRY_TOKEN:
    raise RuntimeError("Please set FOUNDRY_HOSTNAME and FOUNDRY_TOKEN in your environment or .env file.")




from urllib.parse import urlparse

def normalize_base_url(host: str) -> str:
    """
    Accepts values like:
      - 'arjanssuri.usw-23.palantirfoundry.com'
      - 'https://arjanssuri.usw-23.palantirfoundry.com'
      - 'https://arjanssuri.usw-23.palantirfoundry.com/'
      - 'waypoint-envoy.rubix-system.svc.cluster.local:8443'  (if you're on-network)
    Returns a clean 'scheme://host[:port]' with no trailing slash.
    """
    host = (host or "").strip()
    if not host:
        raise RuntimeError("FOUNDRY_HOSTNAME is empty.")
    if "://" in host:
        p = urlparse(host)
        base = f"{p.scheme or 'https'}://{p.netloc or p.path}"
    else:
        base = f"https://{host}"
    return base.rstrip("/")

BASE_URL = normalize_base_url(FOUNDRY_HOSTNAME)




import re
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Optional: schedule to trigger after upload (copy from Foundry UI -> Build schedules)
SCHEDULE_RID = os.getenv("FOUNDRY_SCHEDULE_RID")  # e.g. "ri.scheduler.main.schedule.xxxxx"

# Build a clean hostname for REST calls (no scheme)
HOST = re.sub(r"^https?://", "", (FOUNDRY_HOSTNAME or "").strip("/"))

# Requests session with retries
retry = Retry(total=10, connect=3, read=3, backoff_factor=0.6, status_forcelist=(429, 500, 502, 503, 504))
http = requests.Session()
http.mount("https://", HTTPAdapter(max_retries=retry))
HEADERS_JSON  = {"Authorization": f"Bearer {FOUNDRY_TOKEN}", "Content-Type": "application/json"}
HEADERS_OCTET = {"Authorization": f"Bearer {FOUNDRY_TOKEN}", "Content-Type": "application/octet-stream"}
PROXIES = {}  # set if your network requires it, else leave empty



# =========================
# Logging (like the docs)
# =========================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("debug.log"), logging.StreamHandler()],
)
log = logging.getLogger("main")

# =========================
# HTTP session (docs pattern)
# =========================
retry = Retry(connect=1, backoff_factor=0.5)
adapter = HTTPAdapter(max_retries=retry)
http = requests.Session()
http.mount("https://", adapter)

HEADERS_OCTET = {
    "Authorization": f"Bearer {FOUNDRY_TOKEN}",
    "Content-type": "application/octet-stream",  # IMPORTANT
}
PROXIES = {"https": HTTPS_PROXY} if HTTPS_PROXY else None

# =========================
# Foundry SDK client (for pipeline + reads)
# =========================
client = foundry_sdk.FoundryClient(
    auth=foundry_sdk.UserTokenAuth(FOUNDRY_TOKEN),
    hostname=FOUNDRY_HOSTNAME,
)

# ===== One-off Build (no schedules) =====
ORCH_HEADERS_JSON = {
    "Authorization": f"Bearer {FOUNDRY_TOKEN}",
    "Content-Type": "application/json",
}



def create_build_manual(target_rids: list[str],
                        branch_name: str = BRANCH_NAME,
                        force_build: bool = True,
                        retry_count: int = 0,
                        retry_backoff_seconds: int = 30) -> str:
    """
    Try multiple 'builds/create' payload shapes to accommodate tenant differences.
    Returns build RID on success, raises HTTPError on failure after all variants.
    """
    url = f"{BASE_URL}/api/v2/orchestration/builds/create"

    common = {
        "branchName": branch_name,
        "forceBuild": bool(force_build),
        "retryCount": int(retry_count),
        "retryBackoffDuration": {"unit": "SECONDS", "value": int(retry_backoff_seconds)},
        "abortOnFailure": False,
    }

    payload_variants = [
        # Variant A: manual + fallbackBranches (most common)
        {
            **common,
            "fallbackBranches": [branch_name],
            "target": {"type": "manual", "targetRids": target_rids},
        },
        # Variant B: manual, no fallbackBranches (some tenants reject fallback)
        {
            **{k: v for k, v in common.items() if k != "retryBackoffDuration"},  # a few tenants reject this field
            "target": {"type": "manual", "targetRids": target_rids},
        },
        # Variant C: datasets payload (some tenants prefer this shape)
        {
            **{k: v for k, v in common.items() if k != "retryBackoffDuration"},
            "target": {"type": "datasets", "datasetRids": target_rids},
        },
    ]

    last_err = None
    for i, body in enumerate(payload_variants, start=1):
        log.info("[build] create attempt %d -> %s  body=%s", i, url, body)
        resp = http.post(url, headers=ORCH_HEADERS_JSON, json=body, proxies=PROXIES)
        if 200 <= resp.status_code < 300:
            data = resp.json()
            build_rid = data.get("rid")
            if not build_rid:
                log.error("[build] create returned no RID: %s", data)
                last_err = RuntimeError("Create Build returned no RID")
                continue
            log.info("[build] started build_rid=%s for targets=%s (variant %d)", build_rid, target_rids, i)
            return build_rid

        # capture useful error info
        try:
            j = resp.json()
        except Exception:
            j = {"raw": resp.text}
        err_code = j.get("errorCode")
        err_name = j.get("errorName")
        err_id   = j.get("errorInstanceId")
        log.error("[build] create variant %d failed [%s] code=%s name=%s id=%s body=%s",
                  i, resp.status_code, err_code, err_name, err_id, j)
        last_err = requests.HTTPError(
            f"builds/create failed {resp.status_code}: {err_name or ''} ({err_code or ''}) id={err_id or ''}"
        )

    # If we got here, all variants failed
    raise last_err or RuntimeError("builds/create failed for all variants")

def probe_event_jobs_rest():
    """
    REST probe: list jobs that build EVENT on BRANCH_NAME.
    Helps verify EVENT is a build target on this branch.
    """
    url = f"{BASE_URL}/api/v2/datasets/{EVENT_DATASET_RID}/jobs"
    params = {"branchName": BRANCH_NAME, "orderBy": "CREATED_DESC", "limit": 25}
    try:
        r = http.get(url, headers={"Authorization": f"Bearer {FOUNDRY_TOKEN}"}, params=params, proxies=PROXIES)
        r.raise_for_status()
        data = r.json()
        jobs = data if isinstance(data, list) else data.get("data") or data.get("results") or []
        log.info("[probe] jobs (REST) for EVENT on '%s': count=%d", BRANCH_NAME, len(jobs))
        for j in jobs[:5]:
            rid = j.get("rid") or j.get("jobRid")
            name = j.get("name") or j.get("jobName")
            log.info("[probe] job sample rid=%s name=%s", rid, name)
        if not jobs:
            log.warning("[probe] No jobs found for EVENT on '%s'. Ensure EVENT is a declared build target on this branch.", BRANCH_NAME)
    except Exception as e:
        log.error("[probe] REST jobs failed: %s", e)


def get_event_job_rids_rest(dataset_rid: str = EVENT_DATASET_RID, branch_name: str = BRANCH_NAME) -> list[str]:
    url = f"{BASE_URL}/api/v2/datasets/{dataset_rid}/jobs"
    params = {"branchName": branch_name, "orderBy": "CREATED_DESC", "limit": 50}
    r = http.get(url, headers={"Authorization": f"Bearer {FOUNDRY_TOKEN}"}, params=params, proxies=PROXIES)
    r.raise_for_status()
    data = r.json()
    items = data if isinstance(data, list) else data.get("data") or data.get("results") or []
    rids: list[str] = []
    for j in items:
        rid = j.get("rid") or j.get("jobRid")
        if isinstance(rid, str):
            rids.append(rid)
    return rids


def create_build_for_jobs(job_rids: list[str],
                          branch_name: str = BRANCH_NAME,
                          force_build: bool = True,
                          retry_count: int = 0,
                          retry_backoff_seconds: int = 30) -> str:
    """
    Create a one-off build by targeting orchestration jobs directly.
    Your tenant requires 'fallbackBranches'.
    """
    url = f"{BASE_URL}/api/v2/orchestration/builds/create"
    body = {
        "branchName": branch_name,
        "fallbackBranches": [branch_name],
        "forceBuild": bool(force_build),
        "retryCount": int(retry_count),
        "retryBackoffDuration": {"unit": "SECONDS", "value": int(retry_backoff_seconds)},
        "abortOnFailure": False,
        "target": {"type": "jobs", "jobRids": job_rids},
    }
    log.info("[build] create(jobs) -> %s body=%s", url, body)
    resp = http.post(url, headers=ORCH_HEADERS_JSON, json=body, proxies=PROXIES)

    if not (200 <= resp.status_code < 300):
        try:
            j = resp.json()
        except Exception:
            j = {"raw": resp.text}
        err = f"[build] create(jobs) failed [{resp.status_code}] code={j.get('errorCode')} name={j.get('errorName')} id={j.get('errorInstanceId')} body={j}"
        log.error(err)
        raise requests.HTTPError(err)

    data = resp.json()
    build_rid = data.get("rid")
    if not build_rid:
        raise RuntimeError(f"Create Build (jobs) returned no RID: {data}")
    log.info("[build] started build_rid=%s for jobs=%s", build_rid, job_rids)
    return build_rid


def wait_for_build(build_rid: str, poll_seconds: int = 5, timeout_seconds: int = 1800) -> None:
    """
    Poll the build until it reaches a terminal state. Raises if FAILED or CANCELED.
    """
    url = f"{BASE_URL}/api/v2/orchestration/builds/{build_rid}"
    start = time.time()
    while True:
        r = http.get(url, headers={"Authorization": f"Bearer {FOUNDRY_TOKEN}"}, proxies=PROXIES)
        r.raise_for_status()
        status = r.json().get("status")
        log.info("[build] %s status=%s", build_rid, status)
        if status in ("SUCCEEDED", "FAILED", "CANCELED"):
            if status != "SUCCEEDED":
                raise RuntimeError(f"Build {build_rid} ended {status}")
            return
        if time.time() - start > timeout_seconds:
            raise TimeoutError(f"Build {build_rid} timed out after {timeout_seconds}s")
        time.sleep(poll_seconds)


# =========================
# Utilities
# =========================
def run_scraper(script_path: str, working_dir: Optional[str] = None) -> pathlib.Path:
    """
    Runs your scraper that writes 'scraped_results.txt'.
    If working_dir is None, runs in script folder so output lands there.
    """
    script = pathlib.Path(script_path).resolve()
    if not script.exists():
        raise FileNotFoundError(f"Scraper not found: {script}")
    cwd = pathlib.Path(working_dir).resolve() if working_dir else script.parent

    log.info("Running scraper…")
    res = subprocess.run(["python", script.name], cwd=str(cwd), capture_output=True, text=True)
    if res.returncode != 0:
        log.error(res.stdout)
        log.error(res.stderr)
        raise RuntimeError("Scraper failed.")
    out = cwd / "scraped_results.txt"
    
    if not out.exists():
        raise FileNotFoundError("scraped_results.txt was not created by scraper.")
    log.info("Scraper complete.")
    return out

from pathlib import Path

def upload_file_one_call(dataset_rid: str, foundry_file_path: str, local_path) -> None:
    if not dataset_rid.startswith("ri.foundry.main.dataset."):
        raise ValueError(
            f"upload_file_one_call expects a filesystem dataset RID; got '{dataset_rid}'. "
            f"Use upload_media_item_one_call for media sets."
        )
    url = f"{BASE_URL}/api/v1/datasets/{dataset_rid}/files:upload"
    params = {"filePath": foundry_file_path}
    data = Path(local_path).read_bytes()
    log.info(f"Uploading to {dataset_rid}:{foundry_file_path}")
    resp = http.post(url, params=params, data=data, headers=HEADERS_OCTET, proxies=PROXIES)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Upload failed [{resp.status_code}] {resp.text}\nURL={url}\nParams={params}\nLocalPath={local_path}"
        )
    log.info("Upload complete [200].")


# NEW: one-call upload for Media Sets
# --- add next to your file uploader ---
import re
MEDIA_ITEM_RID_RE = re.compile(r"ri\.mio\.main\.media-item\.[A-Za-z0-9\-]+", re.IGNORECASE)

def _extract_media_item_rid(resp) -> str | None:
    """
    Try common places/names for the created media item RID.
    - JSON keys: rid, mediaItemRid, media_item_rid, item.rid
    - Location header
    - RID-looking strings in body/headers (regex)
    """
    # JSON body
    try:
        j = resp.json()
        if isinstance(j, dict):
            for k in ("rid", "mediaItemRid", "media_item_rid"):
                v = j.get(k)
                if isinstance(v, str) and v.startswith("ri.mio.main.media-item."):
                    return v
            # nested common shape
            item = j.get("item") or j.get("data") or j.get("result")
            if isinstance(item, dict):
                v = item.get("rid")
                if isinstance(v, str) and v.startswith("ri.mio.main.media-item."):
                    return v
    except Exception:
        pass

    # Location header
    loc = resp.headers.get("Location") or resp.headers.get("location")
    if isinstance(loc, str):
        m = MEDIA_ITEM_RID_RE.search(loc)
        if m:
            return m.group(0)

    # Fallback: search body text for a RID
    try:
        txt = resp.text or ""
        m = MEDIA_ITEM_RID_RE.search(txt)
        if m:
            return m.group(0)
    except Exception:
        pass

    return None


def upload_media_item_one_call(media_set_rid: str, media_item_path: str, local_path) -> str:
    """
    Upload to a Media Set and return the created media item RID.
    POST {BASE_URL}/api/v2/mediasets/{mediaSetRid}/items
         ?mediaItemPath=...&preview=true[&branchName=...]
    Body: raw bytes, Content-Type: application/octet-stream
    """
    lp = Path(local_path) if not isinstance(local_path, Path) else local_path
    if not lp.exists():
        raise FileNotFoundError(f"Local file not found: {lp}")

    url = f"{BASE_URL}/api/v2/mediasets/{media_set_rid}/items"
    params = {
        "mediaItemPath": media_item_path,
        "preview": "true",
        # If your media set doesn't use branches, comment this out:
        "branchName": BRANCH_NAME,
    }
    data = lp.read_bytes()

    log.info(f"Uploading media item to {media_set_rid}:{media_item_path}")
    resp = http.post(url, params=params, data=data, headers=HEADERS_OCTET, proxies=PROXIES)

    if not (200 <= resp.status_code < 300):
        raise RuntimeError(
            f"Media upload failed [{resp.status_code}] {resp.text}\n"
            f"URL={url}\nParams={params}\nLocalPath={lp}"
        )

    rid = _extract_media_item_rid(resp)
    log.info(f"[image] media_item_rid={rid}")
    if not rid:
        # Not all tenants return JSON; but you usually get a Location header with the RID.
        # If still missing, you can still poll by filename/path as a fallback.
        log.warning("Upload succeeded but media item RID was not found in response; polling by filename will be less reliable.")
    else:
        log.info(f"Media upload complete [{resp.status_code}] — media_item_rid={rid}")
    return rid

def run_schedule(schedule_rid: str) -> str:
    url = f"{BASE_URL}/api/v2/orchestration/schedules/{schedule_rid}/run"
    resp = http.post(url, headers={"Authorization": f"Bearer {FOUNDRY_TOKEN}"}, proxies=PROXIES)
    resp.raise_for_status()
    run = resp.json()
    run_rid = run.get("rid")
    log.info(f"[schedule] started run {run_rid} for schedule {schedule_rid}")
    return run_rid

def wait_for_media_item_rows(media_item_rid: str, output_dataset_rid: str,
                             timeout_s: int = 900, poll_s: int = 5,
                             schedule_rid: str | None = None) -> pd.DataFrame:
    """
    Poll the output dataset until rows for this media_item_rid appear, or timeout.
    Also prints helpful diagnostics: total rows, columns, and first few non-empty matches if any.
    Optionally triggers a schedule once at the start.
    """
    start = time.time()
    cand_cols = ("media_item_rid", "mediaItemRid", "MEDIA_ITEM_RID", "mediaitemrid")

    if not media_item_rid:
        raise RuntimeError("media_item_rid is empty — upload likely didn’t return a RID. "
                           "Check the upload response or extract RID from response headers.")

    log.info(f"[wait] Looking for media_item_rid={media_item_rid} in {output_dataset_rid} (timeout={timeout_s}s)")

    # Optionally kick the schedule once
    if schedule_rid:
        try:
            log.info(f"[wait] Triggering schedule run: {schedule_rid}")
            _ = run_schedule(schedule_rid)
        except Exception as e:
            log.warning(f"[wait] Could not trigger schedule: {e}")

    first_columns_logged = False
    while True:
        try:
            df = read_tabular(output_dataset_rid)
            total = len(df)
            if not first_columns_logged:
                log.info(f"[wait] EVENT dataset has {total} rows; columns={list(df.columns)}")
                first_columns_logged = True

            matched = pd.DataFrame()
            for col in cand_cols:
                if col in df.columns:
                    matched = df[df[col].astype(str) == str(media_item_rid)]
                    break

            log.info(f"[wait] matched_rows={len(matched)} / total_rows={total}")
            if not matched.empty:
                # Optionally show a peek
                try:
                    log.info("[wait] sample match:\n" + matched.head(3).to_string(index=False))
                except Exception:
                    pass
                return matched

        except Exception as e:
            log.warning(f"[wait] transient read error: {e}")

        if time.time() - start > timeout_s:
            log.error("[wait] Timed out waiting for rows with this media_item_rid. "
                      "Check that your schedule ran and that the EVENT table includes the 'media_item_rid' column.")
            return pd.DataFrame()

        time.sleep(poll_s)


def run_image_path(local_image_path: str, img_dataset_foundry_folder="incoming"):
    p = pathlib.Path(local_image_path).resolve()
    if not p.exists():
        raise FileNotFoundError(f"Image not found: {p}")

    filename = p.name
    dated_prefix = f"{img_dataset_foundry_folder}/{time.strftime('%Y-%m-%d')}"
    media_item_path = f"{dated_prefix}/{filename}"

    # (1) Upload to media set → get media_item_rid
    media_item_rid = upload_media_item_one_call(
        media_set_rid=IMG_INPUT_DATASET_RID,
        media_item_path=media_item_path,
        local_path=p,
    )

    # (2) Kick a one-off build targeting the EVENT job(s), not the dataset
        # (2) Kick a one-off build targeting the EVENT job(s) (via REST), not the dataset
    job_rids = []
    if EVENT_JOB_RID:
        job_rids = [EVENT_JOB_RID]
    else:
        # fall back to REST discovery (will 404 on your tenant / if not target)
        job_rids = get_event_job_rids_rest(EVENT_DATASET_RID, BRANCH_NAME)

    if not job_rids:
        raise RuntimeError(
            "No orchestration jobs found for EVENT on this branch. Either:\n"
            "  1) set EVENT_JOB_RID in your environment, OR\n"
            "  2) mark EVENT as a Build Target on the pipeline for branch "
            f"'{BRANCH_NAME}' (Build tab in Foundry UI), then retry."
        )

    build_rid = create_build_for_jobs([job_rids[0]], branch_name=BRANCH_NAME)
    wait_for_build(build_rid)


    # (3) Read EVENT and match by media_item_rid
    img_out = read_tabular(EVENT_DATASET_RID)
    if "media_item_rid" in img_out.columns:
        matched = img_out[img_out["media_item_rid"].astype(str) == media_item_rid]
    elif "mediaItemRid" in img_out.columns:
        matched = img_out[img_out["mediaItemRid"].astype(str) == media_item_rid]
    elif "media_reference" in img_out.columns:
        import re as _re
        matched = img_out[img_out["media_reference"].astype(str).str.contains(_re.escape(media_item_rid), regex=True, na=False)]
    else:
        matched = img_out.iloc[0:0]

    return {
        "image_filename": filename,
        "media_item_rid": media_item_rid,
        "output_rows_for_rid": matched,
    }




def trigger_pipeline_and_wait(pipeline_rid: str, poll_seconds: int = 5, timeout_seconds: int = 3600) -> str:
    """
    Uses the Foundry SDK to create & monitor a pipeline run (kept from your working flow).
    If your tenant exposes a REST orchestration endpoint you prefer, you can swap it later.
    """
    log.info("Triggering pipeline run…")
    orch = getattr(client, "orchestration", None)
    if orch and hasattr(orch, "create_run"):
        run = orch.create_run(pipeline_rid=pipeline_rid, branch_name=BRANCH_NAME)
        run_rid = run["rid"] if isinstance(run, dict) else getattr(run, "rid", None)
        if not run_rid:
            raise RuntimeError("create_run returned no run RID.")

        start = time.time()
        while True:
            info = orch.get_run(run_rid)
            state = info["state"] if isinstance(info, dict) else getattr(info, "state", None)
            if state in ("SUCCEEDED", "FAILED", "CANCELED"):
                if state != "SUCCEEDED":
                    raise RuntimeError(f"Pipeline run ended with state: {state}")
                log.info(f"Pipeline SUCCEEDED: {run_rid}")
                return run_rid
            if time.time() - start > timeout_seconds:
                raise TimeoutError("Pipeline run timed out.")
            time.sleep(poll_seconds)

    # Fallback surface
    pipelines = getattr(client, "pipelines", None)
    if pipelines and hasattr(pipelines, "Pipeline"):
        pipe = pipelines.Pipeline(pipeline_rid)
        run = pipe.run(branch_name=BRANCH_NAME)
        run_rid = run["rid"] if isinstance(run, dict) else getattr(run, "rid", None)
        if hasattr(pipe, "wait_for_run"):
            pipe.wait_for_run(run_rid, timeout_seconds=timeout_seconds)
        else:
            start = time.time()
            while True:
                info = pipe.get_run(run_rid)
                state = info["state"] if isinstance(info, dict) else getattr(info, "state", None)
                if state in ("SUCCEEDED", "FAILED", "CANCELED"):
                    if state != "SUCCEEDED":
                        raise RuntimeError(f"Pipeline run ended with state: {state}")
                    break
                if time.time() - start > timeout_seconds:
                    raise TimeoutError("Pipeline run timed out.")
                time.sleep(poll_seconds)
        log.info(f"Pipeline SUCCEEDED: {run_rid}")
        return run_rid

    raise RuntimeError("No supported orchestration surface found on this tenant.")

def read_tabular(dataset_rid: str, columns=None, row_limit: Optional[int] = None) -> pd.DataFrame:
    """
    Read a Foundry table to pandas via CSV bytes using the SDK (stable & simple).
    """
    stream = client.datasets.Dataset.read_table(
        dataset_rid,
        branch_name=BRANCH_NAME,
        format="CSV",
        columns=columns,
        row_limit=row_limit,
    )
    buf = bytearray()
    if isinstance(stream, (bytes, bytearray)):
        buf.extend(stream)
    else:
        for chunk in stream:
            if isinstance(chunk, (bytes, bytearray)):
                buf.extend(chunk)
            elif isinstance(chunk, int):
                buf.append(chunk)
            else:
                buf.extend(bytes(chunk))
    return pd.read_csv(io.BytesIO(buf))

def filter_rows_for_file(df: pd.DataFrame, full_foundry_uri: str) -> pd.DataFrame:
    """
    Exact match against the full Foundry URI stored in the `_file` column.
    Normalizes CR/LF and surrounding whitespace to avoid hidden-char issues.
    """
    if "_file" not in df.columns:
        return df.iloc[0:0]

    def _norm(s: str) -> str:
        return str(s).replace("\r", "").replace("\n", "").strip()

    s = df["_file"].astype(str).map(_norm)
    target = _norm(full_foundry_uri)
    return df[s == target]

# =========================
# TEXT PATH
# =========================
def run_schedule(schedule_rid: str) -> str:
    """
    Fire-and-forget trigger of a build schedule.
    Returns the schedule run RID. (A 'succeeded' run means the build was *started*.)
    """
    url = f"https://{HOST}/api/v2/orchestration/schedules/{schedule_rid}/run"
    resp = http.post(url, headers={"Authorization": f"Bearer {FOUNDRY_TOKEN}"}, proxies=PROXIES)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Run schedule failed {resp.status_code}: {resp.text}")
    run = resp.json()
    return run.get("rid")

def list_schedule_runs(schedule_rid: str) -> list[dict]:
    url = f"https://{HOST}/api/v2/orchestration/schedules/{schedule_rid}/runs"
    resp = http.get(url, headers={"Authorization": f"Bearer {FOUNDRY_TOKEN}"}, proxies=PROXIES)
    resp.raise_for_status()
    return resp.json().get("data", [])

def wait_for_rows(filename: str, outputs: list[str], timeout_s: int = 900, poll_s: int = 5) -> dict[str, pd.DataFrame]:
    """
    Poll the listed dataset RIDs until at least one has rows for this filename, or timeout.
    Returns a dict of dataset_rid -> matched DataFrame (may be empty if none matched before timeout).
    """
    start = time.time()
    last = {}
    while True:
        any_rows = False
        for rid in outputs:
            try:
                df = read_tabular(rid)
                matched = filter_rows_for_file(df, filename)
                last[rid] = matched
                if not matched.empty:
                    any_rows = True
            except Exception as e:
                # Keep polling even if a dataset read fails transiently
                last[rid] = pd.DataFrame()
        if any_rows:
            return last
        if time.time() - start > timeout_s:
            return last
        time.sleep(poll_s)

def run_text_path(scraper_py: str, txt_dataset_foundry_folder="incoming"):
    logging.info("Running scraper…")
    local_txt = run_scraper(scraper_py)
    logging.info("Scraper complete.")
    filename = local_txt.name

    dated_prefix = f"{txt_dataset_foundry_folder}/{time.strftime('%Y-%m-%d')}"
    foundry_path = f"{dated_prefix}/{filename}"

    print("PATH: " + foundry_path)

    # 1) upload the .txt to the filesystem dataset
    upload_file_one_call(TXT_INPUT_DATASET_RID, foundry_path, local_txt)

    # 2) optionally trigger the build schedule (if provided)
    if SCHEDULE_RID:
        logging.info("Triggering schedule run…")
        _run_rid = run_schedule(SCHEDULE_RID)  # fire-and-forget; we will poll the outputs

    # 3) poll your 3 output datasets for rows matching this file
    results_map = wait_for_rows(
        #switch filename to foundry_path
        foundry_path,
        [QNA_DATASET_RID, SUMMARY_DATASET_RID, GENERAL_DATASET_RID],
        timeout_s=900,  # tweak if your pipeline is slower
        poll_s=5,
    )

    return {
        "txt_filename": filename,
        "output1_rows_for_file": results_map.get(QNA_DATASET_RID, pd.DataFrame()),
        "output2_rows_for_file": results_map.get(SUMMARY_DATASET_RID, pd.DataFrame()),
        "output3_rows_for_file": results_map.get(GENERAL_DATASET_RID, pd.DataFrame()),
    }

def rows_for_exact_foundry_uri(df, full_uri: str):
    if "_file" not in df.columns:
        return df.iloc[0:0]
    norm = lambda s: str(s).replace("\r", "").replace("\n", "").strip()
    s = df["_file"].astype(str).map(norm)
    return df[s == norm(full_uri)]

# =========================
# IMAGE PATH
# =========================


# =========================
# Main
# =========================
if __name__ == "__main__":
    # --- TEXT PATH: run scraper and process outputs ---
    
    results = run_text_path(scraper_py="./backend/src/scripts/palhacksscrape.py")
    print("=== Text Path Matching Rows (Output 1: QNA) ===")
    print(results["output1_rows_for_file"].head())
    print("=== Text Path Matching Rows (Output 2: SUMMARY) ===")
    print(results["output2_rows_for_file"].head())
    print("=== Text Path Matching Rows (Output 3: GENERAL) ===")
    print(results["output3_rows_for_file"].head())
    

    # --- IMAGE PATH (optional) ---
    """
    probe_event_jobs_rest()
    img_results = run_image_path(local_image_path="./backend/src/data/test.png")
    print("=== Image Path Matching Rows (EVENT) ===")
    print(img_results["output_rows_for_file"].head())
    """
