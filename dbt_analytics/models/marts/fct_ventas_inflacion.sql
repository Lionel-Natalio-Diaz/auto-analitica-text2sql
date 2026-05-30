with sales as (
    select * from {{ ref('stg_ventas') }}
),

products as (
    select * from {{ ref('stg_productos') }}
),

stores as (
    select * from {{ ref('stg_sucursales') }}
),

staff as (
    select * from {{ ref('stg_vendedores') }}
),

clients as (
    select * from {{ ref('stg_clientes') }}
),

ipc as (
    select * from {{ ref('stg_ipc') }}
),

inventory_costs as (
    -- Tomamos el costo promedio de reposición real del mes de la venta
    select 
        producto_id,
        mes_compra,
        avg(costo_unitario_real) as costo_reposicion_promedio
    from {{ ref('stg_compras') }}
    group by 1, 2
),

ipc_base as (
    -- Obtenemos el IPC inicial (dinámico según el mes mínimo disponible) para indexar en caso de fallback
    select indice as ipc_referencia_inicial
    from ipc
    where mes = (select min(mes) from ipc)
)

select
    s.venta_id,
    s.fecha,
    s.mes_venta,
    s.cliente_id,
    c.cliente_nombre,
    c.ciudad as cliente_ciudad,
    c.email as cliente_email,
    st.vendedor_nombre,
    su.sucursal_nombre,
    su.region,
    p.producto_nombre,
    p.categoria,
    s.cantidad,
    s.precio_unitario,
    s.venta_total_nominal,
    
    -- El costo histórico es el costo original del producto antes de la inflación
    (s.cantidad * p.costo_historico) as costo_total_historico,
    
    -- El costo de reposición es el real del mes. Si no hay compras, lo indexamos usando el IPC del mes de venta vs el mes base (Ene 2024)
    round(s.cantidad * coalesce(
        ic.costo_reposicion_promedio,
        p.costo_historico * (ipc_actual.indice / (select ipc_referencia_inicial from ipc_base))
    ), 2) as costo_total_reposicion,
    
    -- Margen Nominal: Ganancia aparente
    round(s.venta_total_nominal - (s.cantidad * p.costo_historico), 2) as margen_nominal,
    
    -- Margen Real: Ganancia real descontando el costo de volver a comprar la mercadería (con fallback de IPC)
    round(s.venta_total_nominal - (s.cantidad * coalesce(
        ic.costo_reposicion_promedio,
        p.costo_historico * (ipc_actual.indice / (select ipc_referencia_inicial from ipc_base))
    )), 2) as margen_real,
    
    -- Pérdida por Inflación
    round((s.cantidad * coalesce(
        ic.costo_reposicion_promedio,
        p.costo_historico * (ipc_actual.indice / (select ipc_referencia_inicial from ipc_base))
    )) - (s.cantidad * p.costo_historico), 2) as perdida_por_inflacion

from sales s
left join products p on s.producto_id = p.producto_id
left join stores su on s.sucursal_id = su.sucursal_id
left join staff st on s.vendedor_id = st.vendedor_id
left join clients c on s.cliente_id = c.cliente_id
left join inventory_costs ic on s.producto_id = ic.producto_id and s.mes_venta = ic.mes_compra
left join ipc ipc_actual on s.mes_venta = ipc_actual.mes

