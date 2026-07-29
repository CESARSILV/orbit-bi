import { NextResponse } from "next/server";

// =============================================================================
// DADOS MENSAIS DO CLARITY — AI VISIBILITY (doit.com.br)
// =============================================================================
// Extraídos do painel Microsoft Clarity > Visibilidade de IA > período completo do mês.
// Para adicionar um novo mês: copie a estrutura e preencha com os dados do screenshot.
// =============================================================================

const MONTHLY_DATA = {
  // Junho + Julho 2026 (01/06 a 29/07) — dados acumulados do Clarity AI Bot Activity
  // Fonte: Microsoft Clarity > Bot Activity > AI Bots > 06/01/2026 - 07/29/2026
  // Como o Clarity exporta o período completo sem separação mensal,
  // os mesmos dados são usados para ambos os meses.
  "2026-07": {
    totalRequests: 4052,
    shareOfTotalTraffic: 12.63,
    uniquePagesRequested: 29.29,
    violations: 0.79,
    botOperators: [
      { name: "Meta", percentage: 24.01, sessions: 973 },
      { name: "Huawei", percentage: 14.81, sessions: 600 },
      { name: "Google", percentage: 14.22, sessions: 576 },
      { name: "OpenAI", percentage: 12.69, sessions: 514 },
      { name: "Microsoft", percentage: 8.46, sessions: 343 },
      { name: "Apple", percentage: 8.24, sessions: 334 },
      { name: "Mistral AI", percentage: 4.37, sessions: 177 },
      { name: "Anthropic", percentage: 2.52, sessions: 102 },
      { name: "Parallel", percentage: 0.84, sessions: 34 },
    ],
    botActivities: [
      { name: "AI Crawler", percentage: 72.48, sessions: 2937 },
      { name: "AI Assistant", percentage: 15.67, sessions: 635 },
      { name: "AI Search", percentage: 11.85, sessions: 480 },
    ],
    contentType: [
      { name: "HTML", percentage: 88.15, count: 3572 },
      { name: "XML", percentage: 9.72, count: 394 },
      { name: "JSON", percentage: 2.02, count: 82 },
      { name: "Other", percentage: 0.10, count: 4 },
    ],
    topPages: [
      { url: "https://www.doit.com.br/", percentage: 7.13, requests: 289 },
      { url: "https://www.doit.com.br/robots.txt", percentage: 1.11, requests: 45 },
      { url: "https://www.doit.com.br/sitemap_index.xml", percentage: 1.01, requests: 41 },
      { url: "https://www.doit.com.br/news-sitemap.xml", percentage: 0.86, requests: 35 },
      { url: "https://www.doit.com.br/wp-json/oembed/1.0/embed", percentage: 0.77, requests: 31 },
      { url: "https://www.doit.com.br/sitemap.xml", percentage: 0.74, requests: 30 },
      { url: "https://www.doit.com.br/sitemap.txt", percentage: 0.72, requests: 29 },
      { url: "https://www.doit.com.br/tendencias-de-arquitetura-e-design-em-2025-o-que-...", percentage: 0.67, requests: 27 },
      { url: "https://www.doit.com.br/posicionamento-em-midias-sociais-para-escritorios-...", percentage: 0.59, requests: 24 },
      { url: "https://www.doit.com.br/estrategia-de-conteudo-para-arquitetos-como-atrair-...", percentage: 0.59, requests: 24 },
    ],
    scrapeToReferral: {
      average: "213 : 1",
      totalReferrals: 5,
      totalScrapes: 1065,
      operators: [
        { name: "OpenAI", ratio: "444 : 1", referrals: 1, scrapes: 444 },
        { name: "Google", ratio: "248 : 1", referrals: 2, scrapes: 495 },
        { name: "Anthropic", ratio: "67 : 1", referrals: 1, scrapes: 67 },
        { name: "Perplexity", ratio: "59 : 1", referrals: 1, scrapes: 59 },
      ],
    },
    statusSuccess: { percentage: 100, count: 4052 },
  },

  "2026-06": {
    totalRequests: 4052,
    shareOfTotalTraffic: 12.63,
    uniquePagesRequested: 29.29,
    violations: 0.79,
    botOperators: [
      { name: "Meta", percentage: 24.01, sessions: 973 },
      { name: "Huawei", percentage: 14.81, sessions: 600 },
      { name: "Google", percentage: 14.22, sessions: 576 },
      { name: "OpenAI", percentage: 12.69, sessions: 514 },
      { name: "Microsoft", percentage: 8.46, sessions: 343 },
      { name: "Apple", percentage: 8.24, sessions: 334 },
      { name: "Mistral AI", percentage: 4.37, sessions: 177 },
      { name: "Anthropic", percentage: 2.52, sessions: 102 },
      { name: "Parallel", percentage: 0.84, sessions: 34 },
    ],
    botActivities: [
      { name: "AI Crawler", percentage: 72.48, sessions: 2937 },
      { name: "AI Assistant", percentage: 15.67, sessions: 635 },
      { name: "AI Search", percentage: 11.85, sessions: 480 },
    ],
    contentType: [
      { name: "HTML", percentage: 88.15, count: 3572 },
      { name: "XML", percentage: 9.72, count: 394 },
      { name: "JSON", percentage: 2.02, count: 82 },
      { name: "Other", percentage: 0.10, count: 4 },
    ],
    topPages: [
      { url: "https://www.doit.com.br/", percentage: 7.13, requests: 289 },
      { url: "https://www.doit.com.br/robots.txt", percentage: 1.11, requests: 45 },
      { url: "https://www.doit.com.br/sitemap_index.xml", percentage: 1.01, requests: 41 },
      { url: "https://www.doit.com.br/news-sitemap.xml", percentage: 0.86, requests: 35 },
      { url: "https://www.doit.com.br/wp-json/oembed/1.0/embed", percentage: 0.77, requests: 31 },
      { url: "https://www.doit.com.br/sitemap.xml", percentage: 0.74, requests: 30 },
      { url: "https://www.doit.com.br/sitemap.txt", percentage: 0.72, requests: 29 },
      { url: "https://www.doit.com.br/tendencias-de-arquitetura-e-design-em-2025-o-que-...", percentage: 0.67, requests: 27 },
      { url: "https://www.doit.com.br/posicionamento-em-midias-sociais-para-escritorios-...", percentage: 0.59, requests: 24 },
      { url: "https://www.doit.com.br/estrategia-de-conteudo-para-arquitetos-como-atrair-...", percentage: 0.59, requests: 24 },
    ],
    scrapeToReferral: {
      average: "213 : 1",
      totalReferrals: 5,
      totalScrapes: 1065,
      operators: [
        { name: "OpenAI", ratio: "444 : 1", referrals: 1, scrapes: 444 },
        { name: "Google", ratio: "248 : 1", referrals: 2, scrapes: 495 },
        { name: "Anthropic", ratio: "67 : 1", referrals: 1, scrapes: 67 },
        { name: "Perplexity", ratio: "59 : 1", referrals: 1, scrapes: 59 },
      ],
    },
    statusSuccess: { percentage: 100, count: 4052 },
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
