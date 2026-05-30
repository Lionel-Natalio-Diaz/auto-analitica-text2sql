select
    cast(venta_id as integer) as venta_id,
    strftime('%Y-%m-%d', fecha) as fecha,
    strftime('%Y-%m', fecha) as mes_venta,
    cast(cliente_id as integer) as cliente_id,
    cast(vendedor_id as integer) as vendedor_id,
    cast(sucursal_id as integer) as sucursal_id,
    cast(producto_id as integer) as producto_id,
    cast(cantidad as integer) as cantidad,
    cast(precio_unitario as real) as precio_unitario,
    (cast(cantidad as integer) * cast(precio_unitario as real)) as venta_total_nominal
from {{ source('raw', 'raw_ventas') }}
