select
    cast(producto_id as integer) as producto_id,
    trim(nombre) as producto_nombre,
    coalesce(trim(categoria), 'Otros') as categoria,
    cast(costo_base as real) as costo_historico
from {{ source('raw', 'raw_productos') }}
