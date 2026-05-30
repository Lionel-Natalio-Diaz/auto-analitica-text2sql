# Guía de Estudio: Proyecto AutoAnalítica Pro

¡Es completamente normal sentirse un poco abrumado! Hemos construido un proyecto de nivel **Senior/Data Engineer**, integrando muchas tecnologías modernas de golpe. 

Este documento está diseñado para que entiendas **qué** hicimos, **por qué** lo hicimos y **cómo** funciona cada pieza, para que puedas defender este proyecto en cualquier entrevista.

---

## 1. El Problema de Negocio (¿Qué resuelve este proyecto?)
Imagina una empresa que vende repuestos de autos en Argentina (o cualquier país con inflación).
*   Compran un repuesto hoy a $1.000.
*   Pasan 3 meses y lo venden a $1.500.
*   **Aparentemente**, ganaron $500 (Margen Nominal).
*   **La realidad:** Debido a la inflación, reponer ese mismo repuesto hoy cuesta $1.800. Si lo venden a $1.500, en realidad están perdiendo plata porque no pueden volver a comprar el mismo producto para seguir vendiendo.

**El objetivo del proyecto** es construir un sistema que no se deje engañar por el "Margen Nominal" y calcule el "Costo de Reposición Real" cruzando datos de ventas con datos de inflación y compras recientes.

---

## 2. Conceptos Clave (El Lenguaje Técnico)

### ¿Qué es dbt (data build tool)?
En el mundo de los datos existe el concepto **ETL** (Extraer, Transformar, Cargar) o **ELT** (Extraer, Cargar, Transformar).
**dbt** se encarga exclusivamente de la **T (Transformación)**.

**Analogía:**
Imagina que la base de datos es una cocina. 
*   Los ingredientes crudos (tomates, cebollas) son tus datos originales.
*   **dbt** es el libro de recetas y el chef robot. Tú le escribes consultas SQL (recetas) y dbt se encarga de picar los ingredientes, cocinarlos y presentarlos en un plato final perfecto, de forma ordenada y repetible.

dbt nos permite escribir código SQL modular, hacer tests de calidad de datos y documentar todo el proceso automáticamente. En este proyecto, usamos dbt para tomar los datos "sucios" y generar la tabla final `fct_ventas_inflacion`.

### La Arquitectura Medallion (El flujo de los datos)
Para mantener el orden, no mezclamos los ingredientes crudos con la comida terminada. Usamos capas lógicas (por eso viste 15 tablas en la vista de Linaje de Datos):

1.  🥉 **Capa Raw (Bronce):** Los datos tal como caen del sistema. Tienen errores, nombres de columnas feos, etc. (Ej: `raw_ventas`).
2.  🥈 **Capa Staging (Plata):** Usamos dbt para tomar los datos Raw, limpiar espacios, asegurar que las fechas sean fechas, y estandarizar nombres. Aquí creamos "vistas" de los datos limpios. (Ej: `stg_ventas`).
3.  🥇 **Capa Mart o Fact (Oro):** Es el plato final. Cruzamos todas las tablas limpias (Silver) para calcular las métricas de negocio complejas (como la inflación y el margen real). (Ej: `fct_ventas_inflacion`).

### El Esquema Estrella (Star Schema)
Es una forma de organizar las tablas en la base de datos para que las consultas sean rapidísimas.
*   **Tabla de Hechos (El Centro de la Estrella):** Nuestra tabla `fct_ventas_inflacion`. Contiene números, métricas y los IDs de lo que pasó (ID_venta, ID_vendedor, total_venta).
*   **Tablas de Dimensiones (Las Puntas):** Las tablas Staging (`stg_vendedores`, `stg_sucursales`, `stg_productos`). Contienen el "contexto" descriptivo (el nombre del vendedor, la ciudad de la sucursal).

---

## 3. El Stack Tecnológico (Las herramientas)

1.  **Python (`mock_data_generator.py`):** Lo usamos para simular un sistema real y generar datos falsos (pero coherentes) y guardarlos en una base de datos SQLite.
2.  **SQLite:** Nuestra base de datos ligera. Es el disco duro temporal del proyecto.
3.  **dbt Core:** La herramienta de transformación de datos (ejecuta el código SQL para pasar de Bronze a Gold).
4.  **FastAPI (Python):** El "Backend" o servidor. Es el puente de comunicación. Se conecta a la base de datos SQLite, ejecuta consultas SQL y le envía los resultados al Frontend a través de una API (URLs específicas).
5.  **React + Vite:** El "Frontend". Es la interfaz gráfica que ves en el navegador web. Lee los datos que le envía FastAPI y los dibuja bonito.
6.  **Recharts & Mermaid.js:** Librerías dentro de React. Recharts dibuja los gráficos de barras/líneas, y Mermaid dibuja el diagrama de arquitectura relacional que armamos.
7.  **OpenAI (GPT-4o):** El cerebro detrás de la pestaña "IA Analyst". Convierte lo que escribes ("¿quién vendió más?") en código SQL, FastAPI lo ejecuta en SQLite, y devuelve la respuesta a React.

---

## 4. Paso a Paso del Desarrollo (Cómo llegamos aquí)

### Paso 1: Generación de Datos (Data Engineering - Ingesta)
Empezamos creando un script de Python que simula meses de ventas, compras de inventario e índices de inflación. Este script crea las tablas "Raw" (crudas) en nuestra base de datos SQLite simulando datos históricos empresariales.

### Paso 2: Modelado Analítico (Data Engineering - Transformación)
Configuramos **dbt**. Creamos archivos `.sql` en la carpeta `staging` para limpiar los datos (Capa Plata). Luego, creamos un archivo mucho más complejo llamado `fct_ventas_inflacion.sql` (Capa Oro) que hace los `JOIN` (uniones cruzadas) matemáticos para calcular el verdadero impacto de la inflación cruzando costos de reposición históricos.

### Paso 3: Construcción de la API (Backend)
Escribimos código en `FastAPI` (dentro de `backend/app/main.py`). Creamos "endpoints" (como `/api/dashboard/stats`). Cuando la web pide datos para un gráfico, FastAPI va a la base de datos, extrae la información de la tabla final (`fct_ventas_inflacion`) y la devuelve empaquetada.

### Paso 4: Inteligencia Artificial (El Agente IA)
Añadimos un script (`agent.py`). Le dimos un "System Prompt" (instrucciones maestras) a ChatGPT explicándole exactamente cómo se llaman nuestras tablas de dbt y qué significan. Así, cuando un usuario hace una pregunta, la IA actúa como un analista traduciendo lenguaje humano al código SQL correcto.

### Paso 5: Construcción de la Web (Frontend)
Levantamos un proyecto en **React**. Creamos un Dashboard moderno con un diseño "Glassmorphism" (ese efecto translúcido y oscuro premium). 
Conectamos este Frontend con el Backend para que los gráficos (Recharts) se alimenten de los datos procesados por dbt. Finalmente, añadimos componentes técnicos de documentación, como el renderizador de diagramas de Mermaid para que cualquier reclutador técnico vea que sabes modelar datos.

---

## Resumen Final (Para una Entrevista)

Si en una entrevista te piden que describas el proyecto, aquí tienes un resumen profesional:

> "Desarrollé una plataforma analítica end-to-end para medir la erosión de márgenes en contextos inflacionarios. 
> 
> En la etapa de **Ingeniería de Datos**, generé un pipeline utilizando **dbt** siguiendo la **arquitectura Medallion**, transformando datos transaccionales crudos en un **Esquema Estrella** optimizado. La lógica central cruza ventas con costos de reposición históricos para hallar el margen real.
> 
> Para disponibilizar la información, construí una API RESTful con **FastAPI** que alimenta un Dashboard interactivo en **React**. Además, integré un Agente de IA capaz de ejecutar consultas **Text-to-SQL** directamente sobre el Data Warehouse, permitiendo un análisis de autoservicio para usuarios de negocio."
