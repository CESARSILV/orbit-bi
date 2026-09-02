import { NextResponse } from "next/server";

// =============================================================================
// DADOS MENSAIS DO CLARITY — AI VISIBILITY (doit.com.br)
// =============================================================================
// Extraídos do painel Microsoft Clarity > Visibilidade de IA > período completo do mês.
// Para adicionar um novo mês: copie a estrutura e preencha com os dados do screenshot.
// =============================================================================

const MONTHLY_DATA = {
  // Agosto 2026 — exportações manuais do Microsoft Clarity (Citation + Overview)
  "2026-08": {
    dataType: "clarity-export",
    periodLabel: "01/08/2026 a 31/08/2026",
    sourceLabel: "Exportação manual do Microsoft Clarity",
    citation: {
      shareOfAuthority: 23.36065573770492,
      pageCitations: 57,
      aiReferralTraffic: 0.20151133501259444,
      authority: [
        { label: "Você", percentage: 21.94, citations: 57 },
        { label: "Outros domínios", percentage: 78.06, citations: 197 },
      ],
      queryTypes: [
        { label: "Com marca", percentage: 44.44, citations: 12 },
        { label: "Sem marca", percentage: 20.74, citations: 45 },
      ],
      groundingQueries: [
        { query: "filmes de documentário sobre arquitetura", citations: 12, shareOfAuthority: 16.00 },
        { query: "lançamento contas a pagar doit", citations: 7, shareOfAuthority: 35.00 },
        { query: "áreas urbanas revitalizada", citations: 6, shareOfAuthority: 20.69 },
        { query: "design paramétrico", citations: 5, shareOfAuthority: 23.81 },
        { query: "como inserir 2 dias depois do inicio no project", citations: 4, shareOfAuthority: 8.89 },
        { query: "gestão de escritório de arquitetura app", citations: 3, shareOfAuthority: 17.65 },
      ],
      citedPages: [
        { url: "https://www.doit.com.br/", citations: 12 },
        { url: "https://www.doit.com.br/12-filmes-que-inspiram-arquitetura-cidades-e-criatividade/", citations: 12 },
        { url: "https://www.doit.com.br/como-tratar-lancamentos-recorrentes/", citations: 8 },
        { url: "https://www.doit.com.br/conheca-o-poder-da-reabilitacao-urbana-na-revitalizacao-das-cidades-transformando-espacos-abandonados/", citations: 6 },
        { url: "https://www.doit.com.br/design-parametrico-o-que-e-e-como-implementar-em-seus-projetos/", citations: 5 },
        { url: "https://www.doit.com.br/como-alterar-o-prazo-e-as-datas-de-inicio-e-fim-das-tarefas-do-projeto/", citations: 4 },
        { url: "https://www.doit.com.br/arquitetura-sensorial-projetando-para-todos-os-sentidos/", citations: 3 },
        { url: "https://www.doit.com.br/faz-sentido-usar-excel-em-2025-um-raio-x-da-rotina-nos-escritorios/", citations: 3 },
        { url: "https://www.doit.com.br/landing-page/", citations: 1 },
        { url: "https://www.doit.com.br/google-earth-para-arquitetos-em-2026-10-formas-de-usar-a-ferramenta-no-dia-a-dia-do-escritorio/", citations: 1 },
        { url: "https://www.doit.com.br/funcionalidades/", citations: 1 },
        { url: "https://www.doit.com.br/google-earth-para-arquitetos/", citations: 1 },
      ],
    },
    overview: {
      sessions: 1317,
      botSessions: 668,
      pagesPerSession: 1.79498861047836,
      averageScrollDepth: 51.45,
      activeTimeSeconds: 42,
      totalActiveTimeSeconds: 235,
      uniqueUsers: 1014,
      newUserSessions: 1018,
      returningUserSessions: 299,
      insights: [
        { label: "Cliques contínuos", sessions: 5, percentage: 0.38 },
        { label: "Clique inativo", sessions: 80, percentage: 6.07 },
        { label: "Rolagem excessiva", sessions: 0, percentage: 0 },
        { label: "Clique com o botão direito do mouse", sessions: 165, percentage: 12.53 },
      ],
      browsers: [
        { name: "Chrome", sessions: 916, percentage: 69.55 },
        { name: "ChromeMobile", sessions: 129, percentage: 9.79 },
        { name: "MobileSafari", sessions: 107, percentage: 8.12 },
        { name: "Edge", sessions: 75, percentage: 5.69 },
        { name: "Safari", sessions: 28, percentage: 2.13 },
        { name: "Opera", sessions: 24, percentage: 1.82 },
        { name: "GoogleApp", sessions: 18, percentage: 1.37 },
        { name: "Firefox", sessions: 14, percentage: 1.06 },
        { name: "Unknown", sessions: 2, percentage: 0.15 },
        { name: "SamsungInternet", sessions: 2, percentage: 0.15 },
        { name: "InstagramApp", sessions: 2, percentage: 0.15 },
      ],
      topPages: [
        { url: "https://www.doit.com.br/", sessions: 939 },
        { url: "https://www.doit.com.br/funcionalidades/", sessions: 168 },
        { url: "https://www.doit.com.br/landing-page/", sessions: 129 },
        { url: "https://www.doit.com.br/agenda/", sessions: 128 },
        { url: "https://www.doit.com.br/clientes/", sessions: 100 },
        { url: "https://www.doit.com.br/blog/", sessions: 52 },
        { url: "https://www.doit.com.br/parceiros/", sessions: 50 },
        { url: "https://www.doit.com.br/os-10-projetos-de-arquitetura-mais-iconicos-do-mundo/", sessions: 25 },
        { url: "https://www.doit.com.br/contato/", sessions: 20 },
        { url: "https://www.doit.com.br/ferramentas-de-gestao-de-projetos-para-escritorios-de-arquitetura/", sessions: 20 },
        { url: "https://www.doit.com.br/como-captar-clientes-de-alto-padrao-na-arquitetura-com-google-ads-e-meta-ads-em-2026/", sessions: 9 },
        { url: "https://www.doit.com.br/agentes-de-ia-para-escritorios-de-arquitetura-como-automatizar-a-gestao-sem-perder-o-controle/", sessions: 7 },
        { url: "https://www.doit.com.br/estrategia-de-conteudo-para-arquitetos-como-atrair-clientes-com-marketing-digital-e-inteligencia-artificial/", sessions: 5 },
        { url: "https://www.doit.com.br/mingroneiluminacao/", sessions: 5 },
        { url: "https://www.doit.com.br/design-parametrico-o-que-e-e-como-implementar-em-seus-projetos/", sessions: 4 },
        { url: "https://www.doit.com.br/google-earth-para-arquitetos/", sessions: 4 },
        { url: "https://www.doit.com.br/politica-de-privacidade/", sessions: 4 },
        { url: "https://www.doit.com.br/10-ferramentas-importantes-que-os-arquitetos-devem-ter/", sessions: 3 },
        { url: "https://www.doit.com.br/arquitetura-hospitalar-pos-pandemia-em-2025/", sessions: 3 },
        { url: "https://www.doit.com.br/arquitetura-para-longevidade-em-2025-projetando-para-a-geracao-100/", sessions: 3 },
        { url: "https://www.doit.com.br/blog/page/2/", sessions: 3 },
        { url: "https://www.doit.com.br/dificuldade-na-gestao-de-horas-trabalhadas-nos-projetos/", sessions: 3 },
        { url: "https://www.doit.com.br/ia-vai-substituir-arquitetos/", sessions: 3 },
        { url: "https://Electron", sessions: 2 },
        { url: "https://www.doit.com.br/10-tendencias-de-conteudo-para-arquitetos-e-designers-em-2026-como-atrair-mais-clientes-e-fortalecer-sua-marca/", sessions: 2 },
        { url: "https://www.doit.com.br/12-filmes-que-inspiram-arquitetura-cidades-e-criatividade/", sessions: 2 },
        { url: "https://www.doit.com.br/alteracao-de-escopo-projetos-arquitetura/", sessions: 2 },
        { url: "https://www.doit.com.br/blog/page/3/", sessions: 2 },
        { url: "https://www.doit.com.br/category/noticias/", sessions: 2 },
        { url: "https://www.doit.com.br/como-escolher-o-erp-ideal-para-escritorios-de-arquitetura/", sessions: 2 },
        { url: "https://www.doit.com.br/como-tratar-lancamentos-recorrentes/", sessions: 2 },
        { url: "https://www.doit.com.br/desvendando-a-magia-das-escadas-helicoidais-uma-jornada-pela-arquitetura-e-engenharia/", sessions: 2 },
        { url: "https://www.doit.com.br/o-papel-dos-erps-na-valorizacao-do-tempo-do-arquiteto/", sessions: 2 },
        { url: "https://www.doit.com.br/por-que-a-doit-e-a-melhor-ferramenta-em-2026-para-escritorios-de-arquitetura-urbanismo-e-design-de-interiores/", sessions: 2 },
        { url: "https://www.doit.com.br/sebraealagoas", sessions: 2 },
        { url: "https://www.doit.com.br/software-gestao-escritorios-arquitetura/", sessions: 2 },
        { url: "https://www.doit.com.br/timesheet-para-arquitetos-como-descobrir-seus-projetos-estao-dando-lucro-ou-prejuizo/", sessions: 2 },
        { url: "https://www.doit.com.br/xii-conere/blog/programacao", sessions: 2 },
        { url: "https://doit.com.br/", sessions: 1 },
        { url: "https://www.doit.com.br/10-aplicativos-uteis-para-escritorios-de-arquitetura/", sessions: 1 },
        { url: "https://www.doit.com.br/2023/04/07/10-aplicativos-uteis-para-escritorios-de-arquitetura/", sessions: 1 },
        { url: "https://www.doit.com.br/BLOG/", sessions: 1 },
        { url: "https://www.doit.com.br/a-importancia-do-planejamento-estrategico-em-projetos-arquitetonicos/", sessions: 1 },
        { url: "https://www.doit.com.br/a-revolucao-do-traco-como-a-inteligencia-artificial-esta-transformando-a-arquitetura/", sessions: 1 },
        { url: "https://www.doit.com.br/alteracao-de-escopo-em-projetos-de-arquitetura-quando-e-ajuste-nova-etapa-ou-aditivo/", sessions: 1 },
        { url: "https://www.doit.com.br/ao-na-academia-greenfit", sessions: 1 },
        { url: "https://www.doit.com.br/arquitetura-da-pausa-por-que-o-descanso-criativo-e-tao-importante-quanto-o-projeto/", sessions: 1 },
        { url: "https://www.doit.com.br/arquitetura-e-ergonomia-como-projetar-espacos-inteligentes-saudaveis-e-altamente-funcionais/", sessions: 1 },
      ],
      smartEvents: [
        { label: "Clique de saída", sessions: 25, percentage: 1.90 },
        { label: "Enviar formulário", sessions: 10, percentage: 0.76 },
        { label: "Entre em contato conosco", sessions: 1, percentage: 0.08 },
      ],
      referrers: [
        { name: "www.google.com", sessions: 578 },
        { name: "www.doit.com.br", sessions: 378 },
        { name: "sergiosantana.doit.com.br", sessions: 39 },
        { name: "www.bing.com", sessions: 29 },
        { name: "rodrigosobreiro.doit.com.br", sessions: 9 },
        { name: "com.google.android.googlequicksearchbox", sessions: 8 },
        { name: "gpskal.doit.com.br", sessions: 5 },
        { name: "br.search.yahoo.com", sessions: 4 },
        { name: "leilaazzouz.doit.com.br", sessions: 4 },
        { name: "magnomoreira.doit.com.br", sessions: 4 },
        { name: "mpg.doit.com.br", sessions: 4 },
        { name: "vivianegobbato.doit.com.br", sessions: 4 },
      ],
      channels: [
        { name: "OrganicSearch", label: "Busca orgânica", sessions: 493 },
        { name: "Other", label: "Outros", sessions: 412 },
        { name: "Direct", label: "Direto", sessions: 374 },
        { name: "Referral", label: "Referência", sessions: 150 },
        { name: "PaidSearch", label: "Busca paga", sessions: 144 },
        { name: "AIPlatform", label: "Plataforma de IA", sessions: 3 },
      ],
      campaigns: [
        { name: "Leads", sessions: 91 },
        { name: "demonstracao_doit_jul_26", sessions: 2 },
      ],
      sources: [
        { name: "Google", detail: "google", sessions: 597 },
        { name: "Direto", detail: "www.doit.com.br", sessions: 374 },
        { name: "sergiosantana.doit.com.br", detail: "", sessions: 39 },
        { name: "Bing", detail: "bing", sessions: 29 },
        { name: "rodrigosobreiro.doit.com.br", detail: "", sessions: 9 },
        { name: "ChatGPT", detail: "chatgpt.com", sessions: 6 },
        { name: "gpskal.doit.com.br", detail: "", sessions: 5 },
        { name: "Yahoo", detail: "yahoo", sessions: 4 },
        { name: "leilaazzouz.doit.com.br", detail: "", sessions: 4 },
        { name: "magnomoreira.doit.com.br", detail: "", sessions: 4 },
        { name: "mpg.doit.com.br", detail: "", sessions: 4 },
        { name: "vivianegobbato.doit.com.br", detail: "", sessions: 4 },
      ],
      javascriptErrors: { sessionsWithErrors: 1, totalErrors: 1, errorName: "script error.", percentage: 100 },
      performance: { score: 76.79310344827586, lcpSeconds: 5.349, inpMs: 184, cls: 0.0845 },
      googleAds: [
        { campaign: "[#06] PESQUISA- KWS ESPECIFICAS - NOVA LP", status: "ENABLED", sessions: 91, intent: "Média", highIntent: 4, mediumIntent: 73, lowIntent: 14 },
      ],
      botTypes: [
        { name: "webScraperBotSessions", label: "Web scraper", sessions: 50 },
        { name: "suspiciousDeviceBotSessions", label: "Dispositivo suspeito", sessions: 478 },
        { name: "suspiciousNetworkBotSessions", label: "Rede suspeita", sessions: 373 },
        { name: "suspiciousInteractionBotSessions", label: "Interação suspeita", sessions: 653 },
        { name: "ppcAdFraudBotSessions", label: "Fraude em anúncios PPC", sessions: 10 },
        { name: "otherBotsSessions", label: "Outros bots", sessions: 3 },
      ],
    },
  },

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
      updatedAt: monthData.dataType === "clarity-export" ? null : new Date().toISOString(),
      dataAsOf: monthData.dataType === "clarity-export" ? monthData.periodLabel : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Erro interno" },
      { status: 500 }
    );
  }
}
