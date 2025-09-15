# server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional
import os
import logging
import requests
from requests.adapters import HTTPAdapter
# imports (fix Retry)
from urllib3.util.retry import Retry  # <-- instead of: from urllib3 import Retry
from urllib.parse import urlparse
import foundry_sdk
from contextlib import asynccontextmanager
# third-party module in your repo; ensure it's importable
import testing  # make sure PYTHONPATH includes this package/module
import pandas as pd
import numpy as np
import json


# --- Globals populated on startup ---
BRANCH_NAME: str
TXT_INPUT_DATASET_RID: str
IMG_INPUT_DATASET_RID: str
QNA_DATASET_RID: str
SUMMARY_DATASET_RID: str
GENERAL_DATASET_RID: str
EVENT_DATASET_RID: str
EVENT_JOB_RID: Optional[str]
PIPELINE_RID: str
FOUNDRY_HOSTNAME: str
FOUNDRY_TOKEN: str
BASE_URL: str
client: foundry_sdk.FoundryClient
http: requests.Session

def _base_url(host: str) -> str:
    if not host:
        raise RuntimeError("FOUNDRY_HOSTNAME is empty")
    if "://" in host:
        p = urlparse(host)
        return f"{p.scheme or 'https'}://{p.netloc or p.path}".rstrip("/")
    return f"https://{host}".rstrip("/")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global BRANCH_NAME, TXT_INPUT_DATASET_RID, IMG_INPUT_DATASET_RID
    global QNA_DATASET_RID, SUMMARY_DATASET_RID, GENERAL_DATASET_RID, EVENT_DATASET_RID
    global EVENT_JOB_RID, PIPELINE_RID, FOUNDRY_HOSTNAME, FOUNDRY_TOKEN, BASE_URL
    global client, http

    # IDs / constants
    BRANCH_NAME = "master"
    TXT_INPUT_DATASET_RID = "ri.foundry.main.dataset.466dbd70-55d3-4c38-999b-38e74d04f488"
    IMG_INPUT_DATASET_RID = "ri.mio.main.media-set.fcf52fe6-b4a9-447d-bfa9-7112cf2770c8"
    QNA_DATASET_RID     = "ri.foundry.main.dataset.057e6d95-da92-4ab6-bfd3-c9041c03b4d8"
    SUMMARY_DATASET_RID = "ri.foundry.main.dataset.22bdd58a-35ea-44c8-a833-1bd2b971ee75"
    GENERAL_DATASET_RID = "ri.foundry.main.dataset.65e79f76-ecf3-474b-b98e-3aa5f670c071"
    EVENT_DATASET_RID   = "ri.foundry.main.dataset.be6a4779-3aa1-48af-9f96-d7f74d0c99f3"
    PIPELINE_RID        = "ri.eddie.main.pipeline.022569bf-ebb4-4e92-bb92-9f5f9bc526cf"

    # env
    load_dotenv()
    FOUNDRY_HOSTNAME = os.getenv("FOUNDRY_HOSTNAME", "")
    FOUNDRY_TOKEN    = os.getenv("FOUNDRY_TOKEN", "")
    EVENT_JOB_RID    = os.getenv("EVENT_JOB_RID")

    if not FOUNDRY_HOSTNAME or not FOUNDRY_TOKEN:
        raise RuntimeError("Set FOUNDRY_HOSTNAME and FOUNDRY_TOKEN in env/.env")

    BASE_URL = _base_url(FOUNDRY_HOSTNAME)

    # logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.FileHandler("debug.log"), logging.StreamHandler()],
    )
    log.info("Server starting; branch=%s", BRANCH_NAME)

    # robust HTTP session
    retry = Retry(connect=1, backoff_factor=0.5)
    adapter = HTTPAdapter(max_retries=retry)
    http = requests.Session()
    http.mount("https://", adapter)

    # foundry client
    client = foundry_sdk.FoundryClient(
        auth=foundry_sdk.UserTokenAuth(FOUNDRY_TOKEN),
        hostname=FOUNDRY_HOSTNAME,
    )

    # IMPORTANT: hand control back to Starlette/Uvicorn
    testing.setup()

    try:
        yield
    finally:
        try:
            http.close()
        except Exception:
            pass

app = FastAPI(lifespan=lifespan)
log = logging.getLogger("server")

@app.get("/")
def root():
    return {"status": "ok", "branch": BRANCH_NAME, "host": FOUNDRY_HOSTNAME}

# ---- Models for body payloads ----
class PushFileIn(BaseModel):
    kind: str  # "text" or "image"
    file_name: str
    url: Optional[str] = None  # required if kind == "text"

@app.post("/push_file")
def push_file(payload: PushFileIn):  # <-- sync endpoint
    if payload.kind == "text":
        if not payload.url:
            raise HTTPException(status_code=400, detail="url is required for kind='text'")
        # blocks until scraper finished and file uploaded
        testing.push_file(TXT_INPUT_DATASET_RID, payload.file_name, payload.url)
        return {"message": "text file uploaded", "file_name": payload.file_name}

    elif payload.kind == "image":
        testing.upload_image_to_media_set(IMG_INPUT_DATASET_RID, payload.file_name)
        return {"message": "image uploaded", "file_name": payload.file_name}

    else:
        raise HTTPException(status_code=400, detail="kind must be 'text' or 'image'")

@app.post("/generate_txt")
def generate_txt(URL):
    testing.run_scraper(URL)
    return {"message":"File generated"}

class GetDatasetIn(BaseModel):
    dataset: str  # "qna" | "general" | "summary" | "events"
    file_name: str
    org_name: str


def df_records_json_safe(df: pd.DataFrame):
    df = df.replace([np.inf, -np.inf], np.nan)
    return json.loads(df.to_json(orient="records"))  # NaN -> null


@app.post("/get_dataset")
def get_dataset(payload: GetDatasetIn):
    ds = payload.dataset.lower()
    if ds == "qna":
        df = testing.get_output_table(QNA_DATASET_RID, payload.file_name, payload.org_name)
    elif ds == "general":
        df = testing.get_output_table(GENERAL_DATASET_RID, payload.file_name, payload.org_name)
    elif ds == "summary":
        df = testing.get_output_table(SUMMARY_DATASET_RID, payload.file_name, payload.org_name)
    elif ds == "events":
        df = testing.get_output_table(EVENT_DATASET_RID, payload.file_name, payload.org_name)
    else:
        raise HTTPException(status_code=400, detail="dataset must be one of qna|general|summary|events")
    rows = df_records_json_safe(df)
    # valid orientations: 'records', 'index', 'split', 'list', 'dict', 'tight', 'series'
    return {"message": "Dataset located", "rows": rows}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
