import { NextResponse } from "next/server";

// =============================================================================
// DADOS MENSAIS DO CLARITY — AI VISIBILITY
// =============================================================================
// Estes dados são extraídos manualmente do painel Microsoft Clarity > Visibilidade de IA
// e armazenados aqui por mês. A API pública do Clarity (Data.Export) não fornece
// dados históricos de AI Visibility por período — apenas dados ao vivo (últimas 24h).
//
// Para adicionar um novo mês, basta copiar a estrutura e preencher com os dados
// do screenshot do Clarity para aquele período.
// =============================================================================

const MONTHLY_DATA = {
  // Julho 2025 — dados do screenshot (últimos 7 dias, filtro AI bots, Provider: WordPress)
  "2025-07": {
    totalRequests: 294,
    shareOfTotalTraffic: 13.21,
    uniquePagesRequested: 42.51,
    violations: 0,
    botOperators: [
      { name: "Meta", percentage: 30.27, sessions: 86 },
      { name: "Microsoft", percentage: 15.99, sessions: 57 },
      { name: "Huawei", percentage: 18.31, sessions: 48 },
      { name: "Google", percentage: 14.28, sessions: 42 },
      { name: "OpenAI", percentage: 11.23, sessions: 33 },
      { name: "Apple", percentage: 8.05, sessions: 25 },
    ],
    botActivities: [
      { name: "AI Crawler", percentage: 80.27, sessions: 236 },
      { name: "AI Assistant", percentage: 11.22, sessions: 33 },
      { name: "AI Search", percentage: 8.59, sessions: 25 },
    ],
    contentType: [
      { name: "HTML", percentage: 84.68, count: 249 },
      { name: "XML", percentage: 14.28, count: 42 },
      { name: "Other", percentage: 1.63, count: 3 },
    ],
    topPages: [
      { url: "https://www.doit.com.br/", percentage: 6.8, requests: 20 },
      { url: "https://www.doit.com.br/sitemap_index1/", percentage: 2.04, requests: 6 },
      { url: "https://www.doit.com.br/sitemap-pt/", percentage: 1.36, requests: 4 },
      { url: "https://www.doit.com.br/wp-sitemap.xml", percentage: 1.02, requests: 3 },
      { url: "https://www.doit.com.br/agendamento-testimonials-category-1.xml", percentage: 1.02, requests: 3 },
    ],
  },

  // Junho 2025 — dados anteriores (da primeira integração)
  "2025-06": {
    totalRequests: 312,
    shareOfTotalTraffic: 14.8,
    uniquePagesRequested: 38.2,
    violations: 0,
    botOperators: [
      { name: "Meta", percentage: 29.34, sessions: 92 },
      { name: "Huawei", percentage: 24.42, sessions: 76 },
      { name: "OpenAI", percentage: 23.30, sessions: 73 },
      { name: "Google", percentage: 11.99, sessions: 37 },
      { name: "Apple", percentage: 7.25, sessions: 23 },
      { name: "Anthropic", percentage: 1.90, sessions: 6 },
      { name: "Parallel", percentage: 1.81, sessions: 5 },
    ],
    botActivities: [
      { name: "AI Crawler", percentage: 65.83, sessions: 205 },
      { name: "AI Search", percentage: 21.40, sessions: 67 },
      { name: "AI Assistant", percentage: 12.77, sessions: 40 },
    ],
    contentType: [
      { name: "HTML", percentage: 82.05, count: 256 },
      { name: "XML", percentage: 15.38, count: 48 },
      { name: "Other", percentage: 2.57, count: 8 },
    ],
    topPages: [
      { url: "https://www.doit.com.br/", percentage: 7.1, requests: 22 },
      { url: "https://www.doit.com.br/sitemap_index1/", percentage: 2.24, requests: 7 },
      { url: "https://www.doit.com.br/sitemap-pt/", percentage: 1.60, requests: 5 },
    ],
  },
};

// =============================================================================
// ENDPOINT
// =============================================================================

export async function POST(request) {
  try {
    const { startDate, endDate } = await request.json();

    // Determinar o mês alvo a partir das datas do filtro
    let targetMonth = null;

    if (startDate) {
      // Extrai YYYY-MM da startDate (ex: "2025-07-01" → "2025-07")
      targetMonth = startDate.substring(0, 7);
    } else if (endDate) {
      targetMonth = endDate.substring(0, 7);
    }

    // Se não há filtro de data, usa o mês mais recente disponível
    if (!targetMonth) {
      const months = Object.keys(MONTHLY_DATA).sort().reverse();
      targetMonth = months[0] || null;
    }

    // Buscar dados do mês
    const monthData = targetMonth ? MONTHLY_DATA[targetMonth] : null;

    if (!monthData) {
      // Retorna lista de meses disponíveis para o frontend mostrar mensagem útil
      const availableMonths = Object.keys(MONTHLY_DATA).sort().reverse();
      return NextResponse.json({
        noData: true,
        targetMonth,
        availableMonths,
        message: `Dados de AI Visibility não disponíveis para ${targetMonth}`,
      });
    }

    return NextResponse.json({
      noData: false,
      targetMonth,
      ...monthData,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Erro interno" },
      { status: 500 }
    );
  }
}
