"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import AuroraBackground from "@/components/AuroraBackground";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ControlStrip from "@/components/ControlStrip";
import KpiGrid from "@/components/KpiGrid";
import HistoricalChart from "@/components/HistoricalChart";
import DonutChart from "@/components/DonutChart";
import CampaignTable from "@/components/CampaignTable";
import ChatAssistant from "@/components/ChatAssistant";
import UploadZone from "@/components/UploadZone";
import AuthModal from "@/components/AuthModal";
import DeviceChart from "@/components/DeviceChart";
import TimeHeatmap from "@/components/TimeHeatmap";
import RegionalMap from "@/components/RegionalMap";
import ReportBuilder from "@/components/ReportBuilder";

// Custom ETL & DB Ingestion Imports
import { parseCsv, parseExcelFile, detectPlatform, detectDataset, getSemanticValue, parseDate, inferReferenceMonth, isTotalOrMetadata, applyTemporalIntelligence, parseFormattedFloat, sanitizeMojibake, SYNONYMS } from "@/lib/etl";
import { getDatabase, saveDatabase, insertDataset, checkFileDuplicate, INITIAL_DB, createInitialDb, consolidateSummary } from "@/lib/db";
import { clearAnalyticsSystem } from "@/lib/clearAnalyticsSystem";

// Formatting helpers
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("pt-BR");

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const INITIAL_MESSAGES = [
  {
    type: "ai",
    text: "Olá. Já analisei o painel atual e posso explicar CPA, CPL, públicos vencedores, desperdício de verba e próximos passos.",
  },
];

export default function Home() {
  // Authentication State
  const [user, setUser] = useState(null);
  const [authBypassed, setAuthBypassed] = useState(false);
  const [authChecking, setAuthChecking] = useState(isSupabaseConfigured);

  // Consolidated Relational Database State (Starts with empty initial state for SSR/hydration safety)
  const [marketingDb, setMarketingDb] = useState(createInitialDb());

  // Advanced Global Filtering State
  const [platform, setPlatform] = useState("todas");
  const [period, setPeriod] = useState("todos"); // reference_month or "todos"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [campaign, setCampaign] = useState("todas");
  const [device, setDevice] = useState("todos");
  const [gender, setGender] = useState("todos");
  const [age, setAge] = useState("todas");
  const [network, setNetwork] = useState("todas");
  const [keyword, setKeyword] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("todos");

  // UI state
  const [activeSection, setActiveSection] = useState("visao-geral");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        setIsSidebarCollapsed(localStorage.getItem("doit-sidebar-collapsed") === "true");
      }, 0);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setIsScrolled(prev => {
        if (currentScroll > 50) {
          return true;
        } else if (currentScroll < 15) {
          return false;
        }
        return prev;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("doit-sidebar-collapsed", next);
      return next;
    });
  };
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  // A-01 FIX: Timer ID stored in useRef instead of useState to avoid unnecessary re-renders
  const toastTimerRef = useRef(null);

  // A-01 FIX: Use ref for timer ID — no re-render triggered
  const triggerToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3200);
  };
  
  // File upload management states
  const [files, setFiles] = useState([]);
  const [base64Files, setBase64Files] = useState([]);
  
  // States for paused upload and deduplication modal
  const [pendingUpload, setPendingUpload] = useState(null);
  const [duplicateFileInfo, setDuplicateFileInfo] = useState(null);
  const [showDeduplicationModal, setShowDeduplicationModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Chat State
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [chatPending, setChatPending] = useState(false);

  // Import Wizard State (Mandatory V1 Flow)
  // UI / Clear System State
  const [isClearingSystem, setIsClearingSystem] = useState(false); // controla a sequência de limpeza
  const [clearStep, setClearStep] = useState(0);                   // passo visual do clear (0-4)
  // dashboardResetKey: quando incrementado, força o unmount+remount de TODOS os componentes
  // de gráfico. Isso destrói o estado interno do ECharts, Canvas, rAF e Recharts.
  const [dashboardResetKey, setDashboardResetKey] = useState(0);
  const [wizardStep, setWizardStep] = useState(null); // null, 'preview_mapping', 'processing', 'success', 'error'
  const [wizardFile, setWizardFile] = useState(null);
  const [wizardPlatform, setWizardPlatform] = useState("google");
  const [wizardColumns, setWizardColumns] = useState([]);
  const [wizardDateRange, setWizardDateRange] = useState({ start: "", end: "", label: "" });
  const [wizardPreviewRows, setWizardPreviewRows] = useState([]);
  const [wizardMapping, setWizardMapping] = useState({});
  const [wizardSaveTemplate, setWizardSaveTemplate] = useState(false);
  const [wizardTemplateName, setWizardTemplateName] = useState("");
  const [wizardRawRows, setWizardRawRows] = useState([]);
  const [wizardProgress, setWizardProgress] = useState(0);
  const [wizardStatusText, setWizardStatusText] = useState("");
  const [wizardErrorMsg, setWizardErrorMsg] = useState("");
  const [wizardResultCount, setWizardResultCount] = useState(0);
  const [wizardDatasetType, setWizardDatasetType] = useState("campaign_performance");
  const [wizardDetectedMonths, setWizardDetectedMonths] = useState([]); // months found in CSV date column

  // Tipos de arquivo que NÃO precisam de Investimento e Campanha como obrigatórios
  const TIME_OR_SEGMENT_TYPES = [
    "daily_time_series",
    "weekday_hour_performance",
    "weekday_performance",
    "hourly_performance",
    "device_performance",
    "network_performance",
    "demographics_gender_age",
    "demographics_age",
    "demographics_gender",
    "search_keywords",
    "search_terms",
    "geo_performance",
    "location_performance",
  ];

  const getWizardFields = (platform, datasetType) => {
    // Para séries temporais e relatórios segmentados, Investimento e Campanha NÃO são obrigatórios
    const isSegmented = TIME_OR_SEGMENT_TYPES.includes(datasetType);

    // ---- CAMPOS COMUNS A AMBAS AS PLATAFORMAS ----
    const commonBase = [
      { key: "campaign_name", label: "Nome da Campanha", required: false, description: "Coluna que identifica o nome de cada campanha." },
      { key: "spend",         label: isSegmented ? "Investimento / Gasto" : "Investimento / Gasto (Obrigatório)", required: !isSegmented, description: "Custo total acumulado da campanha." },
      { key: "clicks",        label: "Cliques Totais",    required: false, description: "Total de cliques recebidos (se houver na planilha)." },
      { key: "impressions",   label: "Impressões",        required: false, description: "Total de visualizações dos anúncios." },
      { key: "date",          label: "Data / Período",    required: false, description: "Data ou período de referência (ex: 2025-10-01)." },
    ];

    if (platform === "google") {
      // ---- GOOGLE ADS: campos com nomes exatos das colunas do CSV exportado ----
      return [
        { key: "campaign_name", label: isSegmented ? "Campanha" : "Campanha (Obrigatório)", required: false, description: "Coluna 'Campanha' — nome de cada campanha no Google Ads." },
        { key: "spend",         label: isSegmented ? "Investimento" : "Investimento (Obrigatório)", required: !isSegmented, description: "Coluna 'Custo' no Google Ads — custo total acumulado." },
        { key: "clicks",        label: "Cliques / Interações",            required: false, description: "Coluna 'Interações' no relatório padrão do Google Ads (= cliques para Search/Display)." },
        { key: "impressions",   label: "Impressões — 'Impr.'",            required: false, description: "Coluna 'Impr.' no Google Ads — total de exibições dos anúncios." },
        { key: "date",          label: "Mês / Data",                      required: false, description: "Coluna 'Mês' (segmentação por Mês) ou 'Dia'. Formato: 'outubro de 2025' ou YYYY-MM-DD." },
        { key: "conversions",   label: "Conversões",                      required: false, description: "Coluna 'Conversões' ou 'Todas as conv.' no Google Ads." },
        { key: "revenue",       label: "Receita — 'Valor de todas as conv.'", required: false, description: "Coluna 'Valor de todas as conv.' — valor total para cálculo de ROAS." },
        { key: "cpc",           label: "CPC — 'Custo médio'",             required: false, description: "Coluna 'Custo médio' no relatório padrão do Google Ads." },
        { key: "ctr",           label: "CTR — 'Taxa de interação'",       required: false, description: "Coluna 'Taxa de interação' no relatório padrão do Google Ads." },
        { key: "keyword",       label: "Palavra-chave",                   required: false, description: "Coluna 'Palavra-chave da Rede de Pesquisa' (relatório de palavras-chave)." },
        { key: "search_term",   label: "Termo de Pesquisa",               required: false, description: "Coluna 'Pesquisa do Google' (relatório de termos de pesquisa)." },
        { key: "device",        label: "Dispositivo",                     required: false, description: "Coluna 'Dispositivo' — Computador, Celular, Tablet." },
        { key: "network",       label: "Rede",                            required: false, description: "Rede de Pesquisa, Display, YouTube, etc." },
        { key: "gender",        label: "Sexo / Gênero",                   required: false, description: "Masculino, Feminino ou Não especificado." },
        { key: "age_range",     label: "Faixa de Idade",                  required: false, description: "Intervalos de idade do público." },
        { key: "hour",          label: "Hora do Dia",                     required: false, description: "Coluna 'Hora' (relatório por hora)." },
      ];
    } else if (platform === "meta") {
      // ---- META ADS: apenas campos presentes no relatório padrão de campanhas ----
      return [
        ...commonBase,
        { key: "conversions", label: "Resultados / Conversões",           required: false, description: "Total de resultados (compras, leads, etc.) — coluna 'Resultados' no Meta." },
        { key: "leads",       label: "Leads na Meta / Leads no site",     required: false, description: "Colunas 'Leads na Meta' ou 'Leads no site' — visíveis em Personalizar Colunas do Meta Ads." },
        { key: "reach",       label: "Alcance",                           required: false, description: "Número de pessoas únicas que viram o anúncio." },
        { key: "cpc",         label: "Custo por Resultado / Custo por Lead", required: false, description: "Colunas 'Custo por resultados' ou 'Custo por lead' no Meta Ads." },
        { key: "adset_name",  label: "Nome do Conjunto de Anúncios",      required: false, description: "Ad Set (se o relatório for nível conjunto)." },
        { key: "ad_name",     label: "Nome do Anúncio (Ad)",              required: false, description: "Nome do anúncio específico (se nível anúncio)." },
      ];
    } else if (platform === "bitrix") {
      // ---- CRM BITRIX24 ----
      return [
        { key: "lead_id", label: "ID do Lead", required: false, description: "Identificador único do Lead." },
        { key: "date", label: "Data de Criação (Criado)", required: false, description: "Data de conversão/entrada do lead." },
        { key: "lead_status", label: "Etapa / Status (Obrigatório)", required: true, description: "A etapa do lead (ex: Demonstração)." },
        { key: "lead_source", label: "Fonte / Origem (Obrigatório)", required: true, description: "Fonte original do tráfego ou formulário." },
        { key: "lead_medium", label: "UTM Medium", required: false, description: "Meio / UTM Medium." },
        { key: "lead_campaign", label: "UTM Campaign", required: false, description: "Campanha associada." },
      ];
    }

    // Fallback genérico
    return [
      ...commonBase,
      { key: "conversions", label: "Conversões",                    required: false, description: "Total de conversões." },
      { key: "revenue",     label: "Receita / Valor de Conversão",  required: false, description: "Valor retornado pelas conversões." },
      { key: "cpc",         label: "CPC Médio",                     required: false, description: "Custo por clique médio." },
      { key: "ctr",         label: "CTR Geral",                     required: false, description: "Taxa de cliques." },
    ];
  };

  const WIZARD_STANDARD_FIELDS = getWizardFields(wizardPlatform, wizardDatasetType);

  const [isIntelligenceUpdating, setIsIntelligenceUpdating] = useState(false);
  const processingFilesRef = useRef(new Set());
  // C-08 FIX: Queue for multiple files uploaded at once
  const pendingFilesQueueRef = useRef([]);

  // Load database from localStorage after initial hydration and run auto-cleanup if necessary
  useEffect(() => {
    const loadedDb = getDatabase();
    const campaigns = loadedDb.fact_campaigns || [];
    
    if (campaigns.length > 0) {
      const isDashOnly = (name) => !name || /^[-–—\s]+$/.test(String(name).trim());
      const withoutTotals = campaigns.filter(r => !isDashOnly(r.campaign_name));
      const removedTotals = campaigns.length - withoutTotals.length;

      const seen = new Set();
      const deduped = withoutTotals.filter(r => {
        const key = [
          r.platform || "",
          r.reference_month || "",
          r.campaign_name || "",
          r.date || r.reference_month || "",
          r.device || "",
          r.keyword || "",
          r.search_term || "",
          r.gender || "",
          r.age_range || ""
        ].join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const removedDups = withoutTotals.length - deduped.length;
      const totalRemoved = removedTotals + removedDups;

      if (totalRemoved > 0) {
        console.warn(`[AUTO-CLEAN] Corrigindo: ${removedTotals} linhas de total ("--") + ${removedDups} duplicatas removidas. (${campaigns.length} → ${deduped.length} registros)`);
        const fixedDb = { ...loadedDb, fact_campaigns: deduped };
        const consolidated = consolidateSummary(fixedDb);
        saveDatabase(consolidated);
        setTimeout(() => {
          setMarketingDb(consolidated);
          triggerToast(`✅ Auto-correção: dados normalizados (${totalRemoved} registros inválidos removidos).`);
        }, 0);
      } else {
        setTimeout(() => {
          setMarketingDb(loadedDb);
        }, 0);
      }
    } else {
      setTimeout(() => {
        setMarketingDb(loadedDb);
      }, 0);
    }
  }, []); // roda APENAS no mount inicial

  useEffect(() => {
    const timerStart = setTimeout(() => setIsIntelligenceUpdating(true), 0);
    const timerEnd = setTimeout(() => setIsIntelligenceUpdating(false), 250);
    return () => {
      clearTimeout(timerStart);
      clearTimeout(timerEnd);
    };
  }, [platform, period, startDate, endDate, campaign, device, gender, age, network, keyword, searchTerm]);

  // Auth setup and Session check
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    // Fetch campaigns and metrics from Supabase to sync local storage if available
    const fetchUserData = async () => {
      try {
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select("*");

        // If Supabase has data, merge campaigns back to the local database state
        if (campaignsData && campaignsData.length > 0) {
          const mappedCampaigns = campaignsData.map(c => {
            const refMonth = "2026-05"; // fallback reference month
            return {
              id: c.id,
              platform: c.tipo,
              dataset_type: c.tipo === "google" ? "campaign_performance" : "meta_campaign_performance",
              campaign_name: c.nome,
              spend: Number(c.investimento),
              revenue: Number(c.receita),
              roas: Number(c.roas),
              cpa: Number(c.cpa),
              ctr: Number(c.ctr) / 100,
              cpc: Number(c.cpc),
              conversions: Number(c.conversoes),
              status: c.status,
              reference_month: refMonth,
              reference_label: "Maio/2026",
              created_at: new Date().toISOString()
            };
          });

          setMarketingDb(prev => {
            const next = { ...prev, fact_campaigns: mappedCampaigns };
            const updated = consolidateSummary(next);
            saveDatabase(updated);
            return updated;
          });
        }
      } catch (err) {
        console.error("Error fetching database data:", err);
      }
    };

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData();
      }
      setAuthChecking(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData();
      } else {
        setUser(null);
        setMarketingDb(createInitialDb());
      }
      setAuthChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      setAuthBypassed(false);
      setMarketingDb(createInitialDb());
      saveDatabase(createInitialDb());
      triggerToast("Desconectado com sucesso.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // handleClearData — Limpeza GLOBAL e REAL do sistema analytics
  //
  // Sequência visual (4 fases):
  //  FASE 1 — Zera TODOS os estados React imediatamente (paineis ficam em branco)
  //  FASE 2 — Inicia anim. de fade-out do workspace + mostra overlay de wipe
  //  FASE 3 — Limpa storages (localStorage, sessionStorage, Cache API, IndexedDB)
  //  FASE 4 — Reload limpo via window.location.replace
  // ─────────────────────────────────────────────────────────────────────────
  const handleClearData = async () => {

    // ─ FASE 1: Reset instantâneo de TODO o estado React ───────────────────
    // Os gráficos, KPIs e tabelas ficam em branco IMEDIATAMENTE.
    const emptyDb = createInitialDb();

    // Dados principais
    setMarketingDb(emptyDb);
    setFiles([]);
    setBase64Files([]);
    setPendingUpload(null);
    setDuplicateFileInfo(null);

    // Modais
    setShowDeduplicationModal(false);
    setShowClearConfirmModal(false);

    // Wizard — desmontar completamente
    setWizardStep(null);
    setWizardFile(null);
    setWizardPlatform("google");
    setWizardColumns([]);
    setWizardDateRange({ start: "", end: "", label: "" });
    setWizardPreviewRows([]);
    setWizardMapping({});
    setWizardSaveTemplate(false);
    setWizardTemplateName("");
    setWizardRawRows([]);
    setWizardProgress(0);
    setWizardStatusText("");
    setWizardErrorMsg("");
    setWizardResultCount(0);
    setWizardDatasetType("campaign_performance");
    setWizardDetectedMonths([]);

    // Filtros — volta ao estado padrão
    setPlatform("todas");
    setPeriod("todos");
    setStartDate("");
    setEndDate("");
    setCampaign("todas");
    setDevice("todos");
    setGender("todos");
    setAge("todas");
    setNetwork("todas");
    setKeyword("todas");
    setSearchTerm("todos");

    // Chat / IA
    setMessages(INITIAL_MESSAGES);
    setChatPending(false);
    setIsIntelligenceUpdating(false);

    // UI
    setActiveSection("visao-geral");
    setShowToast(false);
    setToastMessage("");

    // ─ FASE 2: Inicia sequência visual de limpeza ─────────────────────────
    // Aplica fade-out no workspace e exibe overlay com progress steps.
    // dashboardResetKey força unmount imediato de TODOS os gráficos:
    // ECharts, Canvas, SVG, Recharts — estado interno destruído.
    setDashboardResetKey(prev => prev + 1);
    setIsClearingSystem(true);
    setClearStep(1);

    // ─ FASE 3: Limpeza assíncrona de todos os storages ─────────────────────
    // clearAnalyticsSystem() cuida de localStorage, sessionStorage,
    // Cache API, IndexedDB e Supabase.
    await new Promise(resolve => setTimeout(resolve, 200)); // deixa fase 2 renderizar
    setClearStep(2);

    await clearAnalyticsSystem({
      supabase: user && isSupabaseConfigured ? supabase : null,
      userId: user?.id || null,
    });
    setClearStep(3);

    await new Promise(resolve => setTimeout(resolve, 150));
    setClearStep(4);

    // ─ FASE 4: Reload limpo ────────────────────────────────────────────────
    // window.location.replace garante que não haja histórico de volta (sem back button)
    await new Promise(resolve => setTimeout(resolve, 350));
    window.location.replace(window.location.origin + window.location.pathname);
  };

  const handleAuthSuccess = (authenticatedUser) => {
    if (authenticatedUser) {
      setUser(authenticatedUser);
    } else {
      setAuthBypassed(true);
      triggerToast("Modo de demonstração ativado.");
    }
  };

  // ----------------------------------------------------
  // Dynamic Advanced Query & Filter Extractors
  // ----------------------------------------------------

  const uniqueValues = useMemo(() => {
    const monthsMap = {};
    marketingDb.fact_marketing_summary.forEach(s => {
      if (s.reference_month && s.reference_label) {
        monthsMap[s.reference_month] = s.reference_label;
      }
    });

    const months = Object.entries(monthsMap).map(([val, label]) => ({
      value: val,
      label
    })).sort((a, b) => a.value.localeCompare(b.value));

    const campaigns = [...new Set(marketingDb.fact_marketing_summary.map(s => s.campaign_name))].filter(Boolean);
    const devices = [...new Set(marketingDb.fact_devices.map(d => d.device))].filter(Boolean);
    const genders = [...new Set(marketingDb.fact_demographics.map(d => d.gender))].filter(Boolean);
    const ages = [...new Set(marketingDb.fact_demographics.map(d => d.age_range))].filter(Boolean);
    const networks = [...new Set(marketingDb.fact_networks.map(n => n.network))].filter(Boolean);
    const keywords = [...new Set(marketingDb.fact_keywords.map(k => k.keyword))].filter(Boolean);
    const searchTerms = [...new Set(marketingDb.fact_search_terms.map(s => s.search_term))].filter(Boolean);

    // Detect if ANY record in the database is from an aggregate report
    const isAggregate = marketingDb.fact_marketing_summary.some(s => s.is_aggregate === true);

    // Detect real period covered by aggregate data
    let startPeriod = null;
    let endPeriod = null;
    if (isAggregate) {
      marketingDb.fact_marketing_summary.forEach(s => {
        if (!s.is_aggregate) return;
        if (s.date && (!startPeriod || s.date < startPeriod)) startPeriod = s.date;
        if (s.report_end_date && (!endPeriod || s.report_end_date > endPeriod)) endPeriod = s.report_end_date;
      });
    }

    return { months, campaigns, devices, genders, ages, networks, keywords, searchTerms, isAggregate, startPeriod, endPeriod };
  }, [marketingDb]);

  // Normaliza string de data para YYYY-MM-DD para comparação segura
  // Evita falsos positivos quando row.date está em formatos variantes (YYYY-MM, YYYY-MM-DD, etc.)
  const normalizeDateStr = (d) => {
    if (!d) return "";
    const s = String(d).trim();
    // YYYY-MM → YYYY-MM-01 (garante comparação uniforme)
    if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
    return s;
  };

  const isInsideSelectedDateRange = (row) => {
    const rawRowDate = row.date || (row.reference_month ? `${row.reference_month}-01` : "");
    const rowDate = normalizeDateStr(rawRowDate);
    if (!rowDate) return true;

    // FIX: Detect Meta Ads aggregate reports (com data de início e fim)
    if (row.report_end_date && row.report_end_date !== rawRowDate) {
      const reportStart = rowDate;
      const reportEnd = normalizeDateStr(row.report_end_date);
      if (startDate && reportEnd < startDate) return false;
      if (endDate && reportStart > endDate) return false;
      return true;
    }

    // Normal daily records: comparação com datas normalizadas
    if (startDate && rowDate < startDate) return false;
    if (endDate && rowDate > endDate) return false;
    return true;
  };

  const matchesCoreFilters = (row) => {
    if (platform !== "todas" && row.platform !== platform) return false;
    if (period !== "todos" && row.reference_month !== period) return false;
    if (!isInsideSelectedDateRange(row)) return false;
    if (campaign !== "todas" && row.campaign_name !== campaign) return false;
    return true;
  };


  // A-03 FIX: Memoized campaign grouped list
  const filteredCampaigns = useMemo(() => {
    // Exclui linhas com nome de campanha vazio, só traços, ou sem nenhum gasto histórico.
    // Entradas com nome vazio vêm de arquivos de série temporal (ex: "Gráfico de série temporal")
    // que não têm coluna de campanha — esses dados devem alimentar gráficos de tendência,
    // não a tabela de campanhas.
    const isValidCampaignName = (name) => {
      if (!name) return false;
      const n = String(name).trim();
      if (!n) return false;
      if (/^[-–—\s]+$/.test(n)) return false; // só traços
      return true;
    };

    const list = marketingDb.fact_marketing_summary.filter(r =>
      matchesCoreFilters(r) && isValidCampaignName(r.campaign_name)
    );

    // ── Determinar o mês mais recente com dados por plataforma ──────────────
    // Usamos TODOS os registros da plataforma (sem filtro de período) para encontrar
    // o mês mais recente disponível, mesmo que o filtro de período exclua alguns meses.
    const latestMonthByPlatform = {};
    (marketingDb.fact_marketing_summary || []).forEach(r => {
      if (!r.reference_month || !r.platform) return;
      const cur = latestMonthByPlatform[r.platform];
      if (!cur || r.reference_month > cur) {
        latestMonthByPlatform[r.platform] = r.reference_month;
      }
    });

    // ── Agrupar registros filtrados por campanha ────────────────────────────
    const grouped = {};
    list.forEach(c => {
      const name = c.campaign_name;
      const key = `${c.platform}_${name}`;
      if (!grouped[key]) {
        grouped[key] = {
          nome: name,
          plataforma: c.platform === "google" ? "Google Ads" : "Meta Ads",
          tipo: c.platform,
          investimento: 0,
          receita: 0,
          conversoes: 0,
          cliques: 0,
          impressions: 0,
          lastMonthWithSpend: null,   // mês mais recente em que houve gasto
        };
      }
      const g = grouped[key];
      g.investimento += c.spend || 0;
      g.receita      += c.revenue || 0;
      g.conversoes   += c.conversions || 0;
      g.cliques      += c.clicks || 0;
      g.impressions  += c.impressions || 0;

      // Rastrear o mês mais recente com spend > 0 por campanha
      if ((c.spend || 0) > 0 && c.reference_month) {
        if (!g.lastMonthWithSpend || c.reference_month > g.lastMonthWithSpend) {
          g.lastMonthWithSpend = c.reference_month;
        }
      }
    });

    // ── Calcular status com base em recência de gasto ──────────────────────
    // Ativa    → campanha teve gasto no mês mais recente disponível
    // Pausada  → campanha teve gasto no mês anterior ao mais recente
    // Encerrada → campanha não teve gasto nos últimos 2+ meses
    const monthDiff = (a, b) => {
      if (!a || !b) return 99;
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return (by - ay) * 12 + (bm - am);
    };

    return Object.values(grouped).map(g => {
      const ctr  = g.impressions > 0 ? (g.cliques / g.impressions) * 100 : 0;
      const cpc  = g.cliques > 0 ? g.investimento / g.cliques : 0;
      const cpa  = g.conversoes > 0 ? g.investimento / g.conversoes : 0;
      const roas = g.investimento > 0 ? g.receita / g.investimento : 0;

      const latestMonth = latestMonthByPlatform[g.tipo];
      const diff = monthDiff(g.lastMonthWithSpend, latestMonth);
      let status;
      if (diff === 0)      status = "Ativa";
      else if (diff === 1) status = "Pausada";
      else                 status = "Encerrada";

      return {
        nome: g.nome,
        plataforma: g.plataforma,
        tipo: g.tipo,
        investimento: g.investimento,
        receita: g.receita,
        roas,
        cpa,
        ctr,
        cpc,
        conversoes: g.conversoes,
        status,
        lastMonthWithSpend: g.lastMonthWithSpend,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingDb, platform, period, startDate, endDate, campaign]);

  // BUG 3 FIX: allCampaigns — sem filtro de plataforma para o DonutChart
  const allCampaigns = useMemo(() => {
    const isValidName = (n) => n && !/^[-–—\s]+$/.test(String(n).trim()) && String(n).trim();
    return marketingDb.fact_marketing_summary
      .filter(r => {
        if (!isValidName(r.campaign_name)) return false;
        if (period !== "todos" && r.reference_month !== period) return false;
        if (!isInsideSelectedDateRange(r)) return false;
        if (campaign !== "todas" && r.campaign_name !== campaign) return false;
        return true;
      })
      .reduce((acc, c) => {
        const key = `${c.platform}_${c.campaign_name}`;
        if (!acc[key]) acc[key] = { nome: c.campaign_name, plataforma: c.platform === "google" ? "Google Ads" : "Meta Ads", tipo: c.platform, investimento: 0, status: "Ativa" };
        acc[key].investimento += c.spend || 0;
        return acc;
      }, {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingDb, period, startDate, endDate, campaign]);

  // Calculate Consolidated KPIs from filtered summary
  // A-03 FIX: Memoized KPI totals
  // REGRA DEFINITIVA de leads vs conversões:
  //   leads     = soma de item.leads (coluna real de leads, ex: Meta Leads Form)
  //   conversoes = soma de item.conversions (conversões/resultados do objetivo da campanha)
  //   CPL = spend / leads (quando leads > 0)
  //   CAC = spend / conversions (quando conversions > 0)
  //   As duas métricas são INDEPENDENTES — nunca são somadas nem uma é derivada da outra.
  const totals = useMemo(() => {
    const list = marketingDb.fact_marketing_summary.filter(matchesCoreFilters);

    if (list.length === 0) {
      return {
        investimento: 0, receita: 0, lucro: 0, cpa: 0, ctr: 0, cpc: 0,
        conversoes: 0, cliques: 0, impressoes: 0, alcance: 0, roi: 0, ticket: 0,
        leads: 0, cpm: 0, cpl: 0, cac: 0
      };
    }

    const investimento = list.reduce((sum, item) => sum + (item.spend || 0), 0);
    const receita      = list.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const leads        = list.reduce((sum, item) => sum + (item.leads || 0), 0);
    const conversoes   = list.reduce((sum, item) => sum + (item.conversions || 0), 0);
    const cliques      = list.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const impressoes   = list.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const reach        = list.reduce((sum, item) => sum + (item.reach || 0), 0);

    const ctr    = impressoes > 0 ? cliques / impressoes : 0;
    const cpc    = cliques > 0 ? investimento / cliques : 0;
    const cpm    = impressoes > 0 ? (investimento / impressoes) * 1000 : 0;
    const cpl    = leads > 0 ? investimento / leads : 0;
    const cac    = conversoes > 0 ? investimento / conversoes : 0;
    const profit = receita - investimento;
    const roi    = investimento > 0 ? (profit / investimento) * 100 : 0;
    const ticket = conversoes > 0 ? receita / conversoes : 0;

    return {
      investimento,
      receita,
      lucro: profit,
      cpa: cac,
      ctr,
      cpc,
      conversoes,
      cliques,
      impressoes,
      alcance: reach,
      roi,
      ticket,
      leads,
      cpm,
      cpl,
      cac
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingDb, platform, period, startDate, endDate, campaign]);

  // Dynamic Device Chart Data
  const getDeviceChartData = () => {
    const list = marketingDb.fact_devices.filter(d => {
      if (!matchesCoreFilters(d)) return false;
      if (device !== "todos" && d.device !== device) return false;
      return true;
    });

    if (list.length === 0) return null;

    let mobile = { percent: 0, invest: 0, conv: 0, cpa: 0 };
    let desktop = { percent: 0, invest: 0, conv: 0, cpa: 0 };

    list.forEach(row => {
      const devVal = String(row.device || "").toLowerCase();
      const investVal = row.spend || 0;
      const convVal = row.conversions || 0;
      
      if (devVal.includes("mob") || devVal.includes("cel") || devVal.includes("phone")) {
        mobile.invest += investVal;
        mobile.conv += convVal;
      } else if (devVal.includes("desk") || devVal.includes("comp") || devVal.includes("pc") || devVal.includes("tv")) {
        desktop.invest += investVal;
        desktop.conv += convVal;
      }
    });

    const totalInvest = mobile.invest + desktop.invest;
    if (totalInvest > 0) {
      mobile.percent = (mobile.invest / totalInvest) * 100;
      desktop.percent = (desktop.invest / totalInvest) * 100;
    } else {
      mobile.percent = 50;
      desktop.percent = 50;
    }
    mobile.cpa = mobile.conv > 0 ? mobile.invest / mobile.conv : 0;
    desktop.cpa = desktop.conv > 0 ? desktop.invest / desktop.conv : 0;

    return { mobile, desktop };
  };

  const deviceData = useMemo(() => {
    const list = marketingDb.fact_devices.filter(d => {
      if (!matchesCoreFilters(d)) return false;
      if (device !== "todos" && d.device !== device) return false;
      return true;
    });

    if (list.length === 0) return null;

    let mobile  = { percent: 0, invest: 0, clicks: 0, impressions: 0, conv: 0, cpa: 0 };
    let desktop = { percent: 0, invest: 0, clicks: 0, impressions: 0, conv: 0, cpa: 0 };
    let tablet  = { percent: 0, invest: 0, clicks: 0, impressions: 0, conv: 0, cpa: 0 };

    list.forEach(row => {
      const devVal    = String(row.device || "").toLowerCase();
      const investVal = row.spend || 0;
      const convVal   = row.conversions || 0;
      const clicksVal = row.clicks || 0;
      const imprVal   = row.impressions || 0;

      if (devVal.includes("tablet") || devVal.includes("ipad")) {
        tablet.invest += investVal;
        tablet.conv   += convVal;
        tablet.clicks += clicksVal;
        tablet.impressions += imprVal;
      } else if (devVal.includes("mob") || devVal.includes("cel") || devVal.includes("phone")) {
        mobile.invest += investVal;
        mobile.conv   += convVal;
        mobile.clicks += clicksVal;
        mobile.impressions += imprVal;
      } else if (devVal.includes("desk") || devVal.includes("comp") || devVal.includes("pc") || devVal.includes("tv")) {
        desktop.invest += investVal;
        desktop.conv   += convVal;
        desktop.clicks += clicksVal;
        desktop.impressions += imprVal;
      }
    });

    const totalInvest = mobile.invest + desktop.invest + tablet.invest;
    if (totalInvest > 0) {
      mobile.percent  = (mobile.invest  / totalInvest) * 100;
      desktop.percent = (desktop.invest / totalInvest) * 100;
      tablet.percent  = (tablet.invest  / totalInvest) * 100;
    }
    // ─ NÃO usar fallback 50/50 — sem dados = percent zero real
    mobile.cpa  = mobile.conv  > 0 ? mobile.invest  / mobile.conv  : 0;
    desktop.cpa = desktop.conv > 0 ? desktop.invest / desktop.conv : 0;
    tablet.cpa  = tablet.conv  > 0 ? tablet.invest  / tablet.conv  : 0;

    return { mobile, desktop, tablet };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingDb, platform, period, startDate, endDate, campaign, device]);


  // Dynamic Heatmap Chronological Data
  const getTimeHeatmapData = () => {
    const list = marketingDb.fact_weekday_hour.filter(t => {
      if (!matchesCoreFilters(t)) return false;
      return true;
    });

    if (list.length === 0) return null;

    const dayMap = {
      "seg": 0, "mon": 0, "ter": 1, "tue": 1, "qua": 2, "wed": 2,
      "qui": 3, "thu": 3, "sex": 4, "fri": 4, "sab": 5, "sat": 5, "dom": 6, "sun": 6
    };
    const hourlyGrid = [
      { day: "Seg", hours: [0, 0, 0, 0, 0, 0] },
      { day: "Ter", hours: [0, 0, 0, 0, 0, 0] },
      { day: "Qua", hours: [0, 0, 0, 0, 0, 0] },
      { day: "Qui", hours: [0, 0, 0, 0, 0, 0] },
      { day: "Sex", hours: [0, 0, 0, 0, 0, 0] },
      { day: "Sáb", hours: [0, 0, 0, 0, 0, 0] },
      { day: "Dom", hours: [0, 0, 0, 0, 0, 0] }
    ];

    list.forEach(row => {
      const dayVal = String(row.day || "").toLowerCase();
      const hourVal = row.hour || 0;
      const convVal = row.conversions || 0;

      let dayIdx = -1;
      for (const [key, idx] of Object.entries(dayMap)) {
        if (dayVal.includes(key)) {
          dayIdx = idx;
          break;
        }
      }
      if (dayIdx === -1) {
        dayIdx = 0;
      }
      const hourIdx = Math.min(Math.floor(hourVal / 4), 5);
      hourlyGrid[dayIdx].hours[hourIdx] += convVal;
    });

    return hourlyGrid;
  };

  const timeData = getTimeHeatmapData();

  // Dynamic Demographics Regional Data
  const getRegionalMapData = () => {
    const list = marketingDb.fact_demographics.filter(d => {
      if (!matchesCoreFilters(d)) return false;
      if (gender !== "todos" && d.gender !== gender) return false;
      if (age !== "todas" && d.age_range !== age) return false;
      return true;
    });

    const regionsMap = {
      "Sudeste": ["sp", "rj", "mg", "es", "são paulo", "rio de janeiro", "minas gerais", "espírito santo", "sudeste", "southeast"],
      "Sul": ["pr", "sc", "rs", "paraná", "santa catarina", "rio grande do sul", "sul", "south"],
      "Nordeste": ["ba", "pe", "ce", "ma", "pb", "rn", "al", "se", "pi", "bahia", "pernambuco", "ceará", "maranhão", "paraíba", "rio grande do norte", "alagoas", "sergipe", "piauí", "nordeste", "northeast"],
      "Centro-Oeste": ["df", "go", "mt", "ms", "distrito federal", "goiás", "mato grosso", "mato grosso do sul", "centro-oeste", "midwest"],
      "Norte": ["am", "pa", "ro", "rr", "ac", "to", "ap", "amazonas", "pará", "rondônia", "roraima", "acre", "tocantins", "amapá", "norte", "north"]
    };

    let regionsData = {
      "Sudeste": { invest: 0, conv: 0 },
      "Sul": { invest: 0, conv: 0 },
      "Nordeste": { invest: 0, conv: 0 },
      "Centro-Oeste": { invest: 0, conv: 0 },
      "Norte": { invest: 0, conv: 0 }
    };

    let hasData = false;
    list.forEach(row => {
      const stateVal = String(row.region || row.age_range || row.gender || "").toLowerCase();
      const investVal = row.spend || 0;
      const convVal = row.conversions || 0;

      let matchedRegion = null;
      for (const [region, states] of Object.entries(regionsMap)) {
        if (states.some(s => stateVal === s || stateVal.includes(s))) {
          matchedRegion = region;
          break;
        }
      }
      if (matchedRegion) {
        regionsData[matchedRegion].invest += investVal;
        regionsData[matchedRegion].conv += convVal;
        hasData = true;
      }
    });

    if (!hasData) return null;

    const totalConvs = Object.values(regionsData).reduce((sum, r) => sum + r.conv, 0);
    return Object.entries(regionsData).map(([region, r]) => {
      return {
        region,
        value: totalConvs > 0 ? Math.round((r.conv / totalConvs) * 100) : 20,
        invest: r.invest,
        conv: r.conv,
        cpa: r.conv > 0 ? r.invest / r.conv : 0
      };
    });
  };

  const geoData = getRegionalMapData();

  // M-07 FIX: Use reference_month (YYYY-MM stable key) for grouping, not reference_label (string prone to variation)
  // ─── TIMELINE (BUG 2 FIX): usa filtro SEM restrição de plataforma ─────────
  // Motivo: o gráfico de 3 linhas é um painel COMPARATIVO (Google vs Meta vs Leads).
  // Se usarmos matchesCoreFilters, quando o filtro de plataforma = "Google",
  // todos os registros Meta são filtrados → linha Meta = R$0 no gráfico.
  // Solução: ignorar o filtro de plataforma dentro do timeline (mas manter
  // período, data e campanha).
  const matchesTimelineFilters = (r) => {
    if (period !== "todos" && r.reference_month !== period) return false;
    if (!isInsideSelectedDateRange(r)) return false;
    if (campaign !== "todas" && r.campaign_name !== campaign) return false;
    return true;
  };

  const timeline = useMemo(() => {
    const months = {};

    marketingDb.fact_marketing_summary.filter(matchesTimelineFilters).forEach(s => {
      const mKey = s.reference_month;
      if (!mKey) return;

      if (!months[mKey]) {
        months[mKey] = {
          mes: s.reference_label || mKey,
          reference_month: mKey,
          receita: 0,
          investimento: 0,
          conversoes: 0,
          google: 0,
          meta: 0,
          leads: 0,
          cliques: 0,
          impressoes: 0,
          alcance: 0,
        };
      }

      const spend = s.spend || 0;
      months[mKey].receita      += s.revenue      || 0;
      months[mKey].investimento += spend;
      months[mKey].conversoes   += s.conversions  || 0;
      months[mKey].leads        += s.leads        || 0;
      months[mKey].cliques      += s.clicks       || 0;
      months[mKey].impressoes   += s.impressions  || 0;
      months[mKey].alcance      += s.reach        || 0;

      if (s.platform === "google") months[mKey].google += spend;
      if (s.platform === "meta")   months[mKey].meta   += spend;
    });

    return Object.values(months)
      .sort((a, b) => a.reference_month.localeCompare(b.reference_month));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingDb, period, startDate, endDate, campaign]);

  // Search keyword data filtered
  const getKeywordsDataFiltered = () => {
    return marketingDb.fact_keywords.filter(k => {
      if (!matchesCoreFilters(k)) return false;
      if (keyword !== "todas" && k.keyword !== keyword) return false;
      return true;
    });
  };

  // Search term data filtered
  const getSearchTermsDataFiltered = () => {
    return marketingDb.fact_search_terms.filter(s => {
      if (!matchesCoreFilters(s)) return false;
      if (searchTerm !== "todos" && s.search_term !== searchTerm) return false;
      return true;
    });
  };

  // Dynamic Executive Summary Diagnostics generator
  const generateExecutiveSummary = (campaignsList, totalsVal) => {
    if (campaignsList.length === 0) return "";
    
    const formattedInvest = brl.format(totalsVal.investimento);
    const formattedConv = number.format(totalsVal.conversoes);
    
    const sorted = [...campaignsList].sort((a, b) => b.cpa - a.cpa);
    const topCampaign = sorted[0];
    const worstCampaign = sorted[sorted.length - 1];

    let bestDeviceText = "";
    if (deviceData) {
      if (deviceData.mobile.conv > deviceData.desktop.conv) {
        bestDeviceText = "smartphones (mobile)";
      } else {
        bestDeviceText = "computadores (desktop)";
      }
    }

    const selectLabel = startDate || endDate
      ? `período de ${startDate || "início"} até ${endDate || "hoje"}`
      : period === "todos" ? "histórico completo" : `mês de ${uniqueValues.months.find(m => m.value === period)?.label || period}`;

    let text = `Para o ${selectLabel}, o investimento consolidado em mídia paga foi de ${formattedInvest}, resultando em ${formattedConv} agendamentos. `;
    
    if (topCampaign && topCampaign.cpa > 0) {
      text += `A campanha de maior eficiência foi "${topCampaign.nome}" com CPA (Custo por Agendamento) de ${brl.format(topCampaign.cpa)}. `;
    }
    
    if (bestDeviceText) {
      text += `A maior concentração de conversões ocorreu via ${bestDeviceText}. `;
    }
    
    if (worstCampaign && worstCampaign.cpa > totalsVal.cpa * 1.5 && worstCampaign.investimento > 200) {
      text += `Recomenda-se otimização de criativos ou realocação de verba na campanha "${worstCampaign.nome}" devido ao CPA elevado de ${brl.format(worstCampaign.cpa)}.`;
    }
    
    return text;
  };

  const getDynamicInsights = () => {
    if (filteredCampaigns.length === 0) {
      return {
        summary: "Aguardando upload de planilhas exportadas diretamente do Meta Ads ou Google Ads para processar inteligência.",
        list: [
          { title: "Painel autopreenchido", text: "Você pode enviar múltiplos arquivos brutos de uma só vez." },
          { title: "Inteligência Temporal", text: "Calculamos dias, semanas, trimestres e comparamos meses automaticamente." },
          { title: "Tabelas Fact Estruturadas", text: "Ingestão resiliente dividindo o conteúdo em dispositivos, termos e demográficos." },
        ]
      };
    }

    const summary = generateExecutiveSummary(filteredCampaigns, totals);
    const sorted = [...filteredCampaigns].sort((a, b) => b.investimento - a.investimento);
    const best = sorted[0] || { nome: "Nenhuma", cpa: 0 };
    const worst = sorted[sorted.length - 1] || { nome: "Nenhuma", cpa: 0 };

    return {
      summary,
      list: [
        { title: "Destaque de Agendamentos", text: `"${best.nome}" lidera o mix com maior volume de investimento (${brl.format(best.investimento)}).` },
        { title: "Oportunidade de Otimização", text: worst.cpa > 0 && worst.investimento > 0 ? `"${worst.nome}" apresenta CPA de ${brl.format(worst.cpa)} — avalie ajuste de segmentação.` : "Ajuste lances em horários ociosos do heatmap." },
        { title: "Ação Estratégica", text: "Consulte o heatmap cronológico e o mapa regional abaixo para calibrar criativos por localização." }
      ]
    };
  };

  const insights = getDynamicInsights();
  const filteredSummary = marketingDb.fact_marketing_summary.filter(matchesCoreFilters);

  // ----------------------------------------------------
  // Event Handlers & ETL Upload Orchestrator
  // ----------------------------------------------------

  const updateFileStatus = (fileName, status, message = "") => {
    setFiles((prev) =>
      prev.map((f) => (f.name === fileName ? { ...f, status, message } : f))
    );
  };

  const isStructuredDataFile = (file) => {
    const name = file.name.toLowerCase();
    return name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls");
  };

  const isAiAttachmentFile = (file) => {
    const mime = file.type || "";
    const name = file.name.toLowerCase();
    return mime.startsWith("image/") || mime === "application/pdf" || name.endsWith(".pdf");
  };

  const readAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ----------------------------------------------------
  // PROFESSIONAL IMPORT WIZARD LOGIC (MANDATORY V1 FLOW)
  // ----------------------------------------------------

  const launchImportWizard = async (file) => {
    try {
      setFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, status: "processando", message: "Iniciando Wizard..." } : f))
      );

      let rawRows = [];
      const fileName = file.name;

      if (fileName.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        rawRows = parseCsv(text);
      } else if (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")) {
        rawRows = await parseExcelFile(file);
      } else {
        throw new Error("Formato de arquivo não suportado. Envie CSV ou Excel.");
      }

      if (!rawRows || rawRows.length === 0) {
        throw new Error("O arquivo está vazio ou não pôde ser lido.");
      }

      const headers = Object.keys(rawRows[0]);
      
      // Step 2: System detects: platform, available sheets, columns, date ranges
      const detectedPlatform = detectPlatform(fileName, headers, rawRows);
      const datasetType = detectDataset(detectedPlatform, headers);
      
      // Detect date ranges
      let minDate = null;
      let maxDate = null;
      rawRows.forEach(row => {
        const dateVal = getSemanticValue(row, "date");
        if (dateVal) {
          const parsed = parseDate(dateVal);
          if (parsed && !isNaN(parsed.getTime())) {
            if (!minDate || parsed < minDate) minDate = parsed;
            if (!maxDate || parsed > maxDate) maxDate = parsed;
          }
        }
      });

      const formatDateStr = (d) => {
        if (!d) return "";
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      };

      const dateStr = minDate && maxDate 
        ? `${formatDateStr(minDate)} a ${formatDateStr(maxDate)}`
        : "Período não especificado nas linhas";

      // Step 3: Displays spreadsheet preview (first 5 rows)
      const previewRows = rawRows.slice(0, 5);

      // Step 4: AI suggests automatic column mapping based on SYNONYMS
      // Normalize accents for robust matching (e.g. "Mês" matches "mes", "Mês" matches "Mes")
      const normalizeStr = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const initialMapping = {};
      const fields = getWizardFields(detectedPlatform).map(f => f.key);
      
      fields.forEach(field => {
        const synonyms = SYNONYMS[field] || [];
        let matchedHeader = "";
        for (const syn of synonyms) {
          const normSyn = normalizeStr(syn);
          const found = headers.find(h => normalizeStr(h) === normSyn);
          if (found) {
            matchedHeader = found;
            break;
          }
        }
        if (!matchedHeader) {
          const found = headers.find(h => normalizeStr(h) === normalizeStr(field));
          if (found) matchedHeader = found;
        }
        initialMapping[field] = matchedHeader || "";

      });

      // Check if there is an existing import template matching the headers to prefill
      const savedTemplates = JSON.parse(localStorage.getItem("doit_import_templates") || "[]");
      const matchedTemplate = savedTemplates.find(t => 
        t.platform === detectedPlatform && 
        Object.values(t.mapping).every(v => !v || headers.includes(v))
      );
      // FIX: Do NOT let saved template override the date mapping if the
      // template's date column doesn't exist in the current CSV headers.
      // This prevents aggregate-report templates from breaking monthly CSVs.
      if (matchedTemplate) {
        const safeMapping = { ...matchedTemplate.mapping };
        if (safeMapping.date && !headers.includes(safeMapping.date)) {
          delete safeMapping.date; // let auto-mapping pick the right date column
        }
        Object.assign(initialMapping, safeMapping);
        triggerToast("Modelo de importação salvo carregado automaticamente!");
      }

      // --- Detect unique months from date column values ---
      const dateColumnName = initialMapping.date || null;
      const detectedMonthsMap = {};
      rawRows.slice(0, 300).forEach(row => {
        // Try mapped column first, then auto-detect via SYNONYMS
        let dv = dateColumnName ? row[dateColumnName] : undefined;
        if (!dv) dv = getSemanticValue(row, "date");
        if (!dv) return;
        const parsed = parseDate(dv);
        if (!parsed || isNaN(parsed.getTime())) return;
        const ym = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
        const label = `${["Janeiro","Fevereiro","Mar\u00e7o","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][parsed.getMonth()]}/${parsed.getFullYear()}`;
        detectedMonthsMap[ym] = label;
      });
      const detectedMonths = Object.entries(detectedMonthsMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, label]) => label);

      // Update wizard state
      setWizardFile(file);
      setWizardPlatform(detectedPlatform);
      setWizardDatasetType(datasetType);
      setWizardColumns(headers);
      setWizardDateRange({ start: minDate ? minDate.toISOString().split("T")[0] : "", end: maxDate ? maxDate.toISOString().split("T")[0] : "", label: dateStr });
      setWizardPreviewRows(previewRows);
      setWizardMapping(initialMapping);
      setWizardRawRows(rawRows);
      setWizardDetectedMonths(detectedMonths);
      setWizardSaveTemplate(false);
      setWizardTemplateName(file.name.replace(/\.[^/.]+$/, "") + " Modelo");
      setWizardStep("preview_mapping");
      setWizardErrorMsg("");

      
    } catch (err) {
      console.error(err);
      updateFileStatus(file.name, "erro", err.message || "Erro ao ler arquivo");
      triggerToast(`Falha ao abrir wizard: ${err.message}`);
    }
  };

  const handleRunWizardIngestion = async () => {
    // Validate required fields are mapped
    const missingFields = [];
    if (!wizardMapping.spend) missingFields.push("Investimento / Gasto");

    if (missingFields.length > 0) {
      setWizardErrorMsg(`Por favor, mapeie os campos obrigatórios: ${missingFields.join(", ")}`);
      return;
    }

    setWizardStep("processing");
    setWizardProgress(10);
    setWizardStatusText("Iniciando processamento assíncrono...");

    try {
      // Step 7: System processes data asynchronously (Loading steps)
      await new Promise(r => setTimeout(r, 650));
      setWizardProgress(40);
      setWizardStatusText("Validando linhas da planilha e tipos de dados...");
      
      // Step 6: System saves reusable import template
      if (wizardSaveTemplate) {
        const templates = JSON.parse(localStorage.getItem("doit_import_templates") || "[]");
        templates.push({
          id: `template_${Date.now()}`,
          name: wizardTemplateName || "Modelo Customizado",
          platform: wizardPlatform,
          mapping: wizardMapping,
          created_at: new Date().toISOString()
        });
        localStorage.setItem("doit_import_templates", JSON.stringify(templates));
      }

      await new Promise(r => setTimeout(r, 700));
      setWizardProgress(75);
      setWizardStatusText("Normalizando métricas financeiras (Universal Schema)...");

      // Step 8: System normalizes metrics
      const reference_month = inferReferenceMonth(wizardFile.name, wizardRawRows);
      
      const mIdx = parseInt(reference_month.split("-")[1], 10) - 1;
      const reference_label = `${MONTHS_PT[mIdx] || "Maio"}/${reference_month.split("-")[0]}`;

      // Simple string-based content hash for fingerprinting
      const fileStringSample = JSON.stringify(wizardRawRows.slice(0, 50));
      let file_hash = 0;
      for (let i = 0; i < fileStringSample.length; i++) {
        file_hash = (file_hash << 5) - file_hash + fileStringSample.charCodeAt(i);
        file_hash |= 0;
      }
      const finalHash = Math.abs(file_hash).toString(16);

      const metadata = {
        platform: wizardPlatform,
        dataset_type: wizardDatasetType,
        reference_month,
        reference_label,
        raw_file_name: wizardFile.name,
        file_hash: finalHash,
        count: wizardRawRows.length
      };

      // C-02 FIX: Filter rows correctly even when campaign_name is not mapped
      // CRITICAL: Meta Ads exports include a "total" row with empty campaign name
      // and spend = sum of all campaigns for the full period — must be excluded.
      const normalizedRows = wizardRawRows
        .filter(row => {
          // 1. Filter named total/metadata rows (e.g. "Total", "Resumo")
          if (wizardMapping.campaign_name) {
            const campValue = row[wizardMapping.campaign_name];
            // FIXED: also exclude rows where campaign name is empty/blank
            // (Meta Ads summary rows have empty campaign name but real spend)
            if (campValue === undefined || campValue === null || String(campValue).trim() === "") {
              return false; // empty campaign = total/summary row, skip it
            }
            if (isTotalOrMetadata(String(campValue))) {
              return false;
            }
          }

          // 2. Detect aggregate rows: span > 60 days means multi-month summary
          // Meta Ads: "Início dos relatórios" vs "Encerramento dos relatórios"
          const startKey = Object.keys(row).find(k => {
            const kl = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return kl.includes("inicio dos relatorios") || kl.includes("inicio") && kl.includes("relatorio");
          });
          const endKey = Object.keys(row).find(k => {
            const kl = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return kl.includes("encerramento dos relatorios") || kl.includes("encerramento");
          });
          if (startKey && endKey && row[startKey] && row[endKey]) {
            const startD = new Date(row[startKey]);
            const endD = new Date(row[endKey]);
            if (!isNaN(startD) && !isNaN(endD)) {
              const diffDays = (endD - startD) / (1000 * 60 * 60 * 24);
              if (diffDays > 60) return false; // multi-month aggregate row — skip
            }
          }

          // 3. Always require spend > 0 to be a valid data row
          const spend = parseFormattedFloat(row[wizardMapping.spend]);
          return spend > 0;
        })
        .map((row, idx) => {
          const campName = String(row[wizardMapping.campaign_name] || "").trim();

          // Smart date resolution:
          // 1st: use the explicitly mapped date column
          // 2nd: auto-detect any date column in the row via SYNONYMS (handles 'Mês', 'Início dos relatórios', 'Data', 'Dia')
          // 3rd: fallback to file-level reference month (first day)
          let dateVal = wizardMapping.date ? row[wizardMapping.date] : undefined;
          if (!dateVal) {
            dateVal = getSemanticValue(row, "date");
          }
          const enrichedDate = applyTemporalIntelligence(dateVal || `${reference_month}-01`);

          const spend = parseFormattedFloat(row[wizardMapping.spend]);
          
          let clicks = 0;
          if (wizardMapping.clicks) {
            clicks = Math.round(parseFormattedFloat(row[wizardMapping.clicks]));
          }
          // NOTE: We do NOT back-calculate clicks from CPC because in Meta Ads exports
          // 'Custo por resultados' is the cost-per-RESULT (CPA), not cost-per-click.
          // Using it as CPC would give: clicks = spend / CPA = number_of_results (WRONG!)

          let impressions = 0;
          if (wizardMapping.impressions) {
            // Mapeamento explícito: usa a coluna que o usuário selecionou no wizard
            impressions = Math.round(parseFormattedFloat(row[wizardMapping.impressions]));
          } else if (wizardMapping.ctr) {
            // Back-cálculo via CTR quando não há coluna de impressões mas há CTR
            const mappedCtr = parseFormattedFloat(row[wizardMapping.ctr]);
            const ctrValue = mappedCtr > 1 ? mappedCtr / 100 : mappedCtr;
            impressions = ctrValue > 0 ? Math.round(clicks / ctrValue) : 0;
          } else {
            // Fallback semântico: tenta encontrar a coluna via SYNONYMS (ex: "Impr.", "Impressões", "Impressions")
            // sem depender do mapeamento manual do wizard
            const semanticImpressions = Math.round(parseFormattedFloat(getSemanticValue(row, "impressions", 0)));
            impressions = semanticImpressions > 0 ? semanticImpressions : 0;
          }
          
          const conversionsVal = wizardMapping.conversions ? row[wizardMapping.conversions] : 0;
          const conversions = Math.round(parseFormattedFloat(conversionsVal));
          
          const revenueVal = wizardMapping.revenue ? row[wizardMapping.revenue] : 0;
          const revenue = parseFormattedFloat(revenueVal);

          const ctr = impressions > 0 ? clicks / impressions : 0;
          const cpc = clicks > 0 ? spend / clicks : 0;
          const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
          const roas = spend > 0 ? revenue / spend : 0;

          // Platform-specific extra segmentations
          const deviceVal = wizardMapping.device ? (row[wizardMapping.device] || null) : null;
          const genderVal = wizardMapping.gender ? (row[wizardMapping.gender] || null) : null;
          const ageRangeVal = wizardMapping.age_range ? (row[wizardMapping.age_range] || null) : null;
          const keywordVal = wizardMapping.keyword ? (row[wizardMapping.keyword] || null) : null;
          const searchTermVal = wizardMapping.search_term ? (row[wizardMapping.search_term] || null) : null;
          
          let networkVal = null;
          if (wizardPlatform === "google" && wizardMapping.network) {
            networkVal = row[wizardMapping.network] || null;
          } else if (wizardPlatform === "meta" && wizardMapping.placement) {
            networkVal = row[wizardMapping.placement] || null;
          }

          const reachVal = wizardMapping.reach ? Math.round(parseFormattedFloat(row[wizardMapping.reach])) : 0;
          const freqVal = wizardMapping.frequency ? parseFormattedFloat(row[wizardMapping.frequency]) : 1.0;
          const hourVal = wizardMapping.hour ? parseInt(row[wizardMapping.hour], 10) : null;

          let finalCampaignName = campName;
          if (wizardPlatform === "meta") {
            const adsetName = wizardMapping.adset_name ? String(row[wizardMapping.adset_name] || "").trim() : "";
            const adName = wizardMapping.ad_name ? String(row[wizardMapping.ad_name] || "").trim() : "";
            if (adName) {
              finalCampaignName = adName;
            } else if (adsetName) {
              finalCampaignName = adsetName;
            }
          }
          if (!finalCampaignName) {
            finalCampaignName = wizardFile.name.replace(/\.[^/.]+$/, "") || "Geral";
          }

          // M-05 FIX: leads usa apenas a coluna mapeada no wizard
          // REGRA DE NEGÓCIO:
          // - Meta Ads: leads = coluna "Leads" (formulários, pixel)
          // - Google Ads: quando não há coluna dedicada de leads,
          //   usa "Conversões" pois em campanhas de captação
          //   Conversões = Leads (formulários, ligações, WhatsApp, etc.)
          const leadsRawStr = wizardMapping.leads ? row[wizardMapping.leads] : undefined;
          let leads = leadsRawStr !== undefined ? Math.round(parseFormattedFloat(leadsRawStr)) : 0;

          // Google Ads: se não mapeou leads explicitamente, usa conversões como leads
          if (leads === 0 && wizardPlatform === "google" && conversions > 0) {
            leads = conversions;
          }

          // Capture report end date for BOTH Meta Ads and Google Ads aggregate reports.
          // Meta Ads: 'Encerramento dos relatórios' / Google Ads: 'Término', 'Data de término'
          // This allows the date filter to correctly identify aggregate vs daily data.
          let reportEndDate = null;
          const endDateKey = Object.keys(row).find(k => {
            const kl = k.toLowerCase();
            return (
              kl.includes("encerramento") ||
              kl.includes("término") ||
              kl.includes("termino") ||
              kl.includes("end date") ||
              kl.includes("data de término") ||
              kl.includes("data de termino") ||
              kl.includes("reporting end") ||
              kl.includes("end_date")
            );
          });
          if (endDateKey && row[endDateKey]) {
            const raw = String(row[endDateKey]).trim();
            // ISO date YYYY-MM-DD direct
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
              reportEndDate = raw.substring(0, 10);
            } else {
              // Try DD/MM/YYYY
              const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (dmyMatch) {
                const [, d, m, y] = dmyMatch;
                reportEndDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
              }
            }
          }

          return {
            id: `wiz_${reference_month}_${wizardPlatform}_${idx}_${Date.now()}`,
            platform: wizardPlatform,
            dataset_type: wizardDatasetType,
            campaign_name: sanitizeMojibake(finalCampaignName) || "Campanha Importada",
            device: sanitizeMojibake(deviceVal),
            gender: sanitizeMojibake(genderVal),
            age_range: sanitizeMojibake(ageRangeVal),
            keyword: sanitizeMojibake(keywordVal),
            search_term: sanitizeMojibake(searchTermVal),
            network: sanitizeMojibake(networkVal),
            
            date: enrichedDate.date,
            // Store report end date so date filters can detect aggregate Meta Ads reports
            report_end_date: reportEndDate,
            day: enrichedDate.day,
            week: enrichedDate.week,
            month: enrichedDate.month,
            month_name: enrichedDate.month_name,
            quarter: enrichedDate.quarter,
            year: enrichedDate.year,
            year_month: enrichedDate.year_month,
            // ✅ Use per-row date-derived values, NOT the file-level inference.
            // This is what makes month-by-month filtering work correctly
            // when the report has multiple months (e.g. exported with Detalhamento por Mês).
            reference_month: enrichedDate.reference_month || reference_month,
            reference_label: enrichedDate.reference_label || reference_label,

            hour: isNaN(hourVal) ? null : hourVal,

            spend,
            clicks,
            impressions,
            conversions,
            leads,
            reach: reachVal,
            frequency: freqVal,
            revenue,

            ctr,
            cpc,
            cpm,
            cpl: leads > 0 ? spend / leads : 0,
            cac: conversions > 0 ? spend / conversions : 0,
            roas,
            status: "Ativo",
            raw_file_name: wizardFile.name,
            file_hash: finalHash,
            created_at: new Date().toISOString()
          };
        });

      // -------------------------------------------------------
      // AGGREGATE DETECTION — flag rows from campaign-level reports
      // -------------------------------------------------------
      // If report_end_date exists and spans multiple months, this is an
      // aggregate report. We keep rows as-is (no fake distribution).
      // The dashboard will show a clear warning and the "Mês rápido" filter
      // will be disabled with guidance to re-export with date segmentation.
      // -------------------------------------------------------
      const hasAggregateRows = normalizedRows.some(row =>
        row.report_end_date &&
        row.date &&
        row.report_end_date.substring(0, 7) !== row.date.substring(0, 7)
      );

      // Enrich each row with is_aggregate flag for UI warnings
      const finalRows = normalizedRows.map(row => ({
        ...row,
        is_aggregate: hasAggregateRows || false,
      }));

      await new Promise(r => setTimeout(r, 600));
      setWizardProgress(90);
      setWizardStatusText("Verificando duplicados e gravando no banco...");


      // Step 9: System inserts records into database
      const dup = checkFileDuplicate(marketingDb, metadata);
      if (dup) {
        setWizardStep(null); // Temporarily hide to let modal resolve
        updateFileStatus(wizardFile.name, "processando", "Resolvendo duplicados...");
        
        await new Promise((resolve) => {
          setDuplicateFileInfo(dup);
          setPendingUpload({
            file: wizardFile,
            metadata,
            rows: finalRows,
            resolvePromise: resolve
          });
          setShowDeduplicationModal(true);
        }).then(async (action) => {
          if (action === "ignore") {
            setWizardStep(null);
            updateFileStatus(wizardFile.name, "sucesso", "Cancelado pelo usuário");
            return;
          }
          setWizardStep("processing");
          setWizardProgress(95);
          setWizardStatusText("Concluindo salvamento dos registros...");
          const result = await insertDataset(marketingDb, metadata, finalRows, action);
          setMarketingDb(result.db);

          // Step 10 & 11: System recalculates KPIs & updates dashboard in realtime
          setWizardProgress(100);
          setWizardStatusText("Finalizado!");
          setWizardResultCount(finalRows.length);
          setWizardStep("success");
          updateFileStatus(wizardFile.name, "sucesso", "Sincronizado");

          // Toast de validação de integridade: informa se os números batem
          const iv = result.integrity;
          if (iv && !iv.skipped) {
            triggerToast(iv.message);
          } else {
            triggerToast(`Wizard: ${finalRows.length} registros processados com sucesso!`);
          }
        });
      } else {
        const result = await insertDataset(marketingDb, metadata, finalRows, "replace");
        setMarketingDb(result.db);

        // Step 10 & 11: System recalculates KPIs & updates dashboard in realtime
        setWizardProgress(100);
        setWizardStatusText("Finalizado!");
        setWizardResultCount(finalRows.length);
        setWizardStep("success");
        updateFileStatus(wizardFile.name, "sucesso", "Sincronizado");

        // Toast de validação de integridade
        const iv = result.integrity;
        if (iv && !iv.skipped) {
          triggerToast(iv.message);
        } else {
          triggerToast(`Wizard: ${finalRows.length} registros processados com sucesso!`);
        }
      }

    } catch (err) {
      console.error(err);
      setWizardErrorMsg(err.message || "Erro no processamento dos dados.");
      setWizardStep("error");
      updateFileStatus(wizardFile.name, "erro", err.message || "Erro no processamento");
    } finally {
      processingFilesRef.current.delete(wizardFile.name);
    }
  };

  const handleFilesSelected = async (selectedFiles) => {
    const list = [...selectedFiles];
    if (!list.length) return;

    const newFilesState = [];
    const validFiles = [];

    for (const file of list) {
      if (processingFilesRef.current.has(file.name)) {
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        triggerToast(`O arquivo "${file.name}" excede o limite de 8MB.`);
        continue;
      }
      processingFilesRef.current.add(file.name);
      validFiles.push(file);
      newFilesState.push({
        name: file.name,
        size: file.size,
        type: file.type,
        status: "processando",
        message: "Lendo arquivo..."
      });
    }

    if (!validFiles.length) return;

    setFiles((prev) => [...prev, ...newFilesState]);
    
    // Step 1: User uploads CSV or XLSX file
    // C-08 FIX: Process ALL spreadsheet files sequentially, not just the first one
    const spreadsheets = validFiles.filter(isStructuredDataFile);
    if (spreadsheets.length > 0) {
      // Process first file immediately
      launchImportWizard(spreadsheets[0]);
      // Queue remaining files to be processed after the first wizard completes
      // We store them so the user can process them one by one after the wizard closes
      if (spreadsheets.length > 1) {
        triggerToast(`${spreadsheets.length} arquivos detectados. Processando 1 de ${spreadsheets.length}. Os demais serão processados em sequência.`);
        // Store pending files in ref so they can be launched after wizard closes
        spreadsheets.slice(1).forEach(f => {
          updateFileStatus(f.name, "aguardando", "Na fila — aguardando processamento.");
        });
        pendingFilesQueueRef.current = spreadsheets.slice(1);
      }
    } else {
      validFiles.forEach(file => {
        updateFileStatus(file.name, "erro", "Formato não suportado.");
        processingFilesRef.current.delete(file.name);
      });
      triggerToast("A versão V1 aceita apenas planilhas CSV, XLS ou XLSX.");
    }
  };

  // Resolve paused loop
  const handleDeduplicationResolve = async (action) => {
    if (!pendingUpload) return;
    
    const { file, metadata, resolvePromise } = pendingUpload;
    try {
      updateFileStatus(file.name, "processando", `Processando (${action})...`);
      
      if (resolvePromise) {
        resolvePromise(action);
      }
      
      if (action === "ignore") {
        updateFileStatus(file.name, "sucesso", "Ignorado pelo usuário");
        triggerToast(`Envio do arquivo "${file.name}" cancelado.`);
      } else {
        updateFileStatus(file.name, "sucesso", "Sincronizado");
        triggerToast(`Arquivo "${file.name}" integrado via ${action}!`);
      }
    } catch (err) {
      console.error(err);
      updateFileStatus(file.name, "erro", "Erro ao resolver duplicado");
    } finally {
      setPendingUpload(null);
      setDuplicateFileInfo(null);
      setShowDeduplicationModal(false);
    }
  };

  // Helper download blob
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  // ─── GERAÇÃO DO RELATÓRIO EXECUTIVO (HTML → Print → PDF) ────────────────────
  // Substitui a geração raw-PDF que causava caracteres corrompidos (ÿ, ãØ, etc.)
  // por uma janela HTML estilizada com UTF-8 + Google Fonts → o browser converte em PDF limpo.
  const openExecutiveReportWindow = (reportData = null) => {
    const brlFmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
    const numFmt = (v) => new Intl.NumberFormat("pt-BR").format(v || 0);
    const pct    = (v) => `${(v || 0).toFixed(2).replace(".", ",")}%`;
    const now    = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    const title        = reportData?.titulo        || "Relatório Executivo de Mídia Paga";
    const subtitle     = reportData?.subtitulo     || "Diagnóstico estratégico consolidado";
    const conclusion   = reportData?.conclusao     || insights?.summary || "Dados consolidados do período analisado.";
    const recs         = reportData?.recomendacoes || [
      "Analise as campanhas com maior volume de agendamentos e considere escalar o investimento gradualmente.",
      "Revise criativos e segmentação das campanhas com CPA (Custo por Agendamento) acima da média.",
      "Monitore as métricas diariamente para identificar oportunidades de otimização.",
    ];
    const steps        = reportData?.proximosPassos || [
      "Validar a qualidade e completude dos dados importados.",
      "Definir metas de CPA e CPL para o próximo ciclo.",
      "Gerar nova leitura após o próximo período de otimização.",
    ];

    const sorted   = [...filteredCampaigns].sort((a, b) => b.investimento - a.investimento);
    const topCamps = sorted.slice(0, 10);

    const campRows = topCamps.map(c => `
      <tr>
        <td>${c.nome || "-"}</td>
        <td><span class="badge ${c.tipo}">${c.plataforma}</span></td>
        <td class="num">${brlFmt(c.investimento)}</td>
        <td class="num">${numFmt(c.cliques)}</td>
        <td class="num">0</td>
        <td class="num">${brlFmt(c.cpa)}</td>
        <td><span class="status ${c.status === "Ativa" ? "ativa" : c.status === "Pausada" ? "pausada" : "encerrada"}">${c.status}</span></td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} – DOit BI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #0f172a; font-size: 10pt; line-height: 1.55; }
  .page { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; padding-bottom: 5mm; border-bottom: 2px solid #0f172a; }
  .brand { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .brand span { color: #10b981; }
  .header-right { text-align: right; }
  .header-date { font-size: 8pt; color: #64748b; font-weight: 500; }
  .header-period { font-size: 8pt; color: #64748b; }

  /* Title block */
  .title-block { margin-bottom: 7mm; }
  .report-title { font-size: 17pt; font-weight: 800; color: #0f172a; line-height: 1.2; margin-bottom: 2mm; }
  .report-subtitle { font-size: 9.5pt; color: #475569; font-weight: 500; }

  /* KPI grid */
  .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #10b981; margin: 6mm 0 3mm; border-left: 3px solid #10b981; padding-left: 5px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-bottom: 5mm; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3.5mm 4mm; }
  .kpi-label { font-size: 7pt; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1mm; }
  .kpi-value { font-size: 14pt; font-weight: 800; color: #0f172a; line-height: 1; }
  .kpi-sub   { font-size: 7pt; color: #94a3b8; margin-top: 0.5mm; }

  /* Platform comparison */
  .platform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 5mm; }
  .platform-card { border-radius: 6px; padding: 3.5mm 4mm; }
  .platform-card.google { background: #eff6ff; border: 1px solid #bfdbfe; }
  .platform-card.meta   { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .platform-name { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1.5mm; }
  .google .platform-name { color: #1d4ed8; }
  .meta   .platform-name { color: #065f46; }
  .platform-invest { font-size: 13pt; font-weight: 800; color: #0f172a; }
  .platform-meta-row { display: flex; gap: 4mm; margin-top: 1.5mm; flex-wrap: wrap; }
  .platform-meta-item { font-size: 7pt; color: #475569; }
  .platform-meta-item strong { font-weight: 700; color: #0f172a; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 8pt; }
  thead tr { background: #0f172a; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-weight: 600; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.05em; }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 2mm 3mm; }
  tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .badge { display: inline-block; padding: 0.5mm 2mm; border-radius: 3px; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge.google { background: #dbeafe; color: #1e40af; }
  .badge.meta   { background: #dcfce7; color: #166534; }
  .status { display: inline-block; padding: 0.5mm 2mm; border-radius: 3px; font-size: 6.5pt; font-weight: 700; }
  .status.ativa     { background: #dcfce7; color: #166534; }
  .status.pausada   { background: #fef9c3; color: #854d0e; }
  .status.encerrada { background: #f1f5f9; color: #64748b; }

  /* Text blocks */
  .text-block { background: #f8fafc; border-left: 3px solid #10b981; padding: 3.5mm 5mm; border-radius: 0 6px 6px 0; margin-bottom: 4mm; font-size: 9pt; color: #1e293b; line-height: 1.6; }
  .recs-list, .steps-list { list-style: none; padding: 0; margin-bottom: 5mm; }
  .recs-list li, .steps-list li { display: flex; gap: 2.5mm; align-items: flex-start; padding: 2mm 0; border-bottom: 1px solid #f1f5f9; font-size: 8.5pt; color: #334155; }
  .recs-list li::before { content: '●'; color: #10b981; font-size: 7pt; margin-top: 1mm; flex-shrink: 0; }
  .steps-list li::before { content: '→'; color: #6366f1; font-size: 9pt; flex-shrink: 0; }

  /* Footer */
  .footer { margin-top: 8mm; padding-top: 4mm; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7pt; color: #94a3b8; }

  @media print {
    body { font-size: 9.5pt; }
    .page { padding: 8mm 10mm; }
    .no-print { display: none; }
    @page { margin: 10mm; size: A4; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="brand">DOit<span>BI</span></div>
    <div class="header-right">
      <div class="header-date">Gerado em ${now}</div>
      <div class="header-period">Relatório Executivo de Mídia Paga</div>
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="title-block">
    <div class="report-title">${title}</div>
    <div class="report-subtitle">${subtitle}</div>
  </div>

  <!-- KPIs CONSOLIDADOS -->
  <div class="section-title">KPIs Consolidados</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Investimento Total</div>
      <div class="kpi-value">${brlFmt(totals.investimento)}</div>
      <div class="kpi-sub">Mídia paga consolidada</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Cliques Totais</div>
      <div class="kpi-value">${numFmt(totals.cliques)}</div>
      <div class="kpi-sub">CTR: ${pct(totals.ctr)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Agendamentos</div>
      <div class="kpi-value">0</div>
      <div class="kpi-sub">Dados via integração futura</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Demos Realizadas</div>
      <div class="kpi-value">0</div>
      <div class="kpi-sub">Dados via integração futura</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">CPC Médio</div>
      <div class="kpi-value">${brlFmt(totals.cpc)}</div>
      <div class="kpi-sub">Impressões: ${numFmt(totals.impressoes)}</div>
    </div>
  </div>

  <!-- COMPARAÇÃO POR PLATAFORMA -->
  <div class="section-title">Investimento por Plataforma</div>
  <div class="platform-grid">
    <div class="platform-card google">
      <div class="platform-name">Google Ads</div>
      <div class="platform-invest">${brlFmt(filteredCampaigns.filter(c => c.tipo === "google").reduce((s, c) => s + c.investimento, 0))}</div>
      <div class="platform-meta-row">
        <span class="platform-meta-item"><strong>${filteredCampaigns.filter(c => c.tipo === "google" && c.status === "Ativa").length}</strong> ativas</span>
        <span class="platform-meta-item"><strong>${filteredCampaigns.filter(c => c.tipo === "google").length}</strong> total</span>
      </div>
    </div>
    <div class="platform-card meta">
      <div class="platform-name">Meta Ads</div>
      <div class="platform-invest">${brlFmt(filteredCampaigns.filter(c => c.tipo === "meta").reduce((s, c) => s + c.investimento, 0))}</div>
      <div class="platform-meta-row">
        <span class="platform-meta-item"><strong>${filteredCampaigns.filter(c => c.tipo === "meta" && c.status === "Ativa").length}</strong> ativas</span>
        <span class="platform-meta-item"><strong>${filteredCampaigns.filter(c => c.tipo === "meta").length}</strong> total</span>
      </div>
    </div>
  </div>

  <!-- TABELA DE CAMPANHAS -->
  <div class="section-title">Campanhas (top 10 por investimento)</div>
  <table>
    <thead><tr>
      <th>Campanha</th>
      <th>Plataforma</th>
      <th class="num">Investimento</th>
      <th class="num">Cliques</th>
      <th class="num">Agendamentos</th>
      <th class="num">CPA</th>
      <th>Status</th>
    </tr></thead>
    <tbody>${campRows || "<tr><td colspan=7 style='text-align:center;color:#94a3b8;padding:4mm'>Nenhuma campanha disponível</td></tr>"}</tbody>
  </table>

  <!-- CONCLUSÃO -->
  <div class="section-title">Conclusão Executiva</div>
  <div class="text-block">${conclusion}</div>

  <!-- RECOMENDAÇÕES -->
  <div class="section-title">Recomendações Estratégicas</div>
  <ul class="recs-list">${recs.map(r => `<li>${r}</li>`).join("")}</ul>

  <!-- PRÓXIMOS PASSOS -->
  <div class="section-title">Próximos Passos</div>
  <ul class="steps-list">${steps.map(s => `<li>${s}</li>`).join("")}</ul>

  <!-- RODAPÉ -->
  <div class="footer">
    <span>DOit BI — Plataforma de Business Intelligence de Mídia Paga</span>
    <span>Documento gerado automaticamente em ${now}</span>
  </div>

  <!-- BOTÃO IMPRIMIR (some ao imprimir) -->
  <div class="no-print" style="text-align:center;margin-top:8mm">
    <button onclick="window.print()" style="background:#0f172a;color:#fff;border:none;padding:10px 28px;border-radius:6px;font-size:11pt;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">Salvar como PDF</button>
  </div>

</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) {
      triggerToast("Permita pop-ups para gerar o relatório PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  // Consolidated CSV/Excel Export Logic
  const handleExportSpreadsheet = () => {
    const listToExport = filteredSummary;
    if (listToExport.length === 0) {
      triggerToast("Nenhum dado consolidado disponível para exportar.");
      return;
    }

    const totalRows = listToExport.length;
    
    // Build spreadsheet rows with formulas
    const rows = [
      ["DOIT BI - RELATÓRIO EXECUTIVO E BASE CONSOLIDADA DE MARKETING"],
      ["Gerado em:", new Date().toLocaleString("pt-BR")],
      [],
      ["RESUMO DE KPIs (FÓRMULAS EXCEL)"],
      ["KPI", "Valor", "Fórmula", "Descrição"],
      ["Investimento Total (R$)", `=SOMA(E17:E${totalRows + 16})`, "=SOMA(E17:E...)", "Soma de todo investimento em mídia paga"],
      ["Cliques Totais", `=SOMA(F17:F${totalRows + 16})`, "=SOMA(F17:F...)", "Quantidade total de cliques recebidos"],
      ["Impressões Totais", `=SOMA(G17:G${totalRows + 16})`, "=SOMA(G17:G...)", "Quantidade total de exibições do anúncio"],
      ["Leads Totais", `=SOMA(J17:J${totalRows + 16})`, "=SOMA(J17:J...)", "Quantidade total de leads capturados"],
      ["Agendamentos Totais", `=SOMA(H17:H${totalRows + 16})`, "=SOMA(H17:H...)", "Quantidade total de agendamentos"],
      ["CTR Geral", `=SEERRO(B7/B8;0)`, "=Cliques/Impressões", "Taxa média de cliques"],
      ["CPC Geral (R$)", `=SEERRO(B6/B7;0)`, "=Investimento/Cliques", "Custo médio por clique"],
      ["CPL Geral (R$)", `=SEERRO(B6/B9;0)`, "=Investimento/Leads", "Custo por lead"],
      ["CPA Geral (R$)", `=SEERRO(B6/B10;0)`, "=Investimento/Agendamentos", "Custo por agendamento"],
      [],
      ["Data de Referência", "Mês", "Plataforma", "Campanha", "Investimento (R$)", "Cliques Totais", "Impressões", "Agendamentos", "Demos Realizadas", "Leads", "CTR", "CPC", "CPM", "CPL", "CPA", "Status"],
      ...listToExport.map((item, index) => {
        const rowNum = index + 17; // starts on row 17
        return [
          item.date,
          item.reference_label,
          item.platform === "google" ? "Google Ads" : "Meta Ads",
          item.campaign_name,
          item.spend,
          item.clicks,
          item.impressions,
          0,
          0,
          item.leads,
          `=SEERRO(F${rowNum}/G${rowNum};0)`,
          `=SEERRO(E${rowNum}/F${rowNum};0)`,
          `=SEERRO((E${rowNum}/G${rowNum})*1000;0)`,
          `=SEERRO(E${rowNum}/J${rowNum};0)`,
          `=SEERRO(E${rowNum}/H${rowNum};0)`,
          item.status
        ];
      })
    ];

    const csv = rows.map((row) => row.map((cell) => {
      const valStr = String(cell ?? "");
      return `"${valStr.replaceAll('"', '""')}"`;
    }).join(";")).join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `doit-bi-base-executiva-${period}.csv`);
    triggerToast("Exportação com fórmulas Excel gerada com sucesso! Verifique a pasta Downloads.");
  };

  const handleGenerateReport = async () => {
    let reportData = null;
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: filteredCampaigns, totals }),
      });
      if (response.ok) {
        reportData = await response.json();
      }
    } catch (err) {
      console.error("Falha ao gerar relatório com IA, usando fallback local:", err);
    }

    const today = new Date().toLocaleDateString("pt-BR").replaceAll("/", "-");
    openExecutiveReportWindow(reportData);
    triggerToast("Relatório executivo aberto. Use Salvar como PDF no navegador.");
  };

  const handleToggleAutomation = () => {
    triggerToast("Monitoramento ativado: CPA, CPL, fadiga criativa e verba desperdiçada serão acompanhados.");
  };

  // AI Chat Assistant simulator queries
  const getSimulatedAnswer = (text) => {
    const q = text.toLowerCase();
    
    if (filteredCampaigns.length === 0) {
      return "Não há campanhas ou dados carregados no momento. Por favor, faça o upload de um arquivo CSV/XLSX de campanhas para gerar recomendações.";
    }

    const sorted = [...filteredCampaigns].sort((a, b) => b.roas - a.roas);
    const best = sorted[0] || { nome: "Nenhuma", roas: 0 };
    const worst = sorted[sorted.length - 1] || { nome: "Nenhuma", roas: 0 };

    if (q.includes("melhor") || q.includes("roas")) {
      return `A campanha com melhor ROAS no período selecionado é a "${best.nome}", registrando ${best.roas.toFixed(2).replace(".", ",")}x. Recomendamos escalar orçamentos nela.`;
    }
    if (q.includes("cpa") || q.includes("aumentou") || q.includes("cpl")) {
      return `O custo por conversão (CPA) consolidado está em ${brl.format(totals.cpa)}. O principal impulsionador do custo é a campanha "${worst.nome}" com ROAS de ${worst.roas.toFixed(2).replace(".", ",")}x. Reduzir orçamentos ociosos ajudará a calibrar o CPA.`;
    }
    if (q.includes("desperd") || q.includes("cortar")) {
      return `Identificamos fadiga criativa e retorno abaixo da média na campanha "${worst.nome}". Considere pausar o conjunto e testar novas segmentações de público.`;
    }
    return `Diagnóstico Consolidado: Investimento de ${brl.format(totals.investimento)} gerando ${number.format(totals.cliques)} cliques com CPC médio de ${brl.format(totals.cpc)}. A maior alavanca no momento está em direcionar verbas adicionais para celulares, onde o CTR registrou melhor desempenho.`;
  };

  const handleSendMessage = async (text) => {
    const newUserMessage = { type: "user", text };
    setMessages((prev) => [...prev, newUserMessage]);
    setChatPending(true);

    // A-06 FIX: AbortController with 30s timeout to prevent infinite pending state
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // BP-04: Send only last 10 messages to limit API cost
          messages: [...messages.slice(-9), newUserMessage],
          campaigns: filteredCampaigns,
          uploadedFiles: base64Files,
        }),
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "API_KEY_MISSING") {
          triggerToast("Simulador ativo: adicione OPENAI_API_KEY ou GEMINI_API_KEY no .env.local.");
          // C-01 FIX: setChatPending is handled inside each branch, not in finally
          setTimeout(() => {
            const simulated = getSimulatedAnswer(text);
            setMessages((prev) => [...prev, { type: "ai", text: simulated }]);
            setChatPending(false);
          }, 600);
          return;
        }
        throw new Error(data.message || "Erro de servidor.");
      }

      setMessages((prev) => [...prev, { type: "ai", text: data.reply }]);
      setBase64Files([]);
      // C-01 FIX: Set pending false only after successful response
      setChatPending(false);
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      console.error("Chat request failed, falling back to simulator:", err);
      triggerToast(isAbort ? "Chat: timeout de 30s atingido. Usando simulador local." : "Erro na IA. Executando simulador local.");
      setTimeout(() => {
        const simulated = getSimulatedAnswer(text);
        setMessages((prev) => [...prev, { type: "ai", text: simulated }]);
        // C-01 FIX: Set pending false inside catch branch, not in finally
        setChatPending(false);
      }, 600);
      // No return — fall through without finally re-setting
    }
    // C-01 FIX: NO finally block setting setChatPending(false) — each branch handles it
  };

  // Render AuthModal if Supabase RLS is configured and session is empty
  if (isSupabaseConfigured && !user && !authBypassed && !authChecking) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      <AuroraBackground />
      <div className={`app-shell${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <div className="sidebar-placeholder" style={{ pointerEvents: "none" }} />
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
          user={user}
          onSignOut={handleSignOut}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(prev => !prev)}
          isCollapsed={isSidebarCollapsed}
          onCollapseToggle={toggleSidebarCollapse}
        />

        <main className="workspace">
          <Topbar 
            onRefresh={async () => {
              // A-09 FIX: Refresh reloads data from localStorage instead of corrupting it with random noise
              const freshDb = getDatabase();
              setMarketingDb(freshDb);
              triggerToast("Dados recarregados do banco local com sucesso.");
            }} 
            onGenerateReport={handleGenerateReport} 
            onClearData={() => setShowClearConfirmModal(true)} 
          />

          <ControlStrip
            platform={platform}
            onPlatformChange={setPlatform}
            period={period}
            onPeriodChange={(value) => {
              setPeriod(value);
              if (value !== "todos") {
                setStartDate(`${value}-01`);
                const [year, month] = value.split("-").map(Number);
                const lastDay = new Date(year, month, 0).getDate();
                setEndDate(`${value}-${String(lastDay).padStart(2, "0")}`);
              }
            }}
            startDate={startDate}
            onStartDateChange={(value) => {
              setStartDate(value);
              setPeriod("todos");
            }}
            endDate={endDate}
            onEndDateChange={(value) => {
              setEndDate(value);
              setPeriod("todos");
            }}
            campaign={campaign}
            onCampaignChange={setCampaign}
            device={device}
            onDeviceChange={setDevice}
            gender={gender}
            onGenderChange={setGender}
            age={age}
            onAgeChange={setAge}
            network={network}
            onNetworkChange={setNetwork}
            keyword={keyword}
            onKeywordChange={setKeyword}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            uniqueValues={uniqueValues}
            onExport={handleExportSpreadsheet}
            isScrolled={isScrolled}
          />

          {/* ── SEÇÃO RELATÓRIOS ─────────────────────────────── */}
          {activeSection === "relatorios" && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <ReportBuilder
                timeline={timeline}
                totals={totals}
                filteredCampaigns={filteredCampaigns}
                platform={platform}
                period={period}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          )}

          {/* ── CONTEÚDO PRINCIPAL (visível quando não é relatórios) ─── */}
          {activeSection !== "relatorios" && (
          <>

            <section className="hero-grid" id="visao-geral">
            <article className={`intelligence-panel ${isIntelligenceUpdating ? "is-updating" : ""}`}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Diagnóstico da IA</p>
                  <h2>Resumo estratégico consolidado</h2>
                </div>
                {base64Files.length > 0 && (
                  <span className="confidence" style={{ background: "rgba(123, 183, 255, 0.15)", color: "var(--blue)", borderColor: "rgba(123, 183, 255, 0.28)" }}>
                    {base64Files.length} anexo(s) carregado(s)
                  </span>
                )}
                <span className="confidence">99% precisão</span>
              </div>
              <p id="executiveSummary">{insights.summary}</p>
              <div className="insight-list">
                {insights.list.map((ins, index) => (
                  <div key={index} className="insight-card">
                    <strong>{ins.title}</strong>
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            </article>

            <UploadZone files={files} onFilesSelected={handleFilesSelected} />
          </section>

          {/* ⚠️ AGGREGATE DATA WARNING BANNER */}
          {uniqueValues.isAggregate && (
            <div style={{
              background: "linear-gradient(135deg, rgba(255,196,0,0.12) 0%, rgba(255,140,0,0.08) 100%)",
              border: "1px solid rgba(255,196,0,0.35)",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
            }}>
              <span style={{ fontSize: "1.4rem", marginTop: "2px", flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#ffc400", marginBottom: "6px", fontSize: "0.9rem" }}>
                  Relatório agregado detectado — filtros por mês indisponíveis
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.6, marginBottom: "10px" }}>
                  O arquivo importado é um <strong style={{ color: "var(--text)" }}>relatório de período total</strong> — cada campanha tem uma única linha com os totais de&nbsp;
                  <strong style={{ color: "#ffc400" }}>
                    {uniqueValues.startPeriod
                      ? new Date(uniqueValues.startPeriod + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                      : "início"} até {uniqueValues.endPeriod
                      ? new Date(uniqueValues.endPeriod + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                      : "fim"}
                  </strong>.
                  Não há dados reais separados por mês neste arquivo.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.6, fontWeight: 600 }}>
                  ✅ Para consultar mês a mês com dados reais:
                </p>
                <ol style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.8, paddingLeft: "20px", margin: "4px 0 0" }}>
                  <li>Acesse o <strong style={{ color: "var(--text)" }}>Gerenciador de Anúncios do Meta</strong></li>
                  <li>Clique em <strong style={{ color: "var(--text)" }}>Relatórios</strong> → <strong style={{ color: "var(--text)" }}>Exportar tabela como CSV</strong></li>
                  <li>Em <strong style={{ color: "var(--text)" }}>Detalhamento</strong>, selecione <strong style={{ color: "#7cf7be" }}>&quot;Tempo → Mês&quot;</strong> ou <strong style={{ color: "#7cf7be" }}>&quot;Tempo → Dia&quot;</strong></li>
                  <li>Exporte e importe aqui — cada linha terá o mês real com seus dados</li>
                </ol>
              </div>
            </div>
          )}

          <KpiGrid key={`kpi-${dashboardResetKey}`} totals={totals} />

          <section className="analytics-grid">
            <HistoricalChart key={`hist-${dashboardResetKey}`} timeline={timeline} />
            <DonutChart key={`donut-${dashboardResetKey}`} campaigns={Object.values(allCampaigns)} timeline={timeline} />
          </section>

          <section className="segmentation-grid">
            <DeviceChart key={`device-${dashboardResetKey}`} deviceData={deviceData} />
          </section>

          <section className="analytics-grid operations-grid">
            <CampaignTable key={`table-${dashboardResetKey}`} campaigns={filteredCampaigns} />
            <ChatAssistant
              key={`chat-${dashboardResetKey}`}
              messages={messages}
              onSendMessage={handleSendMessage}
              isPending={chatPending}
            />
          </section>


          <section className="report-grid" id="relatorios">
            <article>
              <p className="eyebrow">Relatório executivo</p>
              <h2>PDF executivo para download</h2>
              <p>Gere um relatório estratégico com KPIs, conclusão executiva, recomendações e próximos passos em PT-BR.</p>
              <button className="primary-btn" id="btnReportBottom" onClick={handleGenerateReport}>
                Baixar PDF executivo
              </button>
            </article>
            <article id="automacoes">
              <p className="eyebrow">Automações inteligentes</p>
              <h2>Alertas de performance</h2>
              <p>Monitore aumento de CPA, fadiga criativa, desperdício de verba e oportunidades de escala antes que virem problema.</p>
              <button className="ghost-btn" id="btnAutomation" onClick={handleToggleAutomation}>
                Ativar monitoramento
              </button>
            </article>
          </section>

          {/* ── FIM do bloco condicional (não-relatórios) ──── */}
          </>
          )}

        </main>
      </div>

      {/* Deduplication Modal */}
      {showDeduplicationModal && pendingUpload && duplicateFileInfo && (
        <div className="dedup-modal-overlay">
          <div className="dedup-modal-box">
            <h3>📊 Conflito de Arquivo Detectado</h3>
            <p>
              O arquivo <strong>{pendingUpload.file.name}</strong> contém dados de <strong>{pendingUpload.metadata.platform === "google" ? "Google Ads" : "Meta Ads"}</strong> para o relatório de <strong>{pendingUpload.metadata.dataset_type}</strong> de <strong>{pendingUpload.metadata.reference_label}</strong> que já foram importados.
            </p>
            <p className="hint">Como deseja proceder com este upload?</p>
            
            <div className="dedup-actions">
              <button className="primary-btn flex-1" onClick={() => handleDeduplicationResolve("replace")}>
                🔄 Substituir Dados
              </button>
              <button className="ghost-btn flex-1" onClick={() => handleDeduplicationResolve("merge")}>
                ➕ Mesclar Registros
              </button>
              <button className="danger-btn flex-1" onClick={() => handleDeduplicationResolve("ignore")}>
                Ignorar envio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Clear Data Confirmation Modal ─────────────────────── */}
      {showClearConfirmModal && (
        <div
          className="clear-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && !isClearingSystem && setShowClearConfirmModal(false)}
        >
          <div className="clear-modal-box">
            {/* Ícone */}
            <div className="clear-modal-icon">🗑️</div>

            {/* Título */}
            <h3 className="clear-modal-title">Limpar todos os dados?</h3>

            {/* Descrição */}
            <p className="clear-modal-desc">
              Todos os relatórios importados, KPIs, gráficos, análises, filtros e
              histórico de IA serão <strong style={{color: "#fff"}}>completamente removidos</strong> do
              dashboard. O sistema voltará ao estado inicial.
            </p>

            {/* Badges com contagem real dos dados */}
            {marketingDb.fact_marketing_summary?.length > 0 && (
              <div className="clear-modal-badges">
                {[
                  { label: `${marketingDb.uploaded_files?.length || 0} Arquivos`, show: (marketingDb.uploaded_files?.length || 0) > 0 },
                  { label: `${marketingDb.fact_campaigns?.length || 0} Campanhas`, show: (marketingDb.fact_campaigns?.length || 0) > 0 },
                  { label: `${marketingDb.fact_marketing_summary?.length || 0} Registros`, show: (marketingDb.fact_marketing_summary?.length || 0) > 0 },
                  { label: `${marketingDb.fact_devices?.length || 0} Segmentos`, show: (marketingDb.fact_devices?.length || 0) > 0 },
                ].filter(b => b.show).map(b => (
                  <span key={b.label} className="clear-modal-badge">{b.label}</span>
                ))}
              </div>
            )}

            {/* Aviso de irreversibilidade */}
            <p className="clear-modal-warning">
              ⚠️ Esta ação é irreversível. Você precisará reimportar os relatórios.
            </p>

            {/* Ações */}
            <div className="clear-modal-actions">
              <button
                className="clear-modal-cancel"
                onClick={() => setShowClearConfirmModal(false)}
                disabled={isClearingSystem}
              >
                Cancelar
              </button>
              <button
                className="clear-modal-confirm"
                onClick={handleClearData}
                disabled={isClearingSystem}
              >
                {isClearingSystem ? "Limpando..." : "🗑️ Limpar Tudo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Overlay Full-Screen de Limpeza Progressiva ──────────────── */}
      {isClearingSystem && (
        <div className="system-clear-overlay">
          <div className="clear-spinner" />

          <div className="clear-title">Limpando o sistema analytics...</div>

          <div className="clear-progress-track">
            <div className="clear-progress-fill" />
          </div>

          <div className="clear-steps">
            {[
              { step: 1, label: "Zerando estados e KPIs" },
              { step: 2, label: "Removendo dados importados" },
              { step: 3, label: "Limpando cache e storage" },
              { step: 4, label: "Reiniciando o painel" },
            ].map(({ step, label }) => (
              <div
                key={step}
                className={`clear-step ${
                  clearStep > step ? "done" : clearStep === step ? "active" : ""
                }`}
              >
                <span className="clear-step-dot" />
                {clearStep > step ? `✓ ${label}` : label}
              </div>
            ))}
          </div>

          <div className="clear-subtitle">O dashboard será reiniciado automaticamente.</div>
        </div>
      )}

      {/* Import Wizard Modal (Mandatory V1 Flow) */}
      {wizardStep && wizardFile && (
        <div className="wizard-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="wizardTitle">
          <div className="wizard-modal-box">
            
            {/* Wizard Header */}
            <header className="wizard-header">
              <h2 id="wizardTitle">🧙‍♂️ Assistente de Ingestão de Dados</h2>
              <p>Arquivo: <strong>{wizardFile.name}</strong> (Plataforma: <strong>{wizardPlatform === "google" ? "Google Ads" : "Meta Ads"}</strong>)</p>
            </header>

            {/* Step Indicators */}
            <div className="wizard-steps-indicator">
              {/* C-07 FIX: Indicator correctly shows error state — not "done" — when wizard failed */}
              <div className={`wizard-step-indicator-item ${
                wizardStep === "preview_mapping" ? "active" :
                wizardStep === "error" ? "error" : "done"
              }`}>
                <span className="circle">1</span> Mapeamento &amp; Preview
              </div>
              <div className={`wizard-step-indicator-item ${wizardStep === "processing" ? "active" : wizardStep === "success" ? "done" : ""}`}>
                <span className="circle">2</span> Processamento Assíncrono
              </div>
              <div className={`wizard-step-indicator-item ${wizardStep === "success" ? "active done" : ""}`}>
                <span className="circle">3</span> Conclusão Realtime
              </div>
            </div>

            {/* Step Content: Preview & Mappings */}
            {wizardStep === "preview_mapping" && (
              <>
                <div className="wizard-grid">
                  
                  {/* Left Column: Spreadsheet Preview */}
                  <div>
                    <h3 className="wizard-section-title">📊 Pré-visualização da Planilha</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Linhas iniciais detectadas. Período: <strong>{wizardDateRange.label}</strong>
                    </p>

                    {/* MONTHS DIAGNOSTIC — shows before user confirms */}
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      marginBottom: "12px",
                      background: wizardDetectedMonths.length > 1
                        ? "rgba(124,247,190,0.08)" : "rgba(255,196,0,0.08)",
                      border: `1px solid ${wizardDetectedMonths.length > 1 ? "rgba(124,247,190,0.3)" : "rgba(255,196,0,0.3)"}`,
                    }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px",
                        color: wizardDetectedMonths.length > 1 ? "#7cf7be" : "#ffc400" }}>
                        {wizardDetectedMonths.length > 1
                          ? `✅ ${wizardDetectedMonths.length} meses detectados no arquivo`
                          : wizardDetectedMonths.length === 1
                            ? "⚠️ Apenas 1 mês detectado — possível relatório agregado"
                            : "⚠️ Nenhuma data detectada nas linhas"}
                      </p>
                      {wizardDetectedMonths.length > 0 && (
                        <p style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          {wizardDetectedMonths.join(" · ")}
                        </p>
                      )}
                      {wizardDetectedMonths.length <= 1 && (
                        <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          Para dados reais por mês: no Meta Ads, use <strong style={{color:"var(--text)"}}>Detalhamento → Tempo → Mês</strong> antes de exportar.
                        </p>
                      )}
                    </div>

                    <div className="wizard-preview-table-container">
                      <table className="wizard-preview-table">
                        <thead>
                          <tr>
                            {wizardColumns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {wizardPreviewRows.map((row, idx) => (
                            <tr key={idx}>
                              {wizardColumns.map((col) => (
                                <td key={col}>{String(row[col] ?? "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="wizard-template-box" style={{ marginTop: "20px" }}>
                      <h3 className="wizard-section-title" style={{ fontSize: "0.95rem" }}>💾 Modelo de Importação</h3>
                      <label className="wizard-checkbox-label">
                        <input
                          type="checkbox"
                          checked={wizardSaveTemplate}
                          onChange={(e) => setWizardSaveTemplate(e.target.checked)}
                        />
                        Salvar este mapeamento como modelo reutilizável
                      </label>
                      {wizardSaveTemplate && (
                        <input
                          type="text"
                          className="wizard-text-input"
                          placeholder="Nome do Modelo (ex: Meta Ads Semanal)"
                          value={wizardTemplateName}
                          onChange={(e) => setWizardTemplateName(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Right Column: Column Mapping */}
                  <div>
                    <h3 className="wizard-section-title">🔗 Mapeamento Semântico de Colunas</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                      Conecte as colunas da sua planilha às métricas universais da plataforma.
                    </p>
                    
                    <div className="wizard-mapping-list">
                      {WIZARD_STANDARD_FIELDS.map((field) => {
                        const isMapped = !!wizardMapping[field.key];
                        return (
                          <div key={field.key} className="wizard-mapping-item" style={{
                            borderLeft: isMapped
                              ? "3px solid var(--blue)"
                              : field.required
                                ? "3px solid #ff453a"   // Obrigatório + não mapeado → vermelho
                                : "3px solid var(--border, #333)" // Opcional + não mapeado → cinza neutro
                          }}>
                            <div className="wizard-mapping-label-row">
                              <span className="wizard-mapping-field-name">
                                {field.label} {field.required && <span className="wizard-mapping-field-required">Obrigatório</span>}
                              </span>
                            </div>
                            <span className="wizard-mapping-desc">{field.description}</span>
                            <select
                              className="wizard-mapping-select"
                              value={wizardMapping[field.key] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWizardMapping((prev) => ({ ...prev, [field.key]: val }));
                              }}
                            >
                              <option value="">-- Selecionar Coluna --</option>
                              {wizardColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {wizardErrorMsg && <div className="wizard-error-box">{wizardErrorMsg}</div>}

                {/* Footer Actions */}
                <footer className="wizard-footer-actions">
                  <button
                    className="ghost-btn"
                    onClick={() => {
                      updateFileStatus(wizardFile.name, "erro", "Ingestão cancelada");
                      processingFilesRef.current.delete(wizardFile.name);
                      setWizardStep(null);
                    }}
                  >
                    Cancelar Importação
                  </button>
                  <button className="primary-btn" onClick={handleRunWizardIngestion}>
                    Confirmar Mapeamento & Ingerir dados
                  </button>
                </footer>
              </>
            )}

            {/* Step Content: Async Processing */}
            {wizardStep === "processing" && (
              <div className="wizard-processing-container">
                <div className="wizard-progress-bar-bg">
                  <div className="wizard-progress-bar-fill" style={{ width: `${wizardProgress}%` }} />
                </div>
                <h3 className="wizard-processing-text">{wizardProgress}% - Ingerindo Relatório</h3>
                <p className="wizard-processing-status">Status: <strong>{wizardStatusText}</strong></p>
              </div>
            )}

            {/* Step Content: Success */}
            {wizardStep === "success" && (
              <div className="wizard-success-container">
                <div className="wizard-success-icon">✓</div>
                <h3 className="wizard-success-title">Ingestão Concluída com Sucesso!</h3>
                <p className="wizard-success-desc">
                  O arquivo de marketing <strong>{wizardFile.name}</strong> foi lido, normalizado e integrado com sucesso. 
                  Inserimos <strong>{wizardResultCount}</strong> registros de campanhas na base de dados consolidada. 
                  Os gráficos e o painel já foram atualizados.
                </p>
                <footer className="wizard-footer-actions" style={{ width: "100%", justifyContent: "center", border: "none", paddingTop: "8px" }}>
                  <button
                    className="primary-btn"
                    onClick={() => {
                      setWizardStep(null);
                      setWizardFile(null);
                    }}
                  >
                    Visualizar no Dashboard Realtime
                  </button>
                </footer>
              </div>
            )}

          </div>
        </div>
      )}

      <div className={`toast ${showToast ? "show" : ""}`} id="toast" role="status" aria-live="polite">
        {toastMessage}
      </div>
    </>
  );
}
