import { NextResponse } from "next/server";

// =============================================================================
// DADOS MENSAIS DO CLARITY — AI VISIBILITY (doit.com.br)
// =============================================================================
// Extraídos do painel Microsoft Clarity > Visibilidade de IA > período completo do mês.
// Para adicionar um novo mês: copie a estrutura e preencha com os dados do screenshot.
// =============================================================================

const MONTHLY_DATA = {
  // Junho 2026 (01/06 a 30/06) — dados reais do screenshot
  "2026-06": {
    totalRequests: 1235,
    shareOfTotalTraffic: 11.26,
    uniquePagesRequested: 31.97,
    violations: 0,
    botOperators: [
      { name: "Meta", percentage: 29.15, sessions: 360 },
      { name: "Huawei", percentage: 24.86, sessions: 307 },
      { name: "OpenAI", percentage: 23.32, sessions: 288 },
      { name: "Google", percentage: 11.34, sessions: 140 },
      { name: "Apple", percentage: 7.85, sessions: 97 },
      { name: "Anthropic", percentage: 1.78, sessions: 22 },
      { name: "Parallel", percentage: 1.70, sessions: 21 },
    ],
    botActivities: [
      { name: "AI Crawler", percentage: 65.43, sessions: 808 },
      { name: "AI Search", percentage: 21.94, sessions: 271 },
      { name: "AI Assistant", percentage: 12.63, sessions: 156 },
    ],
    contentType: [
      { name: "HTML", percentage: 82.35, count: 1017 },
      { name: "XML", percentage: 13.85, count: 171 },
      { name: "JSON", percentage: 3.48, count: 43 },
      { name: "Other", percentage: 0.32, count: 4 },
    ],
    topPages: [
      { url: "https://www.doit.com.br/", percentage: 9.72, requests: 120 },
      { url: "https://www.doit.com.br/robots.txt", percentage: 3.48, requests: 43 },
      { url: "https://www.doit.com.br/wp-json/oembed/1.0/embed", percentage: 2.27, requests: 28 },
      { url: "https://www.doit.com.br/orcamentos-irresistiveis-como-profissionalizar-sua-...", percentage: 1.46, requests: 18 },
      { url: "https://www.doit.com.br/sitemap.txt", percentage: 0.97, requests: 12 },
      { url: "https://www.doit.com.br/sitemap_index.xml", percentage: 0.97, requests: 12 },
      { url: "https://www.doit.com.br/tendencias-de-arquitetura-e-design-em-2025-o-que-...", percentage: 0.89, requests: 11 },
      { url: "https://www.doit.com.br/o-ano-da-primazia-a-arte-de-orquestrar-os-...", percentage: 0.89, requests: 11 },
      { url: "https://www.doit.com.br/sitemap.html", percentage: 0.89, requests: 11 },
      { url: "https://www.doit.com.br/estrategia-de-conteudo-para-arquitetos-como-atrair-...", percentage: 0.81, requests: 10 },
    ],
    statusSuccess: { percentage: 100, count: 1235 },
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
      targetMonth = startDate.substring(0, 7);
    } else if (endDate) {
      targetMonth = endDate.substring(0, 7);
    }

    // Se não há filtro, usa o mês mais recente
    if (!targetMonth) {
      const months = Object.keys(MONTHLY_DATA).sort().reverse();
      targetMonth = months[0] || null;
    }

    const monthData = targetMonth ? MONTHLY_DATA[targetMonth] : null;

    if (!monthData) {
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
