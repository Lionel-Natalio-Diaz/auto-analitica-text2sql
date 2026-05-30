import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "API de Agente Analítico Activa"}

def test_get_preview():
    # El preview por defecto consulta fct_ventas_inflacion
    response = client.get("/api/preview")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_preview_invalid_table():
    response = client.get("/api/preview/tabla_inexistente")
    assert response.status_code == 400
    assert response.json()["detail"] == "Tabla no permitida"

def test_get_dashboard_stats():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_ventas" in data
    assert "total_margen_nominal" in data
    assert "total_margen_real" in data
    assert "total_perdida_inflacion" in data

def test_get_dashboard_trends():
    response = client.get("/api/dashboard/trends")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_regional_performance():
    response = client.get("/api/dashboard/regions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_sales_performance():
    response = client.get("/api/dashboard/salespeople")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_category_performance():
    response = client.get("/api/dashboard/categories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
