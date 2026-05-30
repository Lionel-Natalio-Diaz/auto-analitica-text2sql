select
    cast(sucursal_id as integer) as sucursal_id,
    trim(nombre) as sucursal_nombre,
    coalesce(trim(ciudad), 'No Especificada') as ciudad,
    coalesce(trim(region), 'General') as region
from {{ source('raw', 'raw_sucursales') }}
