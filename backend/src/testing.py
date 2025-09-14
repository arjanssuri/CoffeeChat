# main.py
import os
import io
import time
from pathlib import Path
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import numpy as np
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import json

from dotenv import load_dotenv
import pandas as pd
import foundry_sdk
import subprocess
import sys
import asyncio
import inspect

from scripts.palhacksscrape import process  # import function
# =========================
# Config / Environment
# =========================

def setup():
    global BRANCH_NAME
    global TXT_INPUT_DATASET_RID
    global IMG_INPUT_DATASET_RID
    global QNA_DATASET_RID
    global SUMMARY_DATASET_RID
    global GENERAL_DATASET_RID
    global EVENT_DATASET_RID
    global EVENT_JOB_RID
    global PIPELINE_RID
    global FOUNDRY_HOSTNAME
    global FOUNDRY_TOKEN
    global HTTPS_PROXY
    global client
    global log
    global HEADERS_OCTET
    global http
    global PROXIES
    global ORCH_HEADERS_JSON
    global host
    
    global BASE_URL
    global IMAGE_FILE_NAME


    
    
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
    BASE_URL = _base_url(FOUNDRY_HOSTNAME)

    


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

    host = _normalize_hostname(FOUNDRY_HOSTNAME)





#TESTING

# --- Upload a file into the filesystem-backed dataset ---
def _normalize_hostname(h: str) -> str:
    h = h.strip()
    if h.startswith("https://"):
        h = h[len("https://"):]
    if h.endswith("/"):
        h = h[:-1]
    return h





def run_scraper(URL: str, out_name: str):
    script = Path(__file__).parent / "scripts" / "palhacksscrape.py"
    cmd = [sys.executable, str(script), "--url", URL, "--out", out_name]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Scraper failed ({res.returncode}): {res.stderr.strip() or res.stdout.strip()}")
    
    
    


def push_file(dataset_rid, name, URL):
    
    dataset_rel_path = name  # path within dataset (no ./)

    run_scraper(URL, name)
    _wait_for_file(f"./{dataset_rel_path}")

    url = f"https://{host}/api/v1/datasets/{dataset_rid}/files:upload"
    params = {"filePath": dataset_rel_path}

    with open(f"./{dataset_rel_path}", "rb") as f:
        data = f.read()

    resp = http.post(  # use the session with retries you configured
        url,
        params=params,
        data=data,
        headers=HEADERS_OCTET,
        proxies=PROXIES,      # <- only if HTTPS_PROXY is set
        timeout=60
    )
    print(resp.status_code, resp.text)
    resp.raise_for_status()

import time

def _wait_for_file(path: str, timeout: float = 60.0):
    p = Path(path)
    deadline = time.time() + timeout
    while time.time() < deadline:
        if p.exists() and p.stat().st_size > 0:
            return
        time.sleep(0.2)
    raise TimeoutError(f"File not created in time: {p}")

# WE SENT THE TXT FILE SUCCESSFULLY
# NOW CANT FIGURE OUT WHEN THE PIPELINE IS FINISHED BUILDING
# SO INSTEAD JUST SKIP IT AND CHECK THE RESULT LATER
# MAKE A WAITING PERIOD

def try_json(resp):
    ctype = (resp.headers.get("Content-Type") or "").lower()
    if resp.status_code == 204 or not resp.content:
        return None
    if "json" in ctype:
        return resp.json()
    raise RuntimeError(
        f"Expected JSON, got {ctype} (status={resp.status_code}). "
        f"Preview: {resp.text[:200]}"
    )

def _read_tabular_sdk(dataset_rid: str, columns=None) -> pd.DataFrame:
    """
    Same approach as main.py: stream CSV bytes via SDK, then parse with pandas.
    """
    stream = client.datasets.Dataset.read_table(
        dataset_rid,
        branch_name=BRANCH_NAME,
        format="CSV",
        columns=columns,
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


def get_output_table(output_table_rid: str, file_name: str, org_name: str) -> pd.DataFrame:
    df = _read_tabular_sdk(output_table_rid)
    print(df.columns)
    # Shortens the file path so that it just shows the actual file name

    #print(org_name)
    if ("org_name" in df.columns):
        
        
        df["org_name"] = df["org_name"].astype(str).str.split("\n").str[0]
        #print(df.head())
        filtered_df = df[df["org_name"] == org_name]
    else:
        df["path"] = df["path"].astype(str).str.split("/").str[-1]
        filtered_df = df[df["path"] == file_name]
    print(filtered_df.head())
    return filtered_df





# IMAGES

def _base_url(host: str) -> str:
    if not host:
        raise RuntimeError("FOUNDRY_HOSTNAME is empty")
    if "://" in host:
        p = urlparse(host)
        return f"{p.scheme or 'https'}://{p.netloc or p.path}".rstrip("/")
    return f"https://{host}".rstrip("/")




def upload_image_to_media_set(media_set_rid: str, local_image_name: str, folder: str = "incoming") -> str:
    """
    Upload a local image file into the given Media Set.
    Returns the logical mediaItemPath string (you can use this in downstream queries).
    """
    
    lp = Path(f"./{local_image_name}").resolve()
    if not lp.exists():
        raise FileNotFoundError(f"Local image not found: {lp}")

    
    media_item_path = f"{lp.name}"

    url = f"{BASE_URL}/api/v2/mediasets/{media_set_rid}/items"
    params = {
        "mediaItemPath": media_item_path,
        "preview": "true",
        "branchName": BRANCH_NAME,
    }

    with lp.open("rb") as f:
        resp = requests.post(url, params=params, data=f.read(), headers=HEADERS_OCTET, timeout=120)

    resp.raise_for_status()
    print(f"Upload OK — path={media_item_path}")

    return media_item_path




def main():
    setup()

    #IMPORTANT:
    #SIMULTANEOUS PUSH + GET CALLS WILL NOT WORK
    #there's a delay of like 2 mins for the pipeline to actually update
    #no workaround to wait, just have to set an arbitrary cool down for the users (skip past the cooldown for the demo video)

    file_name = "scraped_results.txt"
    #URL = "https://txproduct.org/"
    #push_file(TXT_INPUT_DATASET_RID, file_name, URL)
    get_output_table(QNA_DATASET_RID, file_name, "Texas Blockchain")


    #image_name = "test.png"
    #path = upload_image_to_media_set(IMG_INPUT_DATASET_RID, image_name)
    #print("Uploaded image path:", path)
    #get_output_table(EVENT_DATASET_RID, image_name)


if __name__ == "__main__":
    main()