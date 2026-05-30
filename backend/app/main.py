from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import get_db, get_readonly_db, Base, engine, ChatSession, ChatMessage
from .agent import generate_sql, execute_query
from pydantic import BaseModel
import json
import uuid

# Crear las tablas al iniciar la aplicación si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Data Analytics Agent API")

# Configuración de CORS para el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción limitar a la URL del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = None

class SessionCreate(BaseModel):
    id: str = None
    title: str = "Nueva Consulta"

@app.get("/")
def read_root():
    """Endpoint raíz para comprobar el estado de salud de la API."""
    return {"message": "API de Agente Analítico Activa"}

@app.get("/api/preview/{table_name}")
def get_table_preview(table_name: str, db: Session = Depends(get_db)):
    """
    Retorna una previsualización (primeras 50 filas) de una tabla permitida de la base de datos.
    
    Args:
        table_name (str): Nombre de la tabla a previsualizar.
        db (Session): Sesión de la base de datos de SQLAlchemy.
        
    Raises:
        HTTPException: 400 si la tabla no está permitida, 500 para errores internos.
    """
    try:
        # Sanitización básica del nombre de la tabla
        allowed_tables = [
            'raw_clientes', 'raw_productos', 'raw_ventas', 'raw_ipc', 'raw_sucursales', 'raw_vendedores', 'raw_compras',
            'stg_clientes', 'stg_productos', 'stg_ventas', 'stg_ipc', 'stg_sucursales', 'stg_vendedores', 'stg_compras',
            'fct_ventas_inflacion'
        ]
        if table_name not in allowed_tables:
            raise HTTPException(status_code=400, detail="Tabla no permitida")
            
        query = f"SELECT * FROM {table_name} LIMIT 50"
        results = execute_query(db, query)
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preview")
def get_default_preview(db: Session = Depends(get_db)):
    """Retorna la previsualización predeterminada (primeras 50 filas de la tabla de hechos)."""
    return get_table_preview("fct_ventas_inflacion", db)


@app.get("/api/dashboard/stats")
def get_dashboard_stats(region: str = None, category: str = None, db: Session = Depends(get_db)):
    try:
        where_clauses = []
        params = {}
        if region and region != "Todas":
            where_clauses.append("region = :region")
            params["region"] = region
        if category and category != "Todas":
            where_clauses.append("categoria = :category")
            params["category"] = category
            
        where_str = ""
        if where_clauses:
            where_str = " WHERE " + " AND ".join(where_clauses)
            
        query = f"""
        SELECT 
            COALESCE(SUM(venta_total_nominal), 0) as total_ventas,
            COALESCE(SUM(margen_nominal), 0) as total_margen_nominal,
            COALESCE(SUM(margen_real), 0) as total_margen_real,
            COALESCE(SUM(perdida_por_inflacion), 0) as total_perdida_inflacion
        FROM fct_ventas_inflacion
        {where_str}
        """
        results = execute_query(db, query, params)
        return results[0] if results else {
            "total_ventas": 0,
            "total_margen_nominal": 0,
            "total_margen_real": 0,
            "total_perdida_inflacion": 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/trends")
def get_dashboard_trends(region: str = None, category: str = None, db: Session = Depends(get_db)):
    try:
        where_clauses = []
        params = {}
        if region and region != "Todas":
            where_clauses.append("region = :region")
            params["region"] = region
        if category and category != "Todas":
            where_clauses.append("categoria = :category")
            params["category"] = category
            
        where_str = ""
        if where_clauses:
            where_str = " WHERE " + " AND ".join(where_clauses)
            
        query = f"""
        SELECT 
            mes_venta,
            COALESCE(SUM(margen_nominal), 0) as margen_nominal,
            COALESCE(SUM(margen_real), 0) as margen_real
        FROM fct_ventas_inflacion
        {where_str}
        GROUP BY mes_venta
        ORDER BY mes_venta ASC
        """
        return execute_query(db, query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/regions")
def get_regional_performance(category: str = None, db: Session = Depends(get_db)):
    try:
        where_clauses = []
        params = {}
        if category and category != "Todas":
            where_clauses.append("categoria = :category")
            params["category"] = category
            
        where_str = ""
        if where_clauses:
            where_str = " WHERE " + " AND ".join(where_clauses)
            
        query = f"""
        SELECT 
            region,
            COALESCE(SUM(venta_total_nominal), 0) as ventas,
            COALESCE(SUM(margen_real), 0) as margen_real
        FROM fct_ventas_inflacion
        {where_str}
        GROUP BY region
        ORDER BY ventas DESC
        """
        return execute_query(db, query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/salespeople")
def get_sales_performance(region: str = None, category: str = None, db: Session = Depends(get_db)):
    try:
        where_clauses = []
        params = {}
        if region and region != "Todas":
            where_clauses.append("region = :region")
            params["region"] = region
        if category and category != "Todas":
            where_clauses.append("categoria = :category")
            params["category"] = category
            
        where_str = ""
        if where_clauses:
            where_str = " WHERE " + " AND ".join(where_clauses)
            
        query = f"""
        SELECT 
            vendedor_nombre,
            COALESCE(SUM(venta_total_nominal), 0) as ventas,
            COALESCE(SUM(margen_real), 0) as margen_real
        FROM fct_ventas_inflacion
        {where_str}
        GROUP BY vendedor_nombre
        ORDER BY margen_real DESC
        LIMIT 10
        """
        return execute_query(db, query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/categories")
def get_category_performance(region: str = None, db: Session = Depends(get_db)):
    try:
        where_clauses = []
        params = {}
        if region and region != "Todas":
            where_clauses.append("region = :region")
            params["region"] = region
            
        where_str = ""
        if where_clauses:
            where_str = " WHERE " + " AND ".join(where_clauses)
            
        query = f"""
        SELECT 
            CASE 
                WHEN categoria LIKE 'Neum%' THEN 'Neumáticos'
                ELSE categoria 
            END as categoria,
            COALESCE(SUM(venta_total_nominal), 0) as ventas,
            COALESCE(SUM(margen_nominal), 0) as margen_nominal,
            COALESCE(SUM(margen_real), 0) as margen_real
        FROM fct_ventas_inflacion
        {where_str}
        GROUP BY 1
        ORDER BY ventas DESC
        """
        return execute_query(db, query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINTS DE SESIONES DE CHAT ---

@app.post("/api/chat/sessions")
def create_session(session_data: SessionCreate, db: Session = Depends(get_db)):
    sess_id = session_data.id or str(uuid.uuid4())
    existing = db.query(ChatSession).filter(ChatSession.id == sess_id).first()
    if existing:
        return existing
    
    new_session = ChatSession(id=sess_id, title=session_data.title)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@app.get("/api/chat/sessions")
def list_sessions(db: Session = Depends(get_db)):
    return db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()

@app.get("/api/chat/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    
    formatted_messages = []
    for msg in messages:
        results = []
        if msg.results_json:
            try:
                results = json.loads(msg.results_json)
            except:
                pass
        formatted_messages.append({
            "role": msg.role,
            "content": msg.content,
            "sql": msg.sql_query,
            "data": results
        })
    return formatted_messages

@app.delete("/api/chat/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    db.delete(session)
    db.commit()
    return {"message": "Sesión eliminada correctamente"}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), db_readonly: Session = Depends(get_readonly_db)):
    try:
        chat_history_str = "No hay conversación previa."
        
        # 1. Cargar el historial (ventana deslizante de los últimos 6 mensajes = 3 turnos)
        if request.session_id:
            history_messages = db.query(ChatMessage)\
                .filter(ChatMessage.session_id == request.session_id)\
                .order_by(ChatMessage.created_at.desc())\
                .limit(6)\
                .all()
            history_messages.reverse()
            
            if history_messages:
                formatted = []
                for msg in history_messages:
                    role_label = "Usuario" if msg.role == "user" else "Agente"
                    if msg.role == "assistant" and msg.sql_query:
                        formatted.append(f"{role_label}: {msg.content}\nConsulta SQL generada: {msg.sql_query}")
                    else:
                        formatted.append(f"{role_label}: {msg.content}")
                chat_history_str = "\n\n".join(formatted)

        # 2. Generar SQL usando el historial
        sql_query = await generate_sql(request.message, chat_history_str)
        
        # Si la respuesta es conversacional o una denegación (no empieza con SELECT o WITH tras limpiar comentarios)
        import re
        clean_query = re.sub(r"--.*", "", sql_query)
        clean_query = re.sub(r"/\*.*?\*/", "", clean_query, flags=re.DOTALL)
        clean_query = clean_query.strip()
        
        results = []
        status = "success"
        message_content = ""
        
        if not re.match(r"^(SELECT|WITH)\b", clean_query, re.IGNORECASE):
            status = "refusal"
            message_content = sql_query
            sql_query = ""
        else:
            # Ejecutar SQL usando la conexión de sólo lectura
            try:
                results = execute_query(db_readonly, sql_query)
                message_content = f"Aquí tienes los resultados para: \"{request.message}\"."
            except Exception as query_error:
                status = "error"
                message_content = f"Error al ejecutar la consulta SQL: {str(query_error)}"
                sql_query = ""
                
        # 3. Guardar en Base de Datos si hay session_id
        if request.session_id:
            # Si la sesión no existe, la creamos
            session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
            if not session:
                title = request.message[:30] + "..." if len(request.message) > 30 else request.message
                session = ChatSession(id=request.session_id, title=title)
                db.add(session)
                db.commit()
            elif session.title == "Nueva Consulta":
                session.title = request.message[:30] + "..." if len(request.message) > 30 else request.message
                db.add(session)
                db.commit()
                
            # Guardar mensaje de usuario
            user_msg = ChatMessage(
                session_id=request.session_id,
                role="user",
                content=request.message
            )
            db.add(user_msg)
            
            # Guardar mensaje del agente (máximo 20 filas de resultados para optimizar almacenamiento)
            results_to_save = results[:20] if results else []
            assistant_msg = ChatMessage(
                session_id=request.session_id,
                role="assistant",
                content=message_content,
                sql_query=sql_query if status == "success" else None,
                results_json=json.dumps(results_to_save) if results_to_save else None
            )
            db.add(assistant_msg)
            db.commit()

        if status == "refusal":
            return {
                "query": "",
                "results": [],
                "message": message_content,
                "status": "refusal"
            }
        elif status == "error":
            return {
                "query": "",
                "results": [],
                "message": message_content,
                "status": "error"
            }
        else:
            return {
                "query": sql_query,
                "results": results,
                "status": "success"
            }
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el agente: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

