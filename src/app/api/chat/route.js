import { NextResponse } from "next/server";
import { generateProviderText } from "@/lib/ai-providers";
import bingSeptemberSnapshot from "@/lib/bing-september-2026.json";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const {
      messages = [],
      campaigns = [],
      totals = {},
      appointmentBreakdown = {},
      platformsSummary = {},
      fullMonthlyHistory = [],
      manualAdjustments = [],
      uploadedFiles,
      period,
      startDate,
      endDate,
      aiVisibility,
      apiKey,
    } = await request.json();

    const appliedManualAdjustments = Array.isArray(manualAdjustments) ? manualAdjustments : [];

    // Helper for currency
    const brlFormat = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

    // Latest user message
    const latestUserMsg = [...messages].reverse().find((message) => message.type === "user")?.text || "";
    const adjustmentContext = appliedManualAdjustments.length > 0
      ? `\nForam aplicados ajustes de conferência humana aos totais consolidados: ${JSON.stringify(appliedManualAdjustments.map((adjustment) => ({
          indicador: adjustment.label,
          valorImportado: adjustment.baseValue,
          valorEfetivo: adjustment.effectiveValue,
        })))}. Esses valores são do total do recorte e não devem ser atribuídos artificialmente a campanhas ou meses.`
      : "";

    // Resolver contexto de Visibilidade de IA e Telemetria (Bing Webmaster / Microsoft Clarity)
    let aiData = aiVisibility;
    if (!aiData) {
      const target = (period && period !== "todos" ? period : (startDate ? startDate.substring(0, 7) : "2026-09"));
      if (target === "2026-09" || !period || period === "todos") {
        aiData = bingSeptemberSnapshot;
      }
    }

    let aiContext = "";
    if (aiData) {
      if (aiData.dataType === "bing-webmaster") {
        const { metrics = {}, health = {}, topQueries = [], targetMonth, siteUrl } = aiData;
        aiContext = `
Dados Reais de Rastreamento de IA & Busca Orgânica (Microsoft Bing Webmaster & Copilot):
- Mês de Referência: ${targetMonth || "Setembro/2026"} (Domínio: ${siteUrl || "http://www.doit.com.br/"})
- Páginas Rastreadas por Bots de IA / Bingbot: ${(metrics.totalCrawled || 0).toLocaleString("pt-BR")}
- Páginas Ativas no Índice Bing/Copilot: ${(metrics.inIndex || 0).toLocaleString("pt-BR")}
- Impressões na Pesquisa Orgânica/IA: ${(metrics.totalImpressions || 0).toLocaleString("pt-BR")}
- Cliques Orgânicos Recebidos: ${(metrics.totalClicks || 0).toLocaleString("pt-BR")}
- Taxa de Cliques (CTR) Média: ${(metrics.ctr || 0).toFixed(2).replace(".", ",")}%
- Saúde HTTP de Rastreamento: ${(health.code2xx || 0).toLocaleString("pt-BR")} requisições 2xx (sucesso), ${(health.code301 || 0).toLocaleString("pt-BR")} redirecionamentos 301, ${health.code4xx || 0} erros 4xx
- Bloqueios de Robots.txt: ${health.blockedRobots || 0} (rastreamento 100% livre e liberado para IA)
- Principais Consultas Ranqueadas no Bing:
${(topQueries || []).slice(0, 8).map(q => `  • "${q.query}": ${q.clicks} cliques, ${q.impressions} impressões, CTR ${(q.ctr || 0).toFixed(1)}%, posição média #${q.avgPosition}`).join("\n")}
`;
      } else if (aiData.dataType === "clarity-export") {
        const { citation = {}, overview = {}, targetMonth } = aiData;
        aiContext = `
Dados Reais de Visibilidade de IA & Citações (Microsoft Clarity):
- Mês de Referência: ${targetMonth || "Agosto/2026"}
- Share of Authority em Modelos de IA: ${(citation.shareOfAuthority || 0).toFixed(1)}%
- Citações de Páginas por Modelos de IA: ${citation.pageCitations || 0}
- Sessões Totais: ${(overview.sessions || 0).toLocaleString("pt-BR")} (sendo ${(overview.botSessions || 0).toLocaleString("pt-BR")} de robôs de IA)
- Consultas que Mais Citam o Domínio:
${(citation.groundingQueries || []).slice(0, 6).map(q => `  • "${q.query}": ${q.citations} citações (Share of Authority: ${(q.shareOfAuthority || 0).toFixed(1)}%)`).join("\n")}
`;
      }
    }

    const metaLeadsCount = platformsSummary.meta?.leads || totals.metaLeads || 0;
    const googleLeadsCount = platformsSummary.google?.leads || totals.googleLeads || 0;
    const demosGoogleCount = appointmentBreakdown.demosGoogle !== undefined ? appointmentBreakdown.demosGoogle : (totals.demosGoogle || 0);
    const demosMetaCount = appointmentBreakdown.demosMeta !== undefined ? appointmentBreakdown.demosMeta : (totals.demosMeta || 0);

    const monthlyHistoryRows = Array.isArray(fullMonthlyHistory) ? fullMonthlyHistory : [];
    const monthlyHistoryText = monthlyHistoryRows.length > 0
      ? monthlyHistoryRows.map((m) => {
          const mSpend = brlFormat(m.investimento || 0);
          const mCpa = (m.demos || 0) > 0 ? brlFormat((m.investimento || 0) / m.demos) : "R$ 0,00";
          const mCpl = (m.leads || 0) > 0 ? brlFormat((m.investimento || 0) / m.leads) : "R$ 0,00";
          return `• ${m.mes || m.reference_month}:
  - Demos Realizadas: ${m.demos || 0} (Google: ${m.demosGoogle || 0} | Meta: ${m.demosMeta || 0} | Outras: ${m.demosOutras || 0})
  - Agendamentos (DOitSA): ${m.conversoes || 0}
  - Leads Totais: ${m.leads || 0} (Meta: ${m.metaLeads || 0} | Google: ${m.googleLeads || 0})
  - Investimento: ${mSpend} | CPA por Demo Realizada: ${mCpa} | CPL: ${mCpl}`;
        }).join("\n\n")
      : "Histórico mensal não carregado ou sem registros.";

    // Build context prompt
    const systemPrompt = `Você é o DOit AI, o Copiloto Executivo de Inteligência de Marketing e Mídia Paga da DOit Sistemas.
Você foi treinado com o conhecimento completo da operação, incluindo Google Ads, Meta Ads (Instagram/Facebook), CRM Bitrix24 e DOitSA (agendamentos e demonstrações comerciais realizadas).
Sua postura é executiva, analítica, assertiva e orientada 100% a DADOS REAIS (estilo Senior Growth / Head de Performance & BI).

=== PRINCÍPIO FUNDAMENTAL (INVIOLÁVEL) ===
1. SEMPRE verifique os dados reais informados abaixo antes de formular qualquer resposta. NUNCA invente números, nunca use respostas genéricas de simulador e nunca responda com "depende" quando o dado exato estiver nas tabelas.
2. Você pode responder a QUALQUER pergunta sobre a operação, métricas, canais, campanhas, histórico ou comportamento de funil feita de qualquer forma pelo usuário.
3. Se perguntado sobre:
   - "Qual o melhor mês de demos realizadas?" (ou melhor mês em geral): Consulte a seção "HISTÓRICO MENSAL CONSOLIDADO", identifique o mês com maior número de demos realizadas, informe o mês e a quantidade exata, e compare com os demais meses.
   - "Quantos leads vieram da Meta?" ou "Quantos vieram do Google?": Informe os números exatos consolidados (ex: 135 leads na Meta no período).
   - "Por que tivemos 135 leads na Meta e apenas poucas demos/agendamentos?": Explique a realidade do funil: o Meta Ads atrai volume de topo e meio de funil com CPL baixo, mas sofre com no-show e exige nutrição e qualificação ativa; já o Google Ads atrai usuários em momento de busca ativa de software de gestão, convertendo proporcionalmente mais rápido em reunião comercial.
   - CPA, CPL, ROAS ou Alocação de Verba: Calcule e analise a eficiência de cada canal com base no custo por demo realizada.

=== HISTÓRICO MENSAL CONSOLIDADO (TODOS OS MESES REGISTRADOS NO SISTEMA) ===
${monthlyHistoryText}

=== RESUMO DO RECORTE ATUALMENTE SELECIONADO (${period || "Todos os períodos"}) ===
- Investimento Total: ${brlFormat(totals.investimento)}
- Total de Leads Captados: ${(totals.leads || 0).toLocaleString("pt-BR")}
  • Leads vindos do Meta Ads (Instagram/Facebook): ${metaLeadsCount.toLocaleString("pt-BR")}
  • Leads vindos do Google Ads: ${googleLeadsCount.toLocaleString("pt-BR")}
- Total de Leads Qualificados no CRM (Bitrix24): ${(totals.qualificados || 0).toLocaleString("pt-BR")}
- Total de Agendamentos (DOitSA): ${(totals.conversoes || 0).toLocaleString("pt-BR")} (Meta: ${appointmentBreakdown.meta || 0}, Google: ${appointmentBreakdown.google || 0}, Playbooks/Outras: ${appointmentBreakdown.playbooksOutras || 0})
- Demos Efetivamente Realizadas (DOitSA): ${(totals.demos || 0).toLocaleString("pt-BR")}
  • Demos Realizadas originárias do Google Ads: ${demosGoogleCount.toLocaleString("pt-BR")}
  • Demos Realizadas originárias do Meta Ads: ${demosMetaCount.toLocaleString("pt-BR")}
- CPA Médio (Custo por Demo Realizada de Marketing): ${brlFormat(totals.cpa ?? totals.cac)}
- CPL Médio: ${brlFormat(totals.cpl)}
- CTR Médio: ${((totals.ctr || 0) * 100).toFixed(2).replace(".", ",")}%
${adjustmentContext}

${aiContext}

=== CAMPANHAS ATIVAS NO RECORTE ATUAL (TOP 10) ===
${JSON.stringify((campaigns || []).slice(0, 10).map(c => ({
  nome: c.nome,
  plataforma: c.plataforma || c.tipo,
  investimento: c.investimento,
  conversoes: c.conversoes,
  cliques: c.cliques,
  roas: c.roas,
  cpa: c.cpa,
})), null, 2)}

Diretrizes de Formatação:
- Responda SEMPRE em português do Brasil (PT-BR).
- Use formatação Markdown elegante (negrito para números-chave, listas com marcadores para comparações).
- Quando couber, utilize tags como [DIAGNÓSTICO], [OPORTUNIDADE], [ALERTA] ou [ESCALA].
- Finalize com recomendações práticas para tomada de decisão em reuniões de diretoria.`;

    const result = await generateProviderText({
      systemPrompt,
      userText: latestUserMsg,
      uploadedFiles,
      overrideKey: apiKey ? { geminiKey: apiKey } : {},
    });

    return NextResponse.json({ reply: result.text, provider: result.provider });
  } catch (error) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { error: error.code || "AI_ERROR", message: error.message || "Erro de comunicação com a IA." },
      { status: error.code === "API_KEY_MISSING" ? 400 : 500 }
    );
  }
}
