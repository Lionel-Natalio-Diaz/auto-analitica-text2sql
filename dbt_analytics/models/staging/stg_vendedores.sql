select
    cast(vendedor_id as integer) as vendedor_id,
    trim(nombre) as vendedor_nombre,
    cast(sucursal_id as integer) as sucursal_id
from {{ source('raw', 'raw_vendedores') }}
