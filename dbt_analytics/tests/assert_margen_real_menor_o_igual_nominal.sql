-- Test singular en dbt para verificar consistencia financiera.
-- En un contexto inflacionario con pérdida por inflación >= 0,
-- el margen real ajustado por costo de reposición debe ser menor o igual al margen nominal.
-- dbt considera que la prueba falla si esta consulta devuelve registros.

SELECT *
FROM {{ ref('fct_ventas_inflacion') }}
WHERE margen_real > margen_nominal
