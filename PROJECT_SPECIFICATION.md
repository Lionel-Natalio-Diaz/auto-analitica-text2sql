# Especificación del Proyecto: Plataforma Analítica y Agente Text-to-SQL

## 1. Visión General y Caso de Uso (El Problema)
Este proyecto simula el entorno de una empresa minorista del sector automotriz (venta de neumáticos y repuestos) operando en un contexto de alta volatilidad inflacionaria. 

El problema central radica en la distorsión del margen de ganancia nominal frente al real. El objetivo es construir un modelo de datos que calcule el margen de rentabilidad descontando el efecto inflacionario mensual (costo histórico de adquisición vs. costo de reposición).

Adicionalmente, se integrará un Agente Text-to-SQL interactivo. Este permitirá a la gerencia realizar consultas en lenguaje natural sobre las ventas y métricas clave, eliminando cuellos de botella en la generación de reportes ad-hoc. Esta experiencia será presentada en una interfaz web completamente personalizada y estéticamente superior.

## 2. Stack Tecnológico Analítico y Full-Stack
| Capa | Tecnología | Propósito |
|---|---|---|
| **Base de Datos** | PostgreSQL (Local) o SQLite | Almacenamiento del Data Warehouse (crudo y modelado). |
| **Transformación** | dbt (Data Build Tool) Core + SQL | Limpieza, tests de calidad y creación del modelo dimensional (Data Marts). |
| **Visualización** | Power BI o Looker Studio | Dashboard analítico principal (Fuente de la Verdad). |
| **Backend & Agente IA** | Python, FastAPI, LangChain, Gemini API | API REST que actúa como "cerebro" del Text-to-SQL y ejecuta las consultas. |
| **Frontend Web** | Vite (Vanilla JS o React) + Custom CSS | Interfaz de usuario dinámica, responsive y de alto impacto visual (separada del backend). |

## 3. Requisitos y Funcionalidades Clave

### A. Data Engineering & Modelado (dbt)
- **Generación de Datos:** Script automatizado en Python para generar un dataset transaccional (ventas, productos, clientes, costos históricos, IPC mensual) de al menos 2 años, simulando un contexto inflacionario.
- **Capa Staging:** Limpieza, estandarización de nombres de columnas y tipos de datos.
- **Capa Core (Marts):** Cruce de las ventas con el IPC, permitiendo el cálculo dinámico de la métrica `margen_real`.
- **Calidad de Datos:** Implementación de tests en dbt (`not null`, `unique`, relaciones foráneas) para asegurar la integridad de la información.

### B. Visualización de Impacto (BI)
- Dashboard gerencial que contrasta visualmente el "Margen Bruto Nominal" vs. el "Margen Real Ajustado".
- Filtros dinámicos por dimensiones de tiempo, sucursales y categorías de producto.

### C. Agente de IA y Backend (FastAPI Text-to-SQL)
- Traducción precisa de preguntas de negocio en lenguaje natural a consultas SQL estructuradas y ejecutables.
- **Seguridad del Prompt y de la Base de Datos (Crucial):**
  - **Permisos Restringidos (Read-Only):** El agente se conectará a la base de datos usando un rol exclusivo de *solo lectura* (SELECT) restringido al Data Mart final.
  - **Sanitización y Anti-Inyección SQL:** Bloqueo explícito a nivel lógico de cualquier instrucción DML o DDL (`INSERT`, `UPDATE`, `DELETE`, `DROP`).
  - **Defensa contra Prompt Injection:** El LLM tendrá instrucciones robustas ("System Prompts") que rechazarán preguntas ajenas al negocio, previniendo fugas de contexto o manipulación del rol.
- **Contexto Optimizado:** Inyección de un diccionario de datos (metadata de tablas y columnas) para maximizar la precisión de los queries generados.

### D. Interfaz Web (Frontend de Alto Impacto)
- Reemplazo de soluciones estándar (como Streamlit) por una web customizada y orientada a la excelencia visual.
- Uso de prácticas modernas de diseño UI/UX: paletas de colores armoniosas, *glassmorphism*, modo oscuro elegante, tipografías modernas y micro-animaciones fluidas.
- Visualización enriquecida: Interfaz de chat que, al recibir una respuesta, muestra tanto el insight de negocio, como la consulta SQL subyacente y la tabla de datos resultante de manera estilizada.

## 4. Jerarquía y Organización del Repositorio (Estándar Profesional)
Para destacar en GitHub y demostrar buenas prácticas de Ingeniería de Software, la estructura del proyecto seguirá un formato desacoplado (separación de responsabilidades):

```text
portfolio-analitica-text2sql/
├── .github/                   # Workflows para CI/CD (Github Actions - Opcional)
├── backend/                   # API backend (FastAPI) para el agente IA
│   ├── app/                   # Lógica central, endpoints, agentes de LangChain
│   ├── tests/                 # Tests unitarios del Agente y la API
│   └── requirements.txt       # Dependencias exclusivas de Python para backend
├── frontend/                  # Interfaz web premium (Vite)
│   ├── public/                # Assets estáticos (imágenes, iconos)
│   ├── src/                   # Código fuente (HTML, JS, CSS)
│   └── package.json           # Dependencias web
├── data_pipeline/             # Pipeline de ingesta y mock de datos
│   └── mock_data_generator.py # Script de generación transaccional e IPC
├── dbt_analytics/             # Proyecto de modelado y transformación (dbt)
│   ├── models/                # Modelos staging, intermediate y marts
│   ├── tests/                 # Archivos de validación de datos
│   └── dbt_project.yml        # Configuración raíz de dbt
├── bi_dashboard/              # Archivos de reporte (ej. archivos .pbix, capturas, PDFs)
├── .env.example               # Template de las variables de entorno necesarias
├── .gitignore                 # Exclusión sistemática de archivos temporales y keys
└── README.md                  # Presentación principal, diagrama de arquitectura y setup
```

## 5. Criterios de Éxito del Proyecto
1. **Analítica de Valor:** El modelo en `dbt` genera Data Marts limpios y el dashboard refleja claramente el problema financiero de la inflación en los márgenes.
2. **Text-to-SQL Funcional:** La API FastAPI puede procesar lenguaje natural, generar SQL válido y extraer los datos correctamente.
3. **Entorno Seguro:** El sistema es invulnerable a intentos de inyección SQL y el LLM se niega cordialmente a responder cosas fuera de su dominio.
4. **Diseño Premium (WOW Factor):** El frontend es rápido, visualmente impactante y completamente interactivo, demostrando capacidades que van mucho más allá de un analista promedio.
5. **Calidad de Repositorio:** El código está ordenado, comentado, modular y documentado con un `README.md` que incluye GIFs y pasos claros para levantar la infraestructura localmente.
