select
    cast(cliente_id as integer) as cliente_id,
    trim(nombre) as cliente_nombre,
    coalesce(trim(ciudad), 'No Especificada') as ciudad,
    coalesce(lower(trim(email)), 'sin-email@empresa.com') as email
from {{ source('raw', 'raw_clientes') }}
