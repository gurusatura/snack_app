from fastapi.testclient import TestClient
from app.main import app
from app.config import get_settings

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "Snack Overflow API"


def test_cors_middleware():
    settings = get_settings()
    allowed_origin = settings.cors_origins_list[0]

    # Preflight request from allowed origin
    headers = {
        "Origin": allowed_origin,
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == allowed_origin

    # Request from disallowed origin
    disallowed_headers = {
        "Origin": "http://malicious-site.com",
        "Access-Control-Request-Method": "GET",
    }
    disallowed_response = client.options("/health", headers=disallowed_headers)
    assert disallowed_response.headers.get("access-control-allow-origin") != "http://malicious-site.com"
