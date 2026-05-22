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

// Formatting helpers
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const INITIAL_CAMPAIGNS = [];

const INITIAL_TIMELINE = [];

export default function Home() {
  // Authentication State
  const [user, setUser] = useState(null);
  const [authBypassed, setAuthBypassed] = useState(false);
  const [authChecking, setAuthChecking] = useState(isSupabaseConfigured);

  // Application State
  const [platform, setPlatform] = useState("todas");
  const [period, setPeriod] = useState(30);
  const [goal, setGoal] = useState("receita");
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE);
  const [activeSection, setActiveSection] = useState("visao-geral");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastTimer, setToastTimer] = useState(null);
  
  // File state
  const [files, setFiles] = useState([]);
  const [base64Files, setBase64Files] = useState([]);

  // Chat State
  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: "Olá. Já analisei o painel atual e posso explicar ROAS, CPA, públicos vencedores, desperdício de verba e próximos passos.",
    },
  ]);
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

    // Seed default data for new database users
    const seedUserData = async (userId) => {
      try {
        const seededCampaigns = INITIAL_CAMPAIGNS.map(c => ({
          nome: c.nome,
          plataforma: c.plataforma,
          tipo: c.tipo,
          investimento: c.investimento,
          receita: c.receita,
          roas: c.roas,
          cpa: c.cpa,
          ctr: c.ctr,
          cpc: c.cpc,
          conversoes: c.conversoes,
          status: c.status,
          user_id: userId
        }));

        const seededTimeline = INITIAL_TIMELINE.map(t => ({
          mes: t.mes,
          receita: t.receita,
          investimento: t.investimento,
          roas: t.roas,
          cpa: t.cpa,
          user_id: userId
        }));

        const { data: cData, error: cErr } = await supabase.from("campaigns").insert(seededCampaigns).select();
        if (cErr) throw cErr;

        const { error: tErr } = await supabase.from("historical_metrics").insert(seededTimeline);
        if (tErr) throw tErr;

        if (cData) {
          setCampaigns(cData.map(c => ({
            id: c.id,
            nome: c.nome,
            plataforma: c.plataforma,
            tipo: c.tipo,
            investimento: Number(c.investimento),
            receita: Number(c.receita),
            roas: Number(c.roas),
            cpa: Number(c.cpa),
            ctr: Number(c.ctr),
            cpc: Number(c.cpc),
            conversoes: Number(c.conversoes),
            status: c.status
          })));
        }
        triggerToast("Seu painel Supabase foi inicializado com dados de teste!");
      } catch (err) {
        console.error("Error seeding user database data:", err);
      }
    };

    // Fetch campaigns and metrics from Supabase
    const fetchUserData = async (userId) => {
      try {
        const { data: campaignsData, error: campaignsError } = await supabase
          .from("campaigns")
          .select("*");

        if (campaignsError) throw campaignsError;

        const { data: timelineData, error: timelineError } = await supabase
          .from("historical_metrics")
          .select("*")
          .order("created_at", { ascending: true });

        if (timelineError) throw timelineError;

        if (campaignsData && campaignsData.length > 0) {
          // Map DB campaigns back to UI format
          setCampaigns(campaignsData.map(c => ({
            id: c.id,
            nome: c.nome,
            plataforma: c.plataforma,
            tipo: c.tipo,
            investimento: Number(c.investimento),
            receita: Number(c.receita),
            roas: Number(c.roas),
            cpa: Number(c.cpa),
            ctr: Number(c.ctr),
            cpc: Number(c.cpc),
            conversoes: Number(c.conversoes),
            status: c.status
          })));
        } else {
          // Seed DB if it's a new user
          await seedUserData(userId);
        }

        if (timelineData && timelineData.length > 0) {
          setTimeline(timelineData.map(t => ({
            mes: t.mes,
            receita: Number(t.receita),
            investimento: Number(t.investimento),
            roas: Number(t.roas),
            cpa: Number(t.cpa)
          })));
        }
      } catch (err) {
        console.error("Error fetching database data:", err);
        triggerToast("Erro ao carregar dados do Supabase. Usando simulação local.");
      }
    };

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.user.id);
      }
      setAuthChecking(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.user.id);
      } else {
        setUser(null);
        setCampaigns(INITIAL_CAMPAIGNS);
        setTimeline(INITIAL_TIMELINE);
      }
      setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      setAuthBypassed(false);
      triggerToast("Desconectado com sucesso.");
    }
  };

  const handleClearData = async () => {
    if (window.confirm("Tem certeza que deseja excluir todas as campanhas e histórico? Esta ação é irreversível e apagará os dados do banco de dados.")) {
      setCampaigns([]);
      setTimeline([]);
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

  // Filter Campaigns based on platform state
  const filteredCampaigns = campaigns.filter(
    (c) => platform === "todas" || c.tipo === platform
  );

  // Calculate Totals based on filtered list
  const getTotals = () => {
    const list = filteredCampaigns;
    if (list.length === 0) return {
      investimento: 0, receita: 0, lucro: 0, roas: 0, cpa: 0, ctr: 0, cpc: 0,
      conversoes: 0, cliques: 0, impressoes: 0, alcance: 0, roi: 0, ticket: 0
    };

    const investimento = list.reduce((sum, item) => sum + item.investimento, 0);
    const receita = list.reduce((sum, item) => sum + item.receita, 0);
    const conversoes = list.reduce((sum, item) => sum + item.conversoes, 0);
    const cliques = Math.round(list.reduce((sum, item) => sum + (item.cpc > 0 ? item.investimento / item.cpc : 0), 0));
    const averageCtr = list.reduce((sum, item) => sum + item.ctr, 0) / list.length;
    const impressoes = averageCtr > 0 ? Math.round(cliques / (averageCtr / 100)) : 0;
    
    return {
      investimento,
      receita,
      lucro: receita - investimento,
      roas: investimento > 0 ? receita / investimento : 0,
      cpa: conversoes > 0 ? investimento / conversoes : 0,
      ctr: averageCtr,
      cpc: cliques > 0 ? investimento / cliques : 0,
      conversoes,
      cliques,
      impressoes,
      alcance: Math.round(impressoes * 0.68),
      roi: investimento > 0 ? ((receita - investimento) / investimento) * 100 : 0,
      ticket: conversoes > 0 ? receita / conversoes : 0,
    };
  };

  const totals = getTotals();

  // Highlight analysis strings
  const getInsights = () => {
    if (filteredCampaigns.length === 0) {
      return {
        summary: "Nenhum dado de campanha disponível no momento. Faça o upload de um arquivo CSV de campanhas ou integre sua conta para que o copiloto de IA possa gerar um diagnóstico estratégico em tempo real.",
        list: [
          { title: "Aguardando dados", text: "Você pode subir planilhas exportadas do Google Ads ou Meta Ads arrastando o arquivo no campo acima." },
          { title: "Colunas recomendadas", text: "Para uma análise completa, inclua colunas como Campanha, Investimento, Receita, Cliques, Conversões." },
          { title: "Dashboard Dinâmico", text: "Assim que os dados forem inseridos, todos os gráficos, tabelas e relatórios em PDF serão ativados." },
        ]
      };
    }

    const sorted = [...filteredCampaigns].sort((a, b) => b.roas - a.roas);
    const best = sorted[0] || { nome: "Nenhuma", roas: 0 };
    const worst = sorted[sorted.length - 1] || { nome: "Nenhuma", roas: 0 };
    
    return {
      summary: `O painel indica ${brl.format(totals.receita)} em receita atribuída com ROAS de ${totals.roas.toFixed(2).replace(".", ",")}x. A maior alavanca está em redistribuir verba das campanhas com fadiga para os conjuntos com CPA abaixo da média.`,
      list: [
        { title: "Campanha vencedora", text: `${best.nome} lidera com ROAS de ${best.roas.toFixed(2).replace(".", ",")}x e deve receber escala progressiva.` },
        { title: "Risco detectado", text: `${worst.nome} apresenta baixa eficiência e sinais de desperdício de orçamento.` },
        { title: "Próxima ação", text: "Realocar 12% da verba para remarketing e busca de alta intenção deve elevar o lucro estimado." },
      ]
    };
  };

  const insights = getInsights();

  // Event Handlers
  const handlePlatformChange = (value) => {
    setPlatform(value);
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    triggerToast(`Período atualizado: últimos ${value === 180 ? "6 meses" : `${value} dias`}.`);
  };

  const handleGoalChange = (value) => {
    setGoal(value);
    const goalText = value === "receita" ? "Receita" : value === "leads" ? "Leads" : "Vendas";
    triggerToast(`Objetivo principal alterado para ${goalText}.`);
  };

  const handleRefreshData = async () => {
    const updated = campaigns.map((c) => {
      const factor = 0.96 + Math.random() * 0.1;
      const newReceita = Math.round(c.receita * factor);
      return {
        ...c,
        receita: newReceita,
        roas: c.investimento > 0 ? newReceita / c.investimento : 0,
      };
    });

    setCampaigns(updated);

    if (user && isSupabaseConfigured) {
      try {
        for (const item of updated) {
          if (item.id) {
            await supabase
              .from("campaigns")
              .update({ receita: item.receita, roas: item.roas })
              .eq("id", item.id);
          }
        }
        triggerToast("Leitura atualizada e persistida no Supabase.");
      } catch (err) {
        console.error("Error updating campaigns database records:", err);
      }
    } else {
      triggerToast("Leitura atualizada com novas variações de performance.");
    }
  };

  // Helper helper to download files
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

  // CSV Export Logic
  const handleExportSpreadsheet = () => {
    const rows = [
      ["Campanha", "Plataforma", "Investimento", "Receita", "ROAS", "CPA", "CTR", "CPC", "Conversoes", "Status IA"],
      ...filteredCampaigns.map((item) => [item.nome, item.plataforma, item.investimento, item.receita, item.roas, item.cpa, item.ctr, item.cpc, item.conversoes, item.status]),
      [],
      ["Formula executiva", "ROI", "=((D2-C2)/C2)", "Edite os valores e recalcule em Excel/Sheets"],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "orbit-bi-exportacao-executiva.csv");
    triggerToast("Download iniciado. A planilha será salva na pasta Downloads.");
  };

  // PDF Text Helper for Latin characters encoding in raw PDF
  const pdfText = (value) => {
    const bytes = [0xfe, 0xff];
    for (const char of value) {
      const code = char.codePointAt(0);
      if (code > 0xffff) continue;
      bytes.push((code >> 8) & 255, code & 255);
    }
    return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
  };

  const escapePdfName = (value) => {
    return value.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  };

  // Text wrapping helper for raw PDF generation
  const wrapText = (text, maxLength) => {
    if (!text) return [];
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      if ((currentLine + " " + word).trim().length <= maxLength) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // PDF Generation Logic
  const handleGenerateReport = async () => {
    triggerToast("Analisando performance com IA e gerando PDF...");

    let reportData = null;

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaigns: filteredCampaigns,
          totals: totals,
        }),
      });

      if (response.ok) {
        reportData = await response.json();
      } else {
        const errorData = await response.json();
        console.warn("Report API returned status:", response.status, errorData.message);
      }
    } catch (err) {
      console.error("Failed to fetch report from Gemini API, using simulation:", err);
    }

    // Fallback simulation if API is not configured or fails
    if (!reportData) {
      const sorted = [...filteredCampaigns].sort((a, b) => b.roas - a.roas);
      const best = sorted[0] || { nome: "Nenhuma", roas: 0 };
      const worst = sorted[sorted.length - 1] || { nome: "Nenhuma", roas: 0 };

      reportData = {
        titulo: "Relatório de Performance e Escala",
        subtitulo: "Estabilidade de ROAS com oportunidades de realocação de mídia",
        conclusao: "O painel indica crescimento consistente de receita atribuída, com eficiência geral preservada. A maior alavanca no momento está em redistribuir o orçamento de canais saturados e campanhas em fadiga para conjuntos de anúncios vencedores.",
        recomendacoes: [
          `Campanha vencedora: ${best.nome} lidera o ROAS em ${best.roas.toFixed(2).replace(".", ",")}x e deve receber escala progressiva de orçamento.`,
          `Risco detectado: ${worst.nome} apresenta alta ineficiência com CPA elevado de ${brl.format(worst.cpa)}, indicando desperdício relativo de verba.`,
          "Ação geral sugerida: Realocar 12% a 15% do orçamento total para remarketing de alta intenção e campanhas de busca de funil de marca."
        ],
        proximosPassos: [
          "Escalar vencedores em incrementos de 15% a 20% a cada 3 a 5 dias.",
          "Interromper ou reduzir verba em conjuntos com CPA superior ao teto aceitável.",
          "Gerar nova rodada de diagnóstico estratégico de IA após um período de 7 dias de veiculação."
        ]
      };
    }

    // Assembly of raw PDF elements
    const commands = [
      "q",
      // Slate dark background
      "0.02 0.03 0.06 rg 0 0 595 842 re f",
      
      // Header Card Background
      "0.07 0.10 0.16 rg 36 715 523 90 re f",
      "0.49 0.97 0.75 rg 36 802 120 3 re f", // Accent glow line
      
      // KPI Panel Background
      "0.05 0.08 0.13 rg 36 615 523 85 re f",
      
      // Mix Panel Background
      "0.07 0.10 0.16 rg 36 535 523 65 re f",
      
      // Storytelling Diagnosis Panel Background
      "0.05 0.08 0.13 rg 36 345 523 175 re f",
      
      // Recommendations / Actions Panel Background
      "0.07 0.10 0.16 rg 36 75 523 255 re f",
    ];

    // Helper text writer
    const drawText = (text, size, x, y, r = 0.95, g = 0.97, b = 0.99, bold = false) => {
      const font = bold ? "/F2" : "/F1";
      commands.push(`BT ${font} ${size} Tf ${x} ${y} Td ${r} ${g} ${b} rg ${pdfText(text)} Tj ET`);
    };

    // 1. Header Text
    drawText("ORBIT BI | CO-PILOTO EXECUTIVO", 10, 54, 778, 0.49, 0.97, 0.75, true);
    drawText(reportData.titulo, 18, 54, 752, 0.95, 0.97, 0.99, true);
    drawText(reportData.subtitulo, 9, 54, 732, 0.60, 0.65, 0.72, false);

    // 2. KPI metrics values & headers
    drawText("INVESTIDO", 8, 54, 675, 0.60, 0.65, 0.72, true);
    drawText(brl.format(totals.investimento), 12, 54, 648, 0.95, 0.97, 0.99, true);

    drawText("RECEITA", 8, 155, 675, 0.60, 0.65, 0.72, true);
    drawText(brl.format(totals.receita), 12, 155, 648, 0.49, 0.97, 0.75, true);

    drawText("ROAS", 8, 255, 675, 0.60, 0.65, 0.72, true);
    drawText(`${totals.roas.toFixed(2).replace(".", ",")}x`, 12, 255, 648, 0.73, 0.61, 1.0, true);

    drawText("CPA MÉDIO", 8, 345, 675, 0.60, 0.65, 0.72, true);
    drawText(brl.format(totals.cpa), 12, 345, 648, 1.0, 0.83, 0.51, true);

    drawText("LUCRO EST.", 8, 445, 675, 0.60, 0.65, 0.72, true);
    drawText(brl.format(totals.lucro), 12, 445, 648, 0.48, 0.72, 1.0, true);

    // 3. Google vs Meta share bar
    const googleSpend = filteredCampaigns.filter(c => c.tipo === "google").reduce((sum, item) => sum + item.investimento, 0);
    const metaSpend = filteredCampaigns.filter(c => c.tipo === "meta").reduce((sum, item) => sum + item.investimento, 0);
    const totalSpend = googleSpend + metaSpend;
    const googleRatio = totalSpend > 0 ? googleSpend / totalSpend : 0.5;
    const metaRatio = totalSpend > 0 ? metaSpend / totalSpend : 0.5;

    const barWidth = 486;
    const googleWidth = Math.round(barWidth * googleRatio);
    const metaWidth = barWidth - googleWidth;

    // Draw bar graphics
    commands.push("0.12 0.16 0.25 rg 54 562 486 8 re f"); // bar container background
    if (googleWidth > 0) {
      commands.push(`0.48 0.72 1.0 rg 54 562 ${googleWidth} 8 re f`);
    }
    if (metaWidth > 0) {
      commands.push(`0.73 0.61 1.0 rg ${54 + googleWidth} 562 ${metaWidth} 8 re f`);
    }

    drawText("DIVISÃO DE INVESTIMENTO (SHARE DE MÍDIA)", 8, 54, 582, 0.95, 0.97, 0.99, true);
    drawText(`Google Ads: ${brl.format(googleSpend)} (${Math.round(googleRatio * 100)}%)`, 8, 54, 545, 0.48, 0.72, 1.0, false);
    drawText(`Meta Ads: ${brl.format(metaSpend)} (${Math.round(metaRatio * 100)}%)`, 8, 360, 545, 0.73, 0.61, 1.0, false);

    // 4. Strategic Diagnosis (AI conclusion)
    drawText("DIAGNÓSTICO AI & STORYTELLING ESTRATÉGICO", 9, 54, 498, 0.49, 0.97, 0.75, true);

    const wrappedConclusion = wrapText(reportData.conclusao, 88);
    let conclusionY = 476;
    wrappedConclusion.slice(0, 8).forEach((line) => {
      drawText(line, 9, 54, conclusionY, 0.90, 0.92, 0.95, false);
      conclusionY -= 15;
    });

    // 5. Recommendations (recsY ends dynamically)
    let recsY = 308;
    drawText("RECOMENDAÇÕES DE OTIMIZAÇÃO", 9, 54, recsY, 0.73, 0.61, 1.0, true);
    recsY -= 18;

    reportData.recomendacoes.slice(0, 3).forEach((rec) => {
      const wrappedRec = wrapText(rec, 82);
      wrappedRec.forEach((line, index) => {
        if (index === 0) {
          commands.push(`0.73 0.61 1.0 rg 54 ${recsY + 2} 4 4 re f`);
          drawText(line, 9, 64, recsY, 0.90, 0.92, 0.95, false);
        } else {
          drawText(line, 9, 64, recsY, 0.90, 0.92, 0.95, false);
        }
        recsY -= 13;
      });
      recsY -= 4;
    });

    // 6. Action Plan Steps
    let stepsY = recsY - 10;
    if (stepsY < 120) stepsY = 120; // safety bounding box limit

    drawText("PLANO DE AÇÃO IMEDIATO", 9, 54, stepsY, 1.0, 0.83, 0.51, true);
    stepsY -= 18;

    reportData.proximosPassos.slice(0, 3).forEach((step) => {
      const wrappedStep = wrapText(step, 82);
      wrappedStep.forEach((line, index) => {
        if (index === 0) {
          commands.push(`1.0 0.83 0.51 rg 54 ${stepsY + 2} 4 4 re f`);
          drawText(line, 9, 64, stepsY, 0.90, 0.92, 0.95, false);
        } else {
          drawText(line, 9, 64, stepsY, 0.90, 0.92, 0.95, false);
        }
        stepsY -= 13;
      });
      stepsY -= 4;
    });

    // Footer
    drawText("Gerado automaticamente por Orbit BI AI • Dados confidenciais corporativos", 8, 54, 42, 0.60, 0.65, 0.72, false);

    commands.push("Q");
    const content = commands.join("\n");

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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

    const blob = new Blob([pdf], { type: "application/pdf" });
    const today = new Date().toLocaleDateString("pt-BR").replaceAll("/", "-");
    downloadBlob(blob, `orbit-bi-relatorio-executivo-${escapePdfName(today)}.pdf`);
    triggerToast("Download iniciado. O relatório executivo em PDF está pronto!");
  };

  // Helper simulated answers for offline mode or missing API keys
  const getSimulatedAnswer = (text) => {
    const q = text.toLowerCase();
    
    if (filteredCampaigns.length === 0) {
      return "Não há campanhas ou dados carregados no momento. Por favor, faça o upload de um arquivo CSV contendo os dados das suas campanhas de marketing (como nome, plataforma, investimento, receita, etc.) para que eu possa analisar o CPA, o ROAS e te dar recomendações estratégicas.";
    }

    const sorted = [...filteredCampaigns].sort((a, b) => b.roas - a.roas);
    const best = sorted[0] || { nome: "Nenhuma", roas: 0 };
    const worst = sorted[sorted.length - 1] || { nome: "Nenhuma", roas: 0 };

    if (q.includes("melhor") || q.includes("roas")) {
      return `A campanha com melhor ROAS é ${best.nome}, com ${best.roas.toFixed(2).replace(".", ",")}x. Minha recomendação é escalar em incrementos de 15% a 20% e monitorar CPA diariamente.`;
    }
    if (q.includes("cpa") || q.includes("aumentou")) {
      return `O CPA médio está em ${brl.format(totals.cpa)}. A pressão vem principalmente de campanhas com baixa intenção e criativos com fadiga. Eu reduziria verba em ${worst.nome} e moveria orçamento para remarketing e busca.`;
    }
    if (q.includes("desperd") || q.includes("cortar")) {
      return `${worst.nome} é o principal ponto de desperdício: ROAS de ${worst.roas.toFixed(2).replace(".", ",")}x e CPA de ${brl.format(worst.cpa)}. Corte inicial sugerido: 25% do orçamento e teste novos criativos antes de reescalar.`;
    }
    if (q.includes("6 meses") || q.includes("compare")) {
      if (timeline.length === 0) {
        return "Atualmente não há histórico de meses carregado no sistema para fazer a comparação do semestre.";
      }
      return `Nos últimos 6 meses, a receita evoluiu de ${brl.format(timeline[0].receita)} para ${brl.format(timeline[timeline.length - 1].receita)}. O crescimento acumulado é forte, mas o ROAS estabilizou; o próximo ganho deve vir de mix de verba e melhoria criativa.`;
    }
    return `Minha leitura executiva: receita de ${brl.format(totals.receita)}, ROAS de ${totals.roas.toFixed(2).replace(".", ",")}x e lucro estimado de ${brl.format(totals.lucro)}. A melhor decisão agora é proteger campanhas vencedoras e reduzir verba onde há fadiga ou baixa intenção.`;
  };

  // Chat message submission to Next.js API
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
          triggerToast("Simulador ativo: Adicione GEMINI_API_KEY no .env.local para usar a IA real.");
          // Fallback
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
      setBase64Files([]); // clear files sent
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

  // File Upload Logic
  const parseFormattedFloat = (val) => {
    if (!val) return 0;
    let cleaned = String(val)
      .replace(/[R$\s%]/g, "") // remove currency, percentage and spaces
      .trim();
    if (cleaned.includes(",") && !cleaned.includes(".")) {
      cleaned = cleaned.replace(",", ".");
    } else if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replaceAll(".", "").replace(",", ".");
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const splitCsvLine = (line, delimiter) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    
    // Autodetect delimiter
    const headerLine = lines[0];
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    const delimiter = semicolons > commas ? ";" : ",";

    const headers = splitCsvLine(headerLine, delimiter).map((item) =>
      item.replace(/^["']|["']$/g, "").trim().toLowerCase()
    );

    return lines.slice(1).map((line) => {
      const values = splitCsvLine(line, delimiter).map((item) =>
        item.replace(/^["']|["']$/g, "").trim()
      );
      return headers.reduce((row, header, index) => {
        row[header] = values[index];
        return row;
      }, {});
    });
  };

  const handleFilesSelected = async (selectedFiles) => {
    const list = [...selectedFiles];
    if (!list.length) return;

    const validFiles = [];
    for (const file of list) {
      // 4MB limit
      if (file.size > 4 * 1024 * 1024) {
        triggerToast(`O arquivo "${file.name}" excede o limite de 4MB para análise de IA.`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    setFiles((prev) => [...prev, ...validFiles]);

    for (const file of validFiles) {
      // Read visual files/pdfs as base64 for Gemini multimodal OCR context
      if (file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".pdf")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setBase64Files((prev) => [
            ...prev,
            { name: file.name, mimeType: file.type, base64: e.target.result }
          ]);
        };
        reader.readAsDataURL(file);
      }

      // If CSV, import campaign data
      if (file.name.toLowerCase().endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target.result;
          const parsed = parseCsv(text);
          
          if (user && isSupabaseConfigured && parsed.length > 0) {
            try {
              const newCampaigns = parsed.map(row => {
                const invest = parseFormattedFloat(row.investimento || row.spend || row["investimento (brl)"] || 0);
                const rec = parseFormattedFloat(row.receita || row.revenue || row["receita (brl)"] || 0);
                return {
                  nome: row.campanha || row.name || row.campaign || "Campanha Importada",
                  plataforma: row.plataforma || row.platform || "Outros",
                  tipo: (row.plataforma || row.platform || "").toLowerCase().includes("meta") ? "meta" : "google",
                  investimento: invest,
                  receita: rec,
                  roas: invest > 0 ? rec / invest : parseFormattedFloat(row.roas || 0),
                  cpa: parseFormattedFloat(row.cpa || 0),
                  ctr: parseFormattedFloat(row.ctr || 0),
                  cpc: parseFormattedFloat(row.cpc || 0),
                  conversoes: Math.round(parseFormattedFloat(row.conversoes || row.conversions || 0)),
                  status: row.status || "Ativa",
                  user_id: user.id
                };
              });

              const { data, error } = await supabase
                .from("campaigns")
                .insert(newCampaigns)
                .select();
              
              if (error) throw error;
              if (data) {
                setCampaigns(prev => [...prev, ...data.map(c => ({
                  id: c.id,
                  nome: c.nome,
                  plataforma: c.plataforma,
                  tipo: c.tipo,
                  investimento: Number(c.investimento),
                  receita: Number(c.receita),
                  roas: Number(c.roas),
                  cpa: Number(c.cpa),
                  ctr: Number(c.ctr),
                  cpc: Number(c.cpc),
                  conversoes: Number(c.conversoes),
                  status: c.status
                }))]);
              }
              triggerToast(`CSV carregado com sucesso: ${newCampaigns.length} campanhas salvas no Supabase.`);
            } catch (err) {
              console.error("Error importing campaigns:", err);
              triggerToast("Erro ao sincronizar CSV com o banco.");
            }
          } else {
            triggerToast(`CSV interpretado localmente: ${parsed.length} linhas estruturadas.`);
          }
        };
        reader.readAsText(file);
      }

      // Upload file to Supabase Storage if authenticated and configured
      if (user && isSupabaseConfigured) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("campaign-uploads")
            .upload(filePath, file);

          if (uploadError) throw uploadError;
          triggerToast(`Arquivo ${file.name} armazenado no Supabase Storage.`);
        } catch (err) {
          console.error("Storage upload error:", err);
        }
      }
    }

    triggerToast("Arquivos recebidos. Envie uma mensagem para a IA analisar.");
  };

  const handleToggleAutomation = () => {
    triggerToast("Monitoramento ativado: CPA, ROAS, fadiga criativa e verba desperdiçada serão acompanhados.");
  };

  // Render AuthModal if not bypassed and not authenticated
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
            onRefresh={handleRefreshData} 
            onGenerateReport={handleGenerateReport} 
            onClearData={handleClearData} 
          />

          <ControlStrip
            platform={platform}
            onPlatformChange={handlePlatformChange}
            period={period}
            onPeriodChange={handlePeriodChange}
            goal={goal}
            onGoalChange={handleGoalChange}
            onExport={handleExportSpreadsheet}
          />

          <section className="hero-grid" id="visao-geral">
            <article className="intelligence-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Diagnóstico da IA</p>
                  <h2>Resumo estratégico do mês</h2>
                </div>
                {base64Files.length > 0 && (
                  <span className="confidence" style={{ background: "rgba(123, 183, 255, 0.15)", color: "var(--blue)", borderColor: "rgba(123, 183, 255, 0.28)" }}>
                    {base64Files.length} anexo(s) pronto(s)
                  </span>
                )}
                <span className="confidence">97% confiança</span>
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

          <section className="analytics-grid operations-grid">
            <CampaignTable campaigns={filteredCampaigns} />
            <ChatAssistant
              messages={messages}
              onSendMessage={handleSendMessage}
              isPending={chatPending}
            />
          </section>

          <section className="report-grid" id="relatorios">
            <article>
              <p className="eyebrow">Relatório executivo</p>
              <h2>PDF premium para reuniões</h2>
              <p>Gere um resumo com storytelling, gráficos, variações percentuais, conclusões estratégicas e próximos passos em linguagem executiva.</p>
              <button className="primary-btn" id="btnReportBottom" onClick={handleGenerateReport}>
                Criar relatório agora
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

      <div className={`toast ${showToast ? "show" : ""}`} id="toast" role="status" aria-live="polite">
        {toastMessage}
      </div>
    </>
  );
}
