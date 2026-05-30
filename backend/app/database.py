from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, Text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Configurar motor de sólo lectura agregando mode=ro al URL de SQLite
readonly_url = DATABASE_URL + ("&" if "?" in DATABASE_URL else "?") + "mode=ro"
readonly_engine = create_engine(
    readonly_url, connect_args={"check_same_thread": False}
)

# Habilitar soporte para llaves foráneas en SQLite (necesario para CASCADE deletes)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# Listener para el motor de sólo lectura
@event.listens_for(readonly_engine, "connect")
def set_sqlite_pragma_readonly(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionLocalReadonly = sessionmaker(autocommit=False, autoflush=False, bind=readonly_engine)

Base = declarative_base()

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    sql_query = Column(Text, nullable=True)
    results_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_readonly_db():
    db = SessionLocalReadonly()
    try:
        yield db
    finally:
        db.close()

