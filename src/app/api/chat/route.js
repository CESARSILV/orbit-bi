import { NextResponse } from "next/server";
import { generateProviderText } from "@/lib/ai-providers";
import bingSeptemberSnapshot from "@/lib/bing-september-2026.json";

export async function POST(request) {
  try {
    const {
      messages = [],
      campaigns = [],
      totals = {},
      manualAdjustments = [],
      uploadedFiles,
      period,
      startDate,
      aiVisibility,
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

    // Build context prompt
    const systemPrompt = `Você é o DOit AI, o Copiloto Executivo de Inteligência de Marketing e Mídia Paga da DOit Sistemas.
Você analisa performance de Google Ads, Meta Ads e dados de Visibilidade de IA (Bing Webmaster / Microsoft Clarity).
Sua postura é executiva, analítica, assertiva e orientada a dados (estilo Senior Growth / Head of Performance).

Resumo dos totais atuais de mídia paga:
- Investimento Total: ${brlFormat(totals.investimento)}
- CPA Médio (Custo por Demo Realizada do Marketing Google + Meta): ${brlFormat(totals.cpa ?? totals.cac)}
- Total de Leads Qualificados: ${(totals.qualificados || 0).toLocaleString("pt-BR")}
- Total de Agendamentos: ${(totals.conversoes || 0).toLocaleString("pt-BR")}
- Total de Demos Realizadas de Marketing (Google + Meta): ${(totals.marketingDemos || totals.demos || 0).toLocaleString("pt-BR")}
- Total Geral de Demos Realizadas: ${(totals.demos || 0).toLocaleString("pt-BR")}
- CPL Médio: ${brlFormat(totals.cpl)}
- CTR Médio: ${((totals.ctr || 0) * 100).toFixed(2).replace(".", ",")}%
${adjustmentContext}

${aiContext}

Aqui estão os dados reais das campanhas ativas do usuário:
${JSON.stringify(campaigns, null, 2)}

Diretrizes de Resposta:
1. Responda SEMPRE em português do Brasil (PT-BR) de forma objetiva, estruturada e executiva.
2. Utilize tags de diagnóstico no início das recomendações para facilitar leitura visual rápida:
   - [OPORTUNIDADE] para onde podemos ganhar eficiência ou novos leads
   - [ESCALA] para campanhas/canais com ROAS e CPA saudáveis prontos para orçamento maior
   - [DESPERDÍCIO] para conjuntos com custo alto e pouca ou nenhuma conversão
   - [ALERTA] para desvios de métricas, erros de rastreamento ou CTR em queda
3. Ao responder sobre presença orgânica, indexação ou robôs de IA, mencione especificamente os dados do Bing Webmaster (ex: páginas rastreadas pelo Bingbot/Copilot, impressões, cliques e consultas ranqueadas) ou do Clarity.
4. Quando perguntado sobre orçamento, sugira redistribuições práticas baseadas no CPA de cada campanha.
5. Se houver ajustes manuais, respeite o total consolidado.`;

    const result = await generateProviderText({
      systemPrompt,
      userText: latestUserMsg,
      uploadedFiles,
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
