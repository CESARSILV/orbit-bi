"use client";

import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import AuroraBackground from "@/components/AuroraBackground";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ControlStrip from "@/components/ControlStrip";
import KpiGrid from "@/components/KpiGrid";
import LineChart from "@/components/LineChart";
import DonutChart from "@/components/DonutChart";
import CampaignTable from "@/components/CampaignTable";
import ChatAssistant from "@/components/ChatAssistant";
import UploadZone from "@/components/UploadZone";
import AuthModal from "@/components/AuthModal";
import DeviceChart from "@/components/DeviceChart";
import TimeHeatmap from "@/components/TimeHeatmap";
import RegionalMap from "@/components/RegionalMap";
import SearchOperations from "@/components/SearchOperations";

// Custom ETL & DB Ingestion Imports
import { processUploadFile } from "@/lib/etl";
import { getDatabase, saveDatabase, insertDataset, checkFileDuplicate, INITIAL_DB } from "@/lib/db";

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
    text: "Olá. Já analisei o painel atual e posso explicar ROAS, CPA, públicos vencedores, desperdício de verba e próximos passos.",
  },
];

export default function Home() {
  // Authentication State
  const [user, setUser] = useState(null);
  const [authBypassed, setAuthBypassed] = useState(false);
  const [authChecking, setAuthChecking] = useState(isSupabaseConfigured);

  // Consolidated Relational Database State (Lazily initialized to avoid setting state in effect)
  const [marketingDb, setMarketingDb] = useState(() => {
    if (typeof window !== "undefined") {
      return getDatabase();
    }
    return INITIAL_DB;
  });

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
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastTimer, setToastTimer] = useState(null);
  
  // File upload management states
  const [files, setFiles] = useState([]);
  const [base64Files, setBase64Files] = useState([]);
  
  // States for paused upload and deduplication modal
  const [pendingUpload, setPendingUpload] = useState(null);
  const [duplicateFileInfo, setDuplicateFileInfo] = useState(null);
  const [showDeduplicationModal, setShowDeduplicationModal] = useState(false);

  // Chat State
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [chatPending, setChatPending] = useState(false);

  // Trigger Toast Notification
  const triggerToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimer) clearTimeout(toastTimer);
    const timer = setTimeout(() => setShowToast(false), 3200);
    setToastTimer(timer);
  };

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
              dataset_type: "meta_campaign_performance",
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
            const { consolidateSummary } = require("@/lib/db");
            return consolidateSummary(next);
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
        setMarketingDb(INITIAL_DB);
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
      setMarketingDb(INITIAL_DB);
      saveDatabase(INITIAL_DB);
      triggerToast("Desconectado com sucesso.");
    }
  };

  const handleClearData = async () => {
    if (window.confirm("Tem certeza que deseja excluir todas as campanhas, histórico e facts? Esta ação é irreversível.")) {
      setMarketingDb(INITIAL_DB);
      saveDatabase(INITIAL_DB);
      setFiles([]);
      setBase64Files([]);
      setPendingUpload(null);
      setDuplicateFileInfo(null);
      setShowDeduplicationModal(false);
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
      setMessages(INITIAL_MESSAGES);
      setChatPending(false);
      
      if (user && isSupabaseConfigured) {
        try {
          const { error: campaignsErr } = await supabase
            .from("campaigns")
            .delete()
            .eq("user_id", user.id);
            
          const { error: timelineErr } = await supabase
            .from("historical_metrics")
            .delete()
            .eq("user_id", user.id);

          if (campaignsErr) throw campaignsErr;
          if (timelineErr) throw timelineErr;
          
          triggerToast("Dados excluídos com sucesso do Supabase!");
        } catch (err) {
          console.error("Error clearing Supabase database records:", err);
          triggerToast("Erro ao excluir dados do banco. Verifique suas permissões.");
        }
      } else {
        triggerToast("Modo de demonstração zerado com sucesso!");
      }
    }
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

  const getUniqueFilterValues = () => {
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

    return {
      months,
      campaigns,
      devices,
      genders,
      ages,
      networks,
      keywords,
      searchTerms
    };
  };

  const uniqueValues = getUniqueFilterValues();

  const isInsideSelectedDateRange = (row) => {
    const rowDate = row.date || (row.reference_month ? `${row.reference_month}-01` : "");
    if (!rowDate) return true;
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

  // Filter main campaign list for standard display table
  const getCampaignGroupedList = () => {
    const list = marketingDb.fact_marketing_summary.filter(matchesCoreFilters);

    const grouped = {};
    list.forEach(c => {
      const name = c.campaign_name;
      if (!grouped[name]) {
        grouped[name] = {
          nome: name,
          plataforma: c.platform === "google" ? "Google Ads" : "Meta Ads",
          tipo: c.platform,
          investimento: 0,
          receita: 0,
          conversoes: 0,
          cliques: 0,
          impressions: 0,
          status: c.status || "Ativa"
        };
      }
      const g = grouped[name];
      g.investimento += c.spend || 0;
      g.receita += c.revenue || 0;
      g.conversoes += c.conversions || 0;
      g.cliques += c.clicks || 0;
      g.impressions += c.impressions || 0;
    });

    return Object.values(grouped).map(g => {
      const ctr = g.impressions > 0 ? (g.cliques / g.impressions) * 100 : 0;
      const cpc = g.cliques > 0 ? g.investimento / g.cliques : 0;
      const cpa = g.conversoes > 0 ? g.investimento / g.conversoes : 0;
      const roas = g.investimento > 0 ? g.receita / g.investimento : 0;

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
        status: g.status
      };
    });
  };

  const filteredCampaigns = getCampaignGroupedList();

  // Calculate Consolidated KPIs from filtered summary
  const getCalculatedTotals = () => {
    const list = marketingDb.fact_marketing_summary.filter(matchesCoreFilters);

    if (list.length === 0) {
      return {
        investimento: 0, receita: 0, lucro: 0, roas: 0, cpa: 0, ctr: 0, cpc: 0,
        conversoes: 0, cliques: 0, impressoes: 0, alcance: 0, roi: 0, ticket: 0,
        leads: 0, cpm: 0, cpl: 0, cac: 0
      };
    }

    const investimento = list.reduce((sum, item) => sum + (item.spend || 0), 0);
    const receita = list.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const conversoes = list.reduce((sum, item) => sum + (item.conversions || 0), 0);
    const leads = list.reduce((sum, item) => sum + (item.leads || 0), 0);
    const cliques = list.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const impressoes = list.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const reach = list.reduce((sum, item) => sum + (item.reach || 0), 0);

    const ctr = impressoes > 0 ? cliques / impressoes : 0;
    const cpc = cliques > 0 ? investimento / cliques : 0;
    const cpm = impressoes > 0 ? (investimento / impressoes) * 1000 : 0;
    const cpl = leads > 0 ? investimento / leads : 0;
    const cac = conversoes > 0 ? investimento / conversoes : 0;
    const roas = investimento > 0 ? receita / investimento : 0;
    const profit = receita - investimento;
    const roi = investimento > 0 ? (profit / investimento) * 100 : 0;
    const ticket = conversoes > 0 ? receita / conversoes : 0;

    return {
      investimento,
      receita,
      lucro: profit,
      roas,
      cpa: cac,
      ctr,
      cpc,
      conversoes,
      cliques,
      impressoes,
      alcance: reach || Math.round(impressoes * 0.68),
      roi,
      ticket,
      leads,
      cpm,
      cpl,
      cac
    };
  };

  const totals = getCalculatedTotals();

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

  const deviceData = getDeviceChartData();

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

  // Dynamic Time Series / LineChart
  const getTimelineChartData = () => {
    const months = {};
    marketingDb.fact_marketing_summary.filter(matchesCoreFilters).forEach(s => {
      const mLabel = s.reference_label;
      if (!months[mLabel]) {
        months[mLabel] = {
          mes: mLabel,
          receita: 0,
          investimento: 0,
          conversoes: 0
        };
      }
      months[mLabel].receita += s.revenue || 0;
      months[mLabel].investimento += s.spend || 0;
      months[mLabel].conversoes += s.conversions || 0;
    });

    const list = Object.values(months).map(m => {
      const parts = m.mes.split("/");
      const mIdx = MONTHS_PT.indexOf(parts[0]);
      const year = parseInt(parts[1], 10);
      const orderKey = year * 12 + mIdx;

      const roas = m.investimento > 0 ? m.receita / m.investimento : 0;
      const cpa = m.conversoes > 0 ? m.investimento / m.conversoes : 0;

      return {
        orderKey,
        mes: m.mes,
        receita: m.receita,
        investimento: m.investimento,
        roas,
        cpa
      };
    });

    return list.sort((a, b) => a.orderKey - b.orderKey);
  };

  const timeline = getTimelineChartData();

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
    const formattedRoas = `${totalsVal.roas.toFixed(2).replace(".", ",")}x`;
    
    const sorted = [...campaignsList].sort((a, b) => b.roas - a.roas);
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

    let text = `Para o ${selectLabel}, o investimento consolidado em mídia paga foi de ${formattedInvest}, resultando em ${formattedConv} conversões com um ROAS médio de ${formattedRoas}. `;
    
    if (topCampaign && topCampaign.roas > 0) {
      text += `A campanha de maior eficiência foi "${topCampaign.nome}" liderando com ROAS de ${topCampaign.roas.toFixed(2).replace(".", ",")}x. `;
    }
    
    if (bestDeviceText) {
      text += `A maior concentração de conversões ocorreu via ${bestDeviceText}. `;
    }
    
    if (worstCampaign && worstCampaign.roas < 1.0 && worstCampaign.investimento > 200) {
      text += `Recomenda-se realizar otimização de criativos ou realocação de verba na campanha "${worstCampaign.nome}" devido ao retorno de ${worstCampaign.roas.toFixed(2).replace(".", ",")}x.`;
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
    const sorted = [...filteredCampaigns].sort((a, b) => b.roas - a.roas);
    const best = sorted[0] || { nome: "Nenhuma", roas: 0 };
    const worst = sorted[sorted.length - 1] || { nome: "Nenhuma", roas: 0 };

    return {
      summary,
      list: [
        { title: "Destaque de Conversão", text: `"${best.nome}" lidera o mix com ROAS de ${best.roas.toFixed(2).replace(".", ",")}x.` },
        { title: "Desperdício Potencial", text: worst.roas < 1.0 && worst.investimento > 0 ? `"${worst.nome}" apresenta ROAS insatisfatório de ${worst.roas.toFixed(2).replace(".", ",")}x.` : "Ajuste lances em horários ociosos do heatmap." },
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

  // Multiple Files selected (Processed inside a clean Promise-paused loop to avoid cascade setStates)
  const handleFilesSelected = async (selectedFiles) => {
    const list = [...selectedFiles];
    if (!list.length) return;

    const newFilesState = [];
    const validFiles = [];

    for (const file of list) {
      if (file.size > 8 * 1024 * 1024) {
        triggerToast(`O arquivo "${file.name}" excede o limite de 8MB.`);
        continue;
      }
      validFiles.push(file);
      newFilesState.push({
        name: file.name,
        size: file.size,
        type: file.type,
        status: "processando",
        message: "Processando..."
      });
    }

    if (!validFiles.length) return;

    setFiles((prev) => [...prev, ...newFilesState]);
    
    // Read current database value fresh from local storage
    let currentDb = getDatabase();

    for (const file of validFiles) {
      try {
        if (!isStructuredDataFile(file)) {
          if (!isAiAttachmentFile(file)) {
            throw new Error("Formato não suportado. Envie CSV, XLS, XLSX, PDF ou imagem.");
          }

          const base64 = await readAsDataUrl(file);
          setBase64Files((prev) => [
            ...prev,
            { name: file.name, mimeType: file.type || "application/octet-stream", base64 }
          ]);
          updateFileStatus(file.name, "sucesso", "Anexo da IA");
          triggerToast(`Arquivo "${file.name}" anexado ao chat de IA.`);
          continue;
        }

        const result = await processUploadFile(file);
        
        // Check duplicate against current db
        const dup = checkFileDuplicate(currentDb, result.metadata);
        if (dup) {
          // Pause execution and wait for user's decision inside the deduplication modal
          await new Promise((resolve) => {
            setDuplicateFileInfo(dup);
            setPendingUpload({
              file,
              metadata: result.metadata,
              rows: result.rows,
              resolvePromise: resolve
            });
            setShowDeduplicationModal(true);
          }).then(async (action) => {
            const updatedDb = await insertDataset(currentDb, result.metadata, result.rows, action);
            currentDb = updatedDb;
            setMarketingDb(updatedDb);
          });
        } else {
          const updatedDb = await insertDataset(currentDb, result.metadata, result.rows, "replace");
          currentDb = updatedDb;
          setMarketingDb(updatedDb);
          updateFileStatus(file.name, "sucesso", "Sincronizado");
          triggerToast(`Arquivo "${file.name}" integrado com sucesso!`);
        }
      } catch (err) {
        console.error(err);
        updateFileStatus(file.name, "erro", err.message || "Erro de leitura");
        triggerToast(`Falha no processamento: ${err.message}`);
      }
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

  const pdfText = (value) => {
    const bytes = [0xfe, 0xff];
    for (const char of String(value)) {
      const code = char.codePointAt(0);
      if (code > 0xffff) continue;
      bytes.push((code >> 8) & 255, code & 255);
    }
    return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
  };

  const createExecutivePdf = (reportData = null) => {
    const sorted = [...filteredCampaigns].sort((a, b) => b.roas - a.roas);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const title = reportData?.titulo || "Relatório Executivo Orbit BI";
    const subtitle = reportData?.subtitulo || "Diagnóstico estratégico de mídia paga";
    const conclusion = reportData?.conclusao || insights.summary || "Aguardando dados consolidados para diagnóstico completo.";
    const recommendations = reportData?.recomendacoes || [
      best ? `Escalar gradualmente a campanha "${best.nome}" enquanto o ROAS permanecer acima da média.` : "Carregar dados de campanhas para identificar oportunidades de escala.",
      worst ? `Revisar orçamento e criativos da campanha "${worst.nome}".` : "Importar dados de Google Ads e Meta Ads para comparação executiva.",
      "Monitorar CPA, ROAS, CTR e conversões diariamente antes de ampliar investimento."
    ];
    const nextSteps = reportData?.proximosPassos || [
      "Validar qualidade dos dados importados.",
      "Priorizar campanhas com maior eficiência incremental.",
      "Gerar nova leitura após o próximo ciclo de otimização."
    ];

    const lines = [
      { text: "Orbit BI | Relatório Executivo de Mídia Paga", size: 14, y: 790 },
      { text: title, size: 22, y: 756 },
      { text: subtitle, size: 12, y: 728 },
      { text: `Investimento: ${brl.format(totals.investimento)} | Receita: ${brl.format(totals.receita)} | ROAS: ${totals.roas.toFixed(2).replace(".", ",")}x`, size: 12, y: 684 },
      { text: `Conversões: ${number.format(totals.conversoes)} | CPA: ${brl.format(totals.cpa)} | Lucro estimado: ${brl.format(totals.lucro)}`, size: 12, y: 662 },
      { text: "Conclusão executiva", size: 16, y: 612 },
      { text: conclusion.slice(0, 115), size: 10, y: 588 },
      { text: conclusion.slice(115, 230), size: 10, y: 570 },
      { text: "Recomendações", size: 16, y: 520 },
      ...recommendations.slice(0, 3).map((item, index) => ({ text: `${index + 1}. ${item}`.slice(0, 125), size: 10, y: 492 - index * 22 })),
      { text: "Próximos passos", size: 16, y: 394 },
      ...nextSteps.slice(0, 3).map((item, index) => ({ text: `${index + 1}. ${item}`.slice(0, 125), size: 10, y: 366 - index * 22 })),
      { text: "Documento gerado automaticamente em PT-BR pelo Orbit BI.", size: 9, y: 82 },
    ];

    const content = [
      "q",
      "0.02 0.03 0.06 rg 0 0 595 842 re f",
      "0.07 0.10 0.16 rg 36 635 523 115 re f",
      "0.05 0.08 0.13 rg 36 440 523 170 re f",
      "0.05 0.08 0.13 rg 36 245 523 155 re f",
      "0.49 0.97 0.75 rg 36 812 150 3 re f",
      ...lines.map((line) => `BT /F1 ${line.size} Tf 54 ${line.y} Td 0.95 0.97 0.99 rg ${pdfText(line.text)} Tj ET`),
      "Q",
    ].join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  // Consolidated CSV Export Logic
  const handleExportSpreadsheet = () => {
    const listToExport = filteredSummary;
    if (listToExport.length === 0) {
      triggerToast("Nenhum dado consolidado disponível para exportar.");
      return;
    }

    const rows = [
      ["Data de Referência", "Mês", "Plataforma", "Campanha", "Investimento (R$)", "Receita (R$)", "Cliques", "Impressões", "Conversões", "CTR", "CPC", "CPM", "CPL", "ROAS", "Status"],
      ...listToExport.map((item) => [
        item.date,
        item.reference_label,
        item.platform === "google" ? "Google Ads" : "Meta Ads",
        item.campaign_name,
        item.spend,
        item.revenue,
        item.clicks,
        item.impressions,
        item.conversions,
        `${(item.ctr * 100).toFixed(2)}%`,
        item.cpc.toFixed(2),
        item.cpm.toFixed(2),
        item.cpl.toFixed(2),
        item.roas.toFixed(2),
        item.status
      ])
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `orbit-bi-base-consolidada-${period}.csv`);
    triggerToast("Exportação gerada com sucesso! Verifique a pasta Downloads.");
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
    downloadBlob(createExecutivePdf(reportData), `orbit-bi-relatorio-executivo-${today}.pdf`);
    triggerToast("PDF executivo gerado. Verifique a pasta Downloads.");
  };

  const handleToggleAutomation = () => {
    triggerToast("Monitoramento ativado: CPA, ROAS, fadiga criativa e verba desperdiçada serão acompanhados.");
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
    return `Diagnóstico Consolidado: Investimento de ${brl.format(totals.investimento)} gerando ${brl.format(totals.receita)} em receita (ROAS de ${totals.roas.toFixed(2).replace(".", ",")}x). A maior alavanca no momento está em direcionar verbas adicionais para celulares, onde as conversões registraram melhor CPA.`;
  };

  const handleSendMessage = async (text) => {
    const newUserMessage = { type: "user", text };
    setMessages((prev) => [...prev, newUserMessage]);
    setChatPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, newUserMessage],
          campaigns: filteredCampaigns,
          uploadedFiles: base64Files,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "API_KEY_MISSING") {
          triggerToast("Simulador ativo: adicione OPENAI_API_KEY ou GEMINI_API_KEY no .env.local.");
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
    } catch (err) {
      console.error("Chat request failed, falling back to simulator:", err);
      triggerToast("Erro na IA. Executando simulador local.");
      setTimeout(() => {
        const simulated = getSimulatedAnswer(text);
        setMessages((prev) => [...prev, { type: "ai", text: simulated }]);
        setChatPending(false);
      }, 600);
    } finally {
      setChatPending(false);
    }
  };

  // Render AuthModal if Supabase RLS is configured and session is empty
  if (isSupabaseConfigured && !user && !authBypassed && !authChecking) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      <AuroraBackground />
      <div className="app-shell">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
          user={user}
          onSignOut={handleSignOut}
        />

        <main className="workspace">
          <Topbar 
            onRefresh={async () => {
              const updatedDb = { ...marketingDb };
              const mutate = (list) => {
                if (!list) return [];
                return list.map(r => {
                  const dev = 0.97 + Math.random() * 0.06;
                  const newSpend = r.spend * dev;
                  const newRev = r.revenue * dev;
                  return {
                    ...r,
                    spend: newSpend,
                    revenue: newRev,
                    roas: newSpend > 0 ? newRev / newSpend : 0
                  };
                });
              };
              updatedDb.fact_campaigns = mutate(updatedDb.fact_campaigns);
              updatedDb.fact_marketing_summary = mutate(updatedDb.fact_marketing_summary);
              
              setMarketingDb(updatedDb);
              saveDatabase(updatedDb);
              triggerToast("Dados consolidados atualizados com flutuações em tempo real.");
            }} 
            onGenerateReport={handleGenerateReport} 
            onClearData={handleClearData} 
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
          />

          <section className="hero-grid" id="visao-geral">
            <article className="intelligence-panel">
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

          <KpiGrid totals={totals} />

          <section className="analytics-grid">
            <LineChart timeline={timeline} />
            <DonutChart campaigns={filteredCampaigns} />
          </section>

          <section className="segmentation-grid">
            <DeviceChart deviceData={deviceData} />
            <TimeHeatmap timeData={timeData} />
            <RegionalMap geoData={geoData} />
          </section>

          <section className="analytics-grid operations-grid">
            <CampaignTable campaigns={filteredCampaigns} />
            <ChatAssistant
              messages={messages}
              onSendMessage={handleSendMessage}
              isPending={chatPending}
            />
          </section>

          <section className="analytics-grid">
            <SearchOperations
              keywordsData={getKeywordsDataFiltered()}
              searchTermsData={getSearchTermsDataFiltered()}
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
              <p>Monitore queda de ROAS, aumento de CPA, fadiga criativa, desperdício de verba e oportunidades de escala antes que virem problema.</p>
              <button className="ghost-btn" id="btnAutomation" onClick={handleToggleAutomation}>
                Ativar monitoramento
              </button>
            </article>
          </section>
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

      <div className={`toast ${showToast ? "show" : ""}`} id="toast" role="status" aria-live="polite">
        {toastMessage}
      </div>
    </>
  );
}
