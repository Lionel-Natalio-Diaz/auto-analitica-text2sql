import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Table, 
  MessageSquare, 
  Info, 
  Database,
  TrendingUp, 
  AlertCircle,
  ChevronRight,
  Send,
  PieChart as PieChartIcon,
  Users,
  MapPin,
  Filter,
  ArrowRight,
  Percent,
  Trash2,
  Plus
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import mermaid from 'mermaid';

// Configuración de Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f1f5f9',
    lineColor: '#60a5fa',
    secondaryColor: '#1e293b'
  }
});

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

const Mermaid = ({ chart }) => {
  const ref = useRef(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    if (chart) {
      const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.render(uniqueId, chart).then(({ svg }) => {
        setSvg(svg);
      }).catch(err => console.error("Mermaid Render Error:", err));
    }
  }, [chart]);

  return (
    <div 
      className="mermaid-chart" 
      dangerouslySetInnerHTML={{ __html: svg }} 
      style={{ width: '100%', height: 'auto' }}
    />
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lineageTab, setLineageTab] = useState('dbt');
  const [filterRegion, setFilterRegion] = useState('Todas');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [copiedQueryId, setCopiedQueryId] = useState(null);

  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [regions, setRegions] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [selectedTable, setSelectedTable] = useState('fct_ventas_inflacion');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu analista de IA. Puedo consultar la base de datos relacional para ti. Prueba con: "¿Qué sucursal tuvo más ventas?"' }
  ]);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const tables = [
    { id: 'fct_ventas_inflacion', name: 'Fact: Ventas e Inflación', type: 'mart' },
    { id: 'stg_ventas', name: 'Staging: Ventas', type: 'staging' },
    { id: 'stg_productos', name: 'Staging: Productos', type: 'staging' },
    { id: 'stg_sucursales', name: 'Staging: Sucursales', type: 'staging' },
    { id: 'stg_vendedores', name: 'Staging: Vendedores', type: 'staging' },
    { id: 'stg_compras', name: 'Staging: Compras (Inventario)', type: 'staging' },
    { id: 'stg_ipc', name: 'Staging: IPC (Inflación)', type: 'staging' },
    { id: 'raw_ventas', name: 'Raw: Ventas', type: 'raw' },
    { id: 'raw_productos', name: 'Raw: Productos', type: 'raw' },
    { id: 'raw_compras', name: 'Raw: Compras', type: 'raw' },
    { id: 'raw_sucursales', name: 'Raw: Sucursales', type: 'raw' },
    { id: 'raw_vendedores', name: 'Raw: Vendedores', type: 'raw' }
  ];

  // Fetch functions with filters
  const fetchStats = (region = filterRegion, category = filterCategory) => {
    fetch(`${API_BASE}/dashboard/stats?region=${region}&category=${category}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
        console.error("Error fetching stats:", err);
        setStats(null);
      });
  };

  const fetchTrends = (region = filterRegion, category = filterCategory) => {
    fetch(`${API_BASE}/dashboard/trends?region=${region}&category=${category}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTrends(data);
        } else {
          setTrends([]);
        }
      })
      .catch(err => {
        console.error("Error fetching trends:", err);
        setTrends([]);
      });
  };

  const fetchRegions = (category = filterCategory) => {
    fetch(`${API_BASE}/dashboard/regions?category=${category}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setRegions(data);
        } else {
          setRegions([]);
        }
      })
      .catch(err => {
        console.error("Error fetching regions:", err);
        setRegions([]);
      });
  };

  const fetchSalespeople = (region = filterRegion, category = filterCategory) => {
    fetch(`${API_BASE}/dashboard/salespeople?region=${region}&category=${category}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const margins = data.map(d => d.margen_real);
          const minVal = Math.min(...margins);
          const maxVal = Math.max(...margins);
          const range = maxVal - minVal || 1;
          const transformed = data.map(d => ({
            ...d,
            barValue: 30000 + ((d.margen_real - minVal) / range) * 120000
          }));
          setSalespeople(transformed);
        } else {
          setSalespeople([]);
        }
      })
      .catch(err => {
        console.error("Error fetching salespeople:", err);
        setSalespeople([]);
      });
  };

  const fetchCategories = (region = filterRegion) => {
    fetch(`${API_BASE}/dashboard/categories?region=${region}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
        }
      })
      .catch(err => {
        console.error("Error fetching categories:", err);
        setCategories([]);
      });
  };

  const fetchPreview = (table) => {
    fetch(`${API_BASE}/preview/${table}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPreviewData(data);
        } else {
          setPreviewData([]);
        }
      })
      .catch(err => {
        console.error("Error fetching preview:", err);
        setPreviewData([]);
      });
  };

  const fetchSessions = () => {
    fetch(`${API_BASE}/chat/sessions`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setChatSessions(data);
          if (data.length > 0 && !currentSessionId) {
            setCurrentSessionId(data[0].id);
          }
        } else {
          console.error("fetchSessions: Expected an array, got:", data);
          setChatSessions([]);
        }
      })
      .catch(err => {
        console.error("Error fetching sessions:", err);
        setChatSessions([]);
      });
  };

  const handleCreateSession = async () => {
    const newId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      const res = await fetch(`${API_BASE}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, title: "Nueva Consulta" })
      });
      const newSession = await res.json();
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setChatMessages([
        { role: 'assistant', content: '¡Hola! Soy tu analista de IA. Puedo consultar la base de datos relacional para ti. Prueba con: "¿Qué sucursal tuvo más ventas?"' }
      ]);
    } catch (err) {
      console.error("Error creating session:", err);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      setChatSessions(prev => {
        const filtered = prev.filter(s => s.id !== sessionId);
        if (currentSessionId === sessionId) {
          if (filtered.length > 0) {
            setCurrentSessionId(filtered[0].id);
          } else {
            setCurrentSessionId(null);
            setChatMessages([
              { role: 'assistant', content: '¡Hola! Soy tu analista de IA. Puedo consultar la base de datos relacional para ti. Prueba con: "¿Qué sucursal tuvo más ventas?"' }
            ]);
          }
        }
        return filtered;
      });
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  // Re-fetch data on filters change
  useEffect(() => {
    fetchStats(filterRegion, filterCategory);
    fetchTrends(filterRegion, filterCategory);
    fetchRegions(filterCategory);
    fetchSalespeople(filterRegion, filterCategory);
    fetchCategories(filterRegion);
  }, [filterRegion, filterCategory]);

  useEffect(() => {
    fetchPreview(selectedTable);
  }, [selectedTable]);

  useEffect(() => {
    if (activeTab === 'chat') {
      fetchSessions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && currentSessionId) {
      setLoading(true);
      fetch(`${API_BASE}/chat/sessions/${currentSessionId}/messages`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            if (data.length === 0) {
              setChatMessages([
                { role: 'assistant', content: '¡Hola! Soy tu analista de IA. Puedo consultar la base de datos relacional para ti. Prueba con: "¿Qué sucursal tuvo más ventas?"' }
              ]);
            } else {
              setChatMessages(data);
            }
          } else {
            console.error("fetchMessages: Expected an array, got:", data);
            setChatMessages([{ role: 'assistant', content: 'Error al cargar el historial del chat: formato inválido.' }]);
          }
        })
        .catch(err => {
          console.error("Error loading session messages:", err);
          setChatMessages([{ role: 'assistant', content: 'Error al cargar el historial del chat.' }]);
        })
        .finally(() => setLoading(false));
    }
  }, [currentSessionId, activeTab]);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Desplazar abajo cuando hay nuevos mensajes o cambia el estado de carga
  useEffect(() => {
    if (activeTab === 'chat') {
      const timer = setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, loading, activeTab]);

  // Desplazar abajo de forma inmediata al cambiar a la pestaña del chat
  useEffect(() => {
    if (activeTab === 'chat') {
      const timer = setTimeout(() => {
        scrollToBottom('auto');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Copy to clipboard helper
  const copyToClipboard = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedQueryId(id);
        setTimeout(() => setCopiedQueryId(null), 2000);
      });
    }
  };

  // SQL highlighting helper
  const highlightSQL = (sql) => {
    if (!sql) return '';
    let escaped = sql
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    const regex = /(--.*)|('(?:''|[^'])*')|("(?:""|[^"])*")|\b(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT|LEFT\s+JOIN|INNER\s+JOIN|JOIN|ON|AND|OR|AS|SUM|AVG|COUNT|MAX|MIN|WITH|COALESCE)\b|\b(\d+(?:\.\d+)?)\b/gi;
    
    let highlighted = escaped.replace(regex, (match, comment, squoteStr, dquoteStr, keyword, number) => {
      if (comment) {
        return `<span class="sql-comment">${comment}</span>`;
      }
      if (squoteStr) {
        return `<span class="sql-string">${squoteStr}</span>`;
      }
      if (dquoteStr) {
        return `<span class="sql-string">${dquoteStr}</span>`;
      }
      if (keyword) {
        return `<span class="sql-keyword">${keyword}</span>`;
      }
      if (number) {
        return `<span class="sql-number">${number}</span>`;
      }
      return match;
    });
    return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // Cell formatting helper
  const formatCellValue = (val, columnName) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      const colLower = columnName.toLowerCase();
      if (
        colLower.includes('venta') ||
        colLower.includes('costo') ||
        colLower.includes('margen') ||
        colLower.includes('perdida') ||
        colLower.includes('precio') ||
        colLower.includes('total') ||
        colLower.includes('monto') ||
        colLower.includes('inflacion')
      ) {
        return formatCurrency(val);
      }
      return val.toLocaleString('es-AR');
    }
    return String(val);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      try {
        const res = await fetch(`${API_BASE}/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sessionId, title: input.substring(0, 30) + (input.length > 30 ? '...' : '') })
        });
        const newSession = await res.json();
        setChatSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
      } catch (err) {
        console.error("Error creating on-the-fly session:", err);
        return;
      }
    }

    const userMsg = { role: 'user', content: input };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, session_id: sessionId })
      });
      const data = await res.json();
      
      const assistantMsg = { 
        role: 'assistant', 
        content: (data.status === 'refusal' || data.status === 'error') ? data.message : `Aquí tienes los resultados para: "${currentInput}".`,
        sql: data.query,
        data: data.results 
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      
      const activeSession = chatSessions.find(s => s.id === sessionId);
      if (!activeSession || activeSession.title === "Nueva Consulta") {
        fetchSessions();
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el agente.' }]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '$0,00';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  const erDiagram = `
    graph LR
      subgraph Layer_Raw ["1. Capa Raw (Bronze)"]
        R1[raw_ventas]
        R2[raw_productos]
        R3[raw_sucursales]
        R4[raw_compras]
        R5[raw_clientes]
        R6[raw_vendedores]
        R7[raw_ipc]
      end

      subgraph Layer_Staging ["2. Capa Staging (Silver)"]
        S1[stg_ventas]
        S2[stg_productos]
        S3[stg_sucursales]
        S4[stg_compras]
        S5[stg_clientes]
        S6[stg_vendedores]
        S7[stg_ipc]
      end

      subgraph Layer_Mart ["3. Capa Mart (Gold)"]
        M1[fct_ventas_inflacion]
      end

      R1 --> S1
      R2 --> S2
      R3 --> S3
      R4 --> S4
      R5 --> S5
      R6 --> S6
      R7 --> S7

      S1 --> M1
      S2 --> M1
      S3 --> M1
      S4 --> M1
      S5 --> M1
      S6 --> M1
      S7 --> M1

      style Layer_Raw fill:#450a0a,stroke:#ef4444
      style Layer_Staging fill:#172554,stroke:#3b82f6
      style Layer_Mart fill:#064e3b,stroke:#10b981
  `;

  const relationalDiagram = `
    erDiagram
      raw_clientes {
          int cliente_id PK
          string nombre
          string ciudad
          string email
      }
      raw_productos {
          int producto_id PK
          string nombre
          string categoria
          float costo_base
      }
      raw_sucursales {
          int sucursal_id PK
          string nombre
          string ciudad
          string region
      }
      raw_vendedores {
          int vendedor_id PK
          string nombre
          int sucursal_id FK
      }
      raw_compras {
          int compra_id PK
          int producto_id FK
          date fecha
          int cantidad
          float costo_unitario_real
      }
      raw_ventas {
          int venta_id PK
          date fecha
          int cliente_id FK
          int vendedor_id FK
          int sucursal_id FK
          int producto_id FK
          int cantidad
          float precio_unitario
      }
      raw_ipc {
          string mes PK
          float indice
          float inflacion_mensual
      }
      
       raw_clientes ||--o{ raw_ventas : "compra"
       raw_sucursales ||--o{ raw_vendedores : "tiene"
       raw_sucursales ||--o{ raw_ventas : "despacha"
       raw_vendedores ||--o{ raw_ventas : "realiza"
       raw_productos ||--o{ raw_ventas : "se vende"
       raw_productos ||--o{ raw_compras : "se compra"
       raw_ipc ||--o{ raw_ventas : "ajusta"
       raw_ipc ||--o{ raw_compras : "afecta"
  `;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <Database className="logo-icon" size={24} />
          <span>AutoAnalítica <span>Pro</span></span>
        </div>
        <nav>
          <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'active' : ''}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('datamodel')} className={activeTab === 'datamodel' ? 'active' : ''}>
            <Database size={20} /> Linaje de Datos
          </button>
          <button onClick={() => setActiveTab('preview')} className={activeTab === 'preview' ? 'active' : ''}>
            <Table size={20} /> Previsualización
          </button>
          <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'active' : ''}>
            <MessageSquare size={20} /> IA Analyst
          </button>
          <button onClick={() => setActiveTab('context')} className={activeTab === 'context' ? 'active' : ''}>
            <Info size={20} /> Contexto
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="content">
        <header className="content-header">
          <h1>{
            activeTab === 'dashboard' ? 'Dashboard de Rendimiento' :
            activeTab === 'datamodel' ? 'Linaje de Datos y Arquitectura' :
            activeTab === 'preview' ? 'Previsualización de Tablas' :
            activeTab === 'chat' ? 'Asistente de IA (Text-to-SQL)' :
            activeTab === 'context' ? 'Contexto y Lógica de Negocio' :
            activeTab
          }</h1>
          <div className="user-profile">
            <div className="status-dot"></div>
            <span>Portfolio Edition - v2.2</span>
          </div>
        </header>

        <section className="tab-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard-view">
              <div className="dashboard-filters">
                <div className="filter-group">
                  <label htmlFor="filter-region"><Filter size={14} style={{ marginRight: '6px' }} /> Región</label>
                  <select 
                    id="filter-region"
                    value={filterRegion} 
                    onChange={(e) => setFilterRegion(e.target.value)}
                  >
                    <option value="Todas">Todas las Regiones</option>
                    <option value="Mendoza">Mendoza</option>
                    <option value="Buenos Aires">Buenos Aires</option>
                    <option value="Córdoba">Córdoba</option>
                    <option value="Tucumán">Tucumán</option>
                    <option value="Santa Fe">Santa Fe</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-category"><Filter size={14} style={{ marginRight: '6px' }} /> Categoría</label>
                  <select 
                    id="filter-category"
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="Todas">Todas las Categorías</option>
                    <option value="Neumáticos">Neumáticos</option>
                    <option value="Repuestos">Repuestos</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
                
                {(filterRegion !== 'Todas' || filterCategory !== 'Todas') && (
                  <button 
                    className="clear-filters-btn"
                    onClick={() => {
                      setFilterRegion('Todas');
                      setFilterCategory('Todas');
                    }}
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>

              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon-box"><TrendingUp /></div>
                  <div className="kpi-info">
                    <span className="label">Ventas Totales</span>
                    <span className="value">{stats ? formatCurrency(stats.total_ventas) : '...'}</span>
                  </div>
                </div>
                <div className="kpi-card danger">
                  <div className="kpi-icon-box"><AlertCircle /></div>
                  <div className="kpi-info">
                    <span className="label">Erosión Inflacionaria</span>
                    <span className="value">{stats ? formatCurrency(stats.total_perdida_inflacion) : '...'}</span>
                  </div>
                </div>
                <div className="kpi-card success">
                  <div className="kpi-icon-box"><PieChartIcon /></div>
                  <div className="kpi-info">
                    <span className="label">Margen Real Neto</span>
                    <span className="value">{stats ? formatCurrency(stats.total_margen_real) : '...'}</span>
                  </div>
                </div>
                <div className={`kpi-card ${stats && (stats.total_margen_real / stats.total_ventas) < 0 ? 'danger' : 'success'}`}>
                  <div className="kpi-icon-box"><Percent /></div>
                  <div className="kpi-info">
                    <span className="label">Eficiencia (Margen Real %)</span>
                    <span className="value">{stats ? ((stats.total_margen_real / stats.total_ventas) * 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '...'}</span>
                  </div>
                </div>
              </div>

              <div className="charts-grid">
                <div className="chart-container wide">
                  <h3>Evolución Mensual: Márgenes Nominal vs Real</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={trends} margin={{ top: 10, right: 10, left: 25, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="mes_venta" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" width={80} tickFormatter={(val) => val.toLocaleString('es-AR')} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px', fontFamily: 'inherit' }}
                          formatter={(val) => formatCurrency(val)}
                          cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="margen_nominal" stroke="#3b82f6" name="Margen Nominal" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="margen_real" stroke="#10b981" name="Margen Real" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-container">
                  <h3>Ventas por Región</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={regions} margin={{ top: 10, right: 10, left: 30, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="region" stroke="#94a3b8" interval={0} fontSize={11} angle={-20} textAnchor="end" height={45} />
                        <YAxis stroke="#94a3b8" width={80} fontSize={11} tickFormatter={(val) => val.toLocaleString('es-AR')} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px', fontFamily: 'inherit' }}
                          itemStyle={{ color: '#60a5fa' }}
                          formatter={(val) => formatCurrency(val)}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-container">
                  <h3>Margen Nominal vs Real por Categoría</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={categories} margin={{ top: 10, right: 10, left: 30, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="categoria" stroke="#94a3b8" interval={0} fontSize={11} angle={-20} textAnchor="end" height={45} />
                        <YAxis stroke="#94a3b8" width={80} fontSize={11} tickFormatter={(val) => val.toLocaleString('es-AR')} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px', fontFamily: 'inherit' }}
                          formatter={(val) => formatCurrency(val)}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Legend />
                        <Bar dataKey="margen_nominal" name="Margen Nominal" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="margen_real" name="Margen Real" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-container wide">
                  <h3>Ranking Vendedores (Margen Real)</h3>
                  <div style={{ width: '100%', height: 380 }}>
                    <ResponsiveContainer>
                      <BarChart data={salespeople} layout="vertical" margin={{ left: 150, right: 20, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" hide />
                        <YAxis dataKey="vendedor_nombre" type="category" stroke="#94a3b8" width={140} fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px', fontFamily: 'inherit' }}
                          itemStyle={{ color: '#10b981' }}
                          formatter={(value, name, props) => [formatCurrency(props.payload.margen_real), "Margen Real"]}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Bar dataKey="barValue" name="Margen Real" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'datamodel' && (
            <div className="datamodel-view">
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{lineageTab === 'dbt' ? 'Arquitectura Medallion y Linaje de Datos (dbt)' : 'Modelo de Datos Entidad-Relación (ERD)'}</h3>
                    <p className="subtitle">
                      {lineageTab === 'dbt' 
                        ? 'Flujo de datos end-to-end a través de las capas de dbt (Bronze, Silver, Gold).' 
                        : 'Relaciones lógicas, llaves primarias/foráneas y cardinalidad en la base de datos origen.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                    <button 
                      onClick={() => setLineageTab('dbt')} 
                      style={{ 
                        background: lineageTab === 'dbt' ? 'var(--primary)' : 'none', 
                        border: 'none', 
                        color: 'white', 
                        padding: '6px 12px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        boxShadow: lineageTab === 'dbt' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none'
                      }}
                    >
                      Linaje dbt
                    </button>
                    <button 
                      onClick={() => setLineageTab('er')} 
                      style={{ 
                        background: lineageTab === 'er' ? 'var(--primary)' : 'none', 
                        border: 'none', 
                        color: 'white', 
                        padding: '6px 12px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        boxShadow: lineageTab === 'er' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none'
                      }}
                    >
                      Modelo ER (Relaciones)
                    </button>
                  </div>
                </div>

                <div className="er-container" style={{ minHeight: lineageTab === 'dbt' ? '300px' : '450px' }}>
                  <Mermaid chart={lineageTab === 'dbt' ? erDiagram : relationalDiagram} />
                </div>
                
                {lineageTab === 'dbt' ? (
                  <div className="schema-notes">
                    <h4>Estructura del Linaje dbt</h4>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                      Para mantener un estándar profesional, el flujo de datos se divide en:
                    </p>
                    <ul>
                      <li><strong>Capa Raw (Bronce):</strong> 7 tablas con datos crudos tal como llegan del generador.</li>
                      <li><strong>Capa Staging (Plata):</strong> 7 tablas donde se limpian tipos de datos, se formatean fechas y se renombran columnas de negocio.</li>
                      <li><strong>Capa Mart (Oro):</strong> 1 tabla consolidada de hechos (`fct_ventas_inflacion`) donde se cruza la información para calcular márgenes nominales y reales ajustados por IPC.</li>
                    </ul>
                  </div>
                ) : (
                  <div className="schema-notes" style={{ borderColor: 'var(--success)', background: 'rgba(16, 185, 129, 0.03)' }}>
                    <h4 style={{ color: 'var(--success)' }}>Detalles del Modelo Relacional</h4>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                      La base de datos original (`data.db`) sigue un diseño estructurado para análisis relacional:
                    </p>
                    <ul>
                      <li><strong>Tablas de Hechos (raw_ventas, raw_compras):</strong> Almacenan las transacciones operativas. Las ventas contienen llaves foráneas a todas las dimensiones de la empresa.</li>
                      <li><strong>Tablas de Dimensiones (raw_clientes, raw_productos, raw_sucursales, raw_vendedores):</strong> Proveen las entidades de negocio. Los vendedores pertenecen a una sucursal específica.</li>
                      <li><strong>Tabla de Control de Inflación (raw_ipc):</strong> Contiene el histórico del índice de inflación mensual, indispensable para estimar el costo de reposición y margen real.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="preview-view">
              <div className="glass-panel">
                <div className="preview-controls" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Filter size={18} className="text-muted" />
                  <select 
                    value={selectedTable} 
                    onChange={(e) => setSelectedTable(e.target.value)}
                  >
                    <optgroup label="Capa de Hechos (Gold)">
                      <option value="fct_ventas_inflacion">Fact: Ventas e Inflación</option>
                    </optgroup>
                    <optgroup label="Capa Staging (Silver)">
                      {tables.filter(t => t.type === 'staging').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                    <optgroup label="Capa Raw (Bronze)">
                      {tables.filter(t => t.type === 'raw').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  </select>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Mostrando registros de <strong>{selectedTable}</strong></span>
                </div>
                <div className="table-container" style={{ maxHeight: 'calc(100vh - 20rem)', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        {previewData.length > 0 && Object.keys(previewData[0]).map(key => <th key={key}>{key}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {Object.entries(row).map(([colName, val], j) => (
                            <td key={j}>
                              {formatCellValue(val, colName)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-view">
              {/* Sidebar de chats anteriores */}
              <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                  <button className="new-chat-btn" onClick={handleCreateSession}>
                    <Plus size={16} /> Nuevo Chat
                  </button>
                </div>
                <div className="sessions-list">
                  {chatSessions.map((session) => (
                    <div 
                      key={session.id} 
                      className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                      onClick={() => setCurrentSessionId(session.id)}
                    >
                      <span className="session-title" title={session.title}>{session.title}</span>
                      <button 
                        className="delete-session-btn"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        title="Eliminar Chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {chatSessions.length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No hay chats anteriores
                    </div>
                  )}
                </div>
              </div>

              {/* Contenedor principal del chat */}
              <div className="chat-main">
                <div className="messages">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                      <div className="avatar">
                        {msg.role === 'user' ? <Users size={18} /> : <Database size={18} />}
                      </div>
                      <div className="message-content">
                        <p>{msg.content}</p>
                        
                        {msg.sql && (
                          <div className="sql-card">
                            <div className="sql-card-header">
                              <div className="sql-card-title">
                                <Database size={14} className="sql-icon" />
                                <span>CONSULTA SQL GENERADA</span>
                              </div>
                              <button 
                                className="copy-btn" 
                                onClick={() => copyToClipboard(msg.sql, `sql-${i}`)}
                                type="button"
                              >
                                {copiedQueryId === `sql-${i}` ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                            <div className="sql-card-body">
                              <pre>{highlightSQL(msg.sql)}</pre>
                            </div>
                          </div>
                        )}
                        
                        {msg.data && msg.data.length > 0 && (
                          <div className="results-card">
                            <div className="results-card-header">
                              <span>RESULTADOS DE LA CONSULTA</span>
                              <span className="results-count">{msg.data.length} filas obtenidas</span>
                            </div>
                            <div className="results-table-container">
                              <table className="results-table">
                                <thead>
                                  <tr>
                                    {Object.keys(msg.data[0] || {}).map(k => (
                                      <th key={k}>{k}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {msg.data.slice(0, 20).map((r, j) => (
                                    <tr key={j}>
                                      {Object.entries(r).map(([colName, val], k) => (
                                        <td key={k}>
                                          {formatCellValue(val, colName)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {msg.data.length > 20 && (
                              <div className="results-card-footer">
                                <span>* Mostrando las primeras 20 filas</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && <div className="loading-spinner">Analizando base de datos relacional...</div>}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-input" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder="Pregunta algo sobre regiones, vendedores o márgenes..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button type="submit"><Send size={18} /></button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="context-view">
              <div className="glass-panel">
                <h2 style={{ background: 'none', webkitTextFillColor: 'initial', color: 'white' }}>Analítica Avanzada en Escenarios Inflacionarios</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  Este proyecto simula un entorno retail automotriz donde la inflación erosiona la rentabilidad. 
                  A diferencia de los dashboards tradicionales que solo muestran ventas nominales, este sistema 
                  utiliza <strong>Ingeniería de Datos</strong> para calcular el costo de reposición en tiempo real.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div className="glass-panel" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                    <h3 style={{ color: 'var(--primary-light)' }}>Stack Técnico</h3>
                    <ul className="schema-notes" style={{ background: 'none', border: 'none', padding: 0 }}>
                      <li><strong>Backend:</strong> FastAPI & SQLAlchemy</li>
                      <li><strong>Data Warehouse:</strong> SQLite + dbt Core</li>
                      <li><strong>Frontend:</strong> React + Recharts + Mermaid</li>
                      <li><strong>AI:</strong> OpenAI GPT-4o (Text-to-SQL)</li>
                    </ul>
                  </div>
                  <div className="glass-panel" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <h3 style={{ color: 'var(--success)' }}>Valor de Negocio</h3>
                    <ul className="schema-notes" style={{ background: 'none', border: 'none', padding: 0 }}>
                      <li>Visibilidad de pérdida real por inflación.</li>
                      <li>Rendimiento de sucursales ajustado por costo.</li>
                      <li>Auditoría de integridad de datos relacionales.</li>
                      <li>Autoservicio de BI mediante lenguaje natural.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
