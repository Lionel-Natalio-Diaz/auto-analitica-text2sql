import pytest
from app.agent import sanitize_sql

def test_sanitize_sql_valid_queries():
    # Consultas SELECT simples
    assert sanitize_sql("SELECT * FROM fct_ventas_inflacion") is True
    assert sanitize_sql("select region, sum(margen_real) from fct_ventas_inflacion group by region") is True
    
    # Consultas con WITH (CTEs)
    cte_query = """
    WITH VentasRankeadas AS (
        SELECT 
            sucursal_nombre, 
            vendedor_nombre, 
            SUM(margen_real) AS total_margen_real,
            RANK() OVER (PARTITION BY sucursal_nombre ORDER BY SUM(margen_real) DESC) as rn
        FROM fct_ventas_inflacion
        GROUP BY sucursal_nombre, vendedor_nombre
    )
    SELECT sucursal_nombre, vendedor_nombre, total_margen_real
    FROM VentasRankeadas
    WHERE rn = 1
    """
    assert sanitize_sql(cte_query) is True

def test_sanitize_sql_blocked_ddl_dml():
    # Modificaciones DML/DDL prohibidas
    assert sanitize_sql("DELETE FROM fct_ventas_inflacion") is False
    assert sanitize_sql("DROP TABLE raw_ventas") is False
    assert sanitize_sql("UPDATE stg_productos SET costo_base = 100") is False
    assert sanitize_sql("INSERT INTO raw_clientes (nombre) VALUES ('Pedro')") is False
    assert sanitize_sql("ALTER TABLE raw_ventas ADD COLUMN test INTEGER") is False
    assert sanitize_sql("TRUNCATE TABLE raw_ipc") is False

def test_sanitize_sql_query_chaining():
    # Inyecciones con punto y coma (múltiples sentencias)
    assert sanitize_sql("SELECT * FROM raw_clientes; DROP TABLE raw_clientes") is False
    assert sanitize_sql("SELECT * FROM raw_clientes; DELETE FROM raw_ventas;") is False
    # Permitir punto y coma al final de la consulta (estándar SQL)
    assert sanitize_sql("SELECT * FROM raw_clientes;") is True
