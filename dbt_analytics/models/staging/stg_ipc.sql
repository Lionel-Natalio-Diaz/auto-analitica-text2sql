select
    trim(mes) as mes,
    cast(indice as real) as indice,
    cast(inflacion_mensual as real) as inflacion_mensual
from {{ source('raw', 'raw_ipc') }}
