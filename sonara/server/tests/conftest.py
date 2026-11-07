import os
import tempfile
from pathlib import Path

import pytest

os.environ.setdefault("SONARA_ENGINE", "sonara-offline")
os.environ.setdefault("SONARA_COVERS", "1")


@pytest.fixture(scope="session", autouse=True)
def data_dir():
    tmp = Path(tempfile.mkdtemp(prefix="sonara-test-"))
    from sonara_server.config import settings

    settings.data_dir = tmp
    settings.ensure_dirs()
    yield tmp


@pytest.fixture(scope="session")
def client(data_dir):
    from fastapi.testclient import TestClient

    from sonara_server.main import app

    with TestClient(app) as test_client:
        yield test_client
