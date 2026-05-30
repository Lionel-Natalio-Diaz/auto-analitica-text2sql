select
    cast(compra_id as integer) as compra_id,
    cast(producto_id as integer) as producto_id,
    cast(fecha as text) as fecha,
    strftime('%Y-%m', fecha) as mes_compra,
    cast(cantidad as integer) as cantidad,
    cast(costo_unitario_real as real) as costo_unitario_real
from {{ source('raw', 'raw_compras') }}
