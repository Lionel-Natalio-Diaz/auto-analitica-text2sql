import pandas as pd
import numpy as np
from faker import Faker
import sqlite3
from datetime import datetime, timedelta
import random

fake = Faker('es_ES')

# Configuración
num_clientes = 150
num_productos = 60
num_sucursales = 5
num_vendedores = 15
start_date = datetime(2024, 1, 1)
end_date = datetime(2025, 12, 31)

def fetch_real_ipc(start_date, end_date):
    """
    Consulta la API oficial de datos abiertos de Argentina para obtener la serie de inflación real (IPC).
    Calcula la inflación mensual basándose en el índice nivel general nacional.
    
    Args:
        start_date (datetime): Fecha de inicio de la serie.
        end_date (datetime): Fecha final de la serie.
        
    Returns:
        DataFrame: Un DataFrame de pandas con las columnas ['mes', 'indice', 'inflacion_mensual'] o None si falla.
    """
    import requests
    url = "https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&limit=5000&format=json"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        print("Consultando API oficial de inflación de Argentina (datos.gob.ar)...")
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code != 200:
            print(f"Advertencia: La API respondió con código de estado {r.status_code}")
            return None
        
        data = r.json()['data']
        df = pd.DataFrame(data, columns=['fecha', 'indice'])
        df['fecha'] = pd.to_datetime(df['fecha'])
        df = df.sort_values('fecha').reset_index(drop=True)
        
        # Calcular inflación mensual
        df['inflacion_mensual'] = df['indice'].pct_change()
        
        # Filtrar por rango
        df_filtered = df[(df['fecha'] >= start_date) & (df['fecha'] <= end_date)].copy()
        df_filtered['mes'] = df_filtered['fecha'].dt.strftime('%Y-%m')
        
        df_filtered = df_filtered[['mes', 'indice', 'inflacion_mensual']].reset_index(drop=True)
        df_filtered['indice'] = df_filtered['indice'].round(2)
        df_filtered['inflacion_mensual'] = df_filtered['inflacion_mensual'].round(4)
        
        print("Datos de IPC cargados exitosamente desde la API de datos.gob.ar.")
        return df_filtered
    except Exception as e:
        print(f"Advertencia: No se pudo conectar a la API de datos.gob.ar. Detalle: {e}")
        return None

def generate_mock_data():
    """
    Genera el dataset sintético relacional completo y lo almacena en una base de datos SQLite local (data.db).
    Simula entidades de negocio (sucursales, vendedores, clientes, productos, compras e IPC) y transacciones
    de venta a lo largo de un período de 2 años en un entorno inflacionario.
    """
    # 1. Sucursales
    regiones = ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán']
    sucursales = []
    for i in range(num_sucursales):
        sucursales.append({
            'sucursal_id': 10 + i,
            'nombre': f"Sucursal {regiones[i]}",
            'ciudad': regiones[i],
            'region': regiones[i]
        })
    df_sucursales = pd.DataFrame(sucursales)

    # 2. Vendedores
    vendedores = []
    for i in range(num_vendedores):
        vendedores.append({
            'vendedor_id': 200 + i,
            'nombre': fake.name(),
            'sucursal_id': random.choice(sucursales)['sucursal_id']
        })
    df_vendedores = pd.DataFrame(vendedores)

    # 3. Clientes
    clientes = []
    for _ in range(num_clientes):
        clientes.append({
            'cliente_id': fake.unique.random_number(digits=5),
            'nombre': fake.name(),
            'ciudad': fake.city(),
            'email': fake.email()
        })
    df_clientes = pd.DataFrame(clientes)

    # 4. Productos
    categorias = ['Neumáticos', 'Repuestos', 'Accesorios']
    productos = []
    for i in range(num_productos):
        cat = random.choice(categorias)
        productos.append({
            'producto_id': 1000 + i,
            'nombre': f"{cat} Modelo {fake.word().capitalize()}",
            'categoria': cat,
            'costo_base': round(random.uniform(50.0, 500.0), 2)
        })
    df_productos = pd.DataFrame(productos)

    # 5. IPC Mensual (Inflación)
    meses = pd.date_range(start=start_date, end=end_date, freq='MS')
    df_ipc = fetch_real_ipc(start_date, end_date)
    if df_ipc is None:
        print("Usando inflación simulada de fallback debido a fallas en la API...")
        ipc_data = []
        current_ipc = 100.0
        for mes in meses:
            inflacion_mensual = random.uniform(0.02, 0.08)
            current_ipc *= (1 + inflacion_mensual)
            ipc_data.append({
                'mes': mes.strftime('%Y-%m'),
                'indice': round(current_ipc, 2),
                'inflacion_mensual': round(inflacion_mensual, 4)
            })
        df_ipc = pd.DataFrame(ipc_data)

    # 6. Compras de Inventario (Costo de Reposición Real)
    # Generamos compras mensuales para cada producto que reflejan el aumento de costos por inflación
    compras = []
    for producto in productos:
        last_cost = producto['costo_base']
        for mes in meses:
            # El costo de compra sube según el IPC del mes (aproximadamente)
            inflacion_mes = df_ipc[df_ipc['mes'] == mes.strftime('%Y-%m')]['inflacion_mensual'].values[0]
            last_cost *= (1 + inflacion_mes + random.uniform(-0.01, 0.01))
            
            compras.append({
                'compra_id': fake.unique.random_number(digits=8),
                'producto_id': producto['producto_id'],
                'fecha': mes.strftime('%Y-%m-%d'),
                'cantidad': random.randint(50, 200),
                'costo_unitario_real': round(last_cost, 2)
            })
    df_compras = pd.DataFrame(compras)

    # 7. Ventas
    ventas = []
    current_date = start_date
    while current_date <= end_date:
        num_ventas_dia = random.randint(10, 30)
        mes_actual = current_date.strftime('%Y-%m')
        for _ in range(num_ventas_dia):
            producto = random.choice(productos)
            vendedor = random.choice(vendedores)
            
            # El precio de venta se fija al inicio del mes con un margen sobre el costo "visto"
            # Pero la inflación mensual lo erosiona antes de que termine el mes.
            precio_venta = producto['costo_base'] * random.uniform(1.4, 1.8)
            
            ventas.append({
                'venta_id': fake.unique.random_number(digits=8),
                'fecha': current_date.strftime('%Y-%m-%d'),
                'cliente_id': random.choice(clientes)['cliente_id'],
                'vendedor_id': vendedor['vendedor_id'],
                'sucursal_id': vendedor['sucursal_id'],
                'producto_id': producto['producto_id'],
                'cantidad': random.randint(1, 4),
                'precio_unitario': round(precio_venta, 2)
            })
        current_date += timedelta(days=1)
    df_ventas = pd.DataFrame(ventas)

    # Guardar en SQLite con DDL explícito e índices
    conn = sqlite3.connect('data.db')
    cursor = conn.cursor()
    
    # Habilitar claves foráneas en SQLite
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Dropear en orden de dependencia para evitar conflictos de claves foráneas
    cursor.execute("DROP TABLE IF EXISTS raw_ventas;")
    cursor.execute("DROP TABLE IF EXISTS raw_compras;")
    cursor.execute("DROP TABLE IF EXISTS raw_vendedores;")
    cursor.execute("DROP TABLE IF EXISTS raw_clientes;")
    cursor.execute("DROP TABLE IF EXISTS raw_productos;")
    cursor.execute("DROP TABLE IF EXISTS raw_sucursales;")
    cursor.execute("DROP TABLE IF EXISTS raw_ipc;")
    
    # Crear tablas
    cursor.execute("""
        CREATE TABLE raw_clientes (
            cliente_id INTEGER PRIMARY KEY,
            nombre TEXT NOT NULL,
            ciudad TEXT,
            email TEXT
        );
    """)
    
    cursor.execute("""
        CREATE TABLE raw_sucursales (
            sucursal_id INTEGER PRIMARY KEY,
            nombre TEXT NOT NULL,
            ciudad TEXT,
            region TEXT
        );
    """)
    
    cursor.execute("""
        CREATE TABLE raw_vendedores (
            vendedor_id INTEGER PRIMARY KEY,
            nombre TEXT NOT NULL,
            sucursal_id INTEGER,
            FOREIGN KEY (sucursal_id) REFERENCES raw_sucursales(sucursal_id)
        );
    """)
    
    cursor.execute("""
        CREATE TABLE raw_productos (
            producto_id INTEGER PRIMARY KEY,
            nombre TEXT NOT NULL,
            categoria TEXT,
            costo_base REAL NOT NULL
        );
    """)
    
    cursor.execute("""
        CREATE TABLE raw_ipc (
            mes TEXT PRIMARY KEY,
            indice REAL NOT NULL,
            inflacion_mensual REAL NOT NULL
        );
    """)
    
    cursor.execute("""
        CREATE TABLE raw_compras (
            compra_id INTEGER PRIMARY KEY,
            producto_id INTEGER,
            fecha TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            costo_unitario_real REAL NOT NULL,
            FOREIGN KEY (producto_id) REFERENCES raw_productos(producto_id)
        );
    """)
    
    cursor.execute("""
        CREATE TABLE raw_ventas (
            venta_id INTEGER PRIMARY KEY,
            fecha TEXT NOT NULL,
            cliente_id INTEGER,
            vendedor_id INTEGER,
            sucursal_id INTEGER,
            producto_id INTEGER,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES raw_clientes(cliente_id),
            FOREIGN KEY (vendedor_id) REFERENCES raw_vendedores(vendedor_id),
            FOREIGN KEY (sucursal_id) REFERENCES raw_sucursales(sucursal_id),
            FOREIGN KEY (producto_id) REFERENCES raw_productos(producto_id)
        );
    """)
    
    # Crear índices para acelerar búsquedas y JOINs
    cursor.execute("CREATE INDEX idx_ventas_fecha ON raw_ventas(fecha);")
    cursor.execute("CREATE INDEX idx_ventas_prod ON raw_ventas(producto_id);")
    cursor.execute("CREATE INDEX idx_ventas_cli ON raw_ventas(cliente_id);")
    cursor.execute("CREATE INDEX idx_compras_prod ON raw_compras(producto_id);")
    cursor.execute("CREATE INDEX idx_vendedores_suc ON raw_vendedores(sucursal_id);")
    
    conn.commit()
    
    # Escribir usando 'append' ya que las tablas existen
    df_clientes.to_sql('raw_clientes', conn, if_exists='append', index=False)
    df_productos.to_sql('raw_productos', conn, if_exists='append', index=False)
    df_sucursales.to_sql('raw_sucursales', conn, if_exists='append', index=False)
    df_vendedores.to_sql('raw_vendedores', conn, if_exists='append', index=False)
    df_compras.to_sql('raw_compras', conn, if_exists='append', index=False)
    df_ipc.to_sql('raw_ipc', conn, if_exists='append', index=False)
    df_ventas.to_sql('raw_ventas', conn, if_exists='append', index=False)
    
    conn.close()
    
    print("¡Base de datos relacional expandida generada exitosamente!")

if __name__ == "__main__":
    generate_mock_data()
