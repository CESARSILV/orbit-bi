import { NextResponse } from "next/server";
import { generateProviderText } from "@/lib/ai-providers";

// Helper to clean key
function cleanKey(value, placeholder) {
  if (!value || value === placeholder) return "";
  return value.trim();
}

export async function POST(request) {
  try {
    const { files } = await request.json();

    if (!files || !files.length) {
      return NextResponse.json({ error: "NO_FILES", message: "Nenhum arquivo enviado para processamento." }, { status: 400 });
    }

    const openaiKey = cleanKey(process.env.OPENAI_API_KEY, "your-openai-api-key");
    const geminiKey = cleanKey(process.env.GEMINI_API_KEY, "your-gemini-api-key");
    const isAiConfigured = !!(openaiKey || geminiKey);

    // If AI is configured, let's invoke Vision model to parse screenshots
    if (isAiConfigured) {
      const systemPrompt = `Você é o Orbit OCR & Vision AI, um pipeline de ingestão de dados e inteligência de marketing.
Sua missão é ler o conteúdo dos arquivos enviados (prints de dashboards, fotos, planilhas ou relatórios em PDF) e extrair os dados tabulares em formato JSON bruto estruturado.

Instruções cruciais de extração:
1. DETECTE AS TABELAS E MÉTRICAS: Extraia os nomes das campanhas, investimento/custo, cliques, impressões, conversões (compras/leads) e receita (valor de conversão).
2. IDENTIFIQUE A PLATAFORMA: Identifique se os dados são do Google Ads (por exemplo, termos como "CPC méd.", "Rede de pesquisa", "PMax", campanhas de pesquisa) ou Meta Ads (por exemplo, "Valor usado", "Alcance", "Cliques no link", "Resultados", "Orçamento", "Veiculação").
3. RECONSTRUA DASHBOARDS & EVITE DUPLICADOS: Se múltiplos prints forem do mesmo painel ou contiverem campanhas sobrepostas, agrupe e consolide os dados inteligencialmente, somando ou unificando para evitar registros duplicados.
4. PADRONIZE AS MÉTRICAS: Todas as métricas devem ser normalizadas para o esquema universal abaixo:
   - campaign_name: Nome da campanha (ex: "Pesquisa - Institucional")
   - spend: Valor investido (float em BRL)
   - clicks: Cliques (inteiro)
   - impressions: Impressões (inteiro)
   - conversions: Conversões / Resultados (inteiro)
   - revenue: Receita / Valor de Conversão (float em BRL)
   - status: Status da campanha (ex: "Ativo", "Pausado", "Qualificada")
   - date: Data no formato YYYY-MM-DD (se o print não especificar o dia, use o primeiro dia do mês de referência, ex: "2026-05-01")

Sua resposta deve ser estritamente um objeto JSON válido (com aspas duplas, sem formatação markdown, sem \`\`\`json, apenas o JSON puro) seguindo a estrutura abaixo:
{
  "platform": "google" ou "meta",
  "dataset_type": "campaign_performance" ou "meta_campaign_performance",
  "reference_month": "YYYY-MM",
  "reference_label": "Mês/Ano",
  "rows": [
    {
      "campaign_name": "Campanha Exemplo",
      "platform": "google",
      "dataset_type": "campaign_performance",
      "date": "2026-05-01",
      "spend": 1250.40,
      "clicks": 350,
      "impressions": 14200,
      "conversions": 18,
      "revenue": 3600.00,
      "ctr": 0.0246,
      "cpc": 3.57,
      "cpm": 88.05,
      "roas": 2.88,
      "status": "Ativo"
    }
  ]
}
`;

      const response = await generateProviderText({
        systemPrompt,
        userText: "Analise estes arquivos de marketing e extraia todos os dados de campanhas e métricas no formato JSON solicitado. Consolide e remova duplicados se houver múltiplos prints.",
        uploadedFiles: files,
        wantsJson: true
      });

      const replyText = response.text || "";
      let parsedData;
      try {
        parsedData = JSON.parse(replyText.trim());
      } catch (parseErr) {
        const cleanedText = replyText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleanedText);
      }

      return NextResponse.json({
        success: true,
        source: "ai_vision",
        provider: response.provider,
        data: parsedData
      });
    }

    // Fallback: AI is not configured. Run visual simulator based on filename
    const firstFile = files[0];
    const fileName = firstFile.name.toLowerCase();
    const platform = (fileName.includes("meta") || fileName.includes("facebook") || fileName.includes("instagram") || fileName.includes("fbad")) ? "meta" : "google";
    
    // Guess month
    let reference_month = "2026-05";
    const dateMatch = fileName.match(/(\d{4})[\.\-_](\d{2})/);
    if (dateMatch) {
      reference_month = `${dateMatch[1]}-${dateMatch[2]}`;
    }

    const MONTHS_PT = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const mIdx = parseInt(reference_month.split("-")[1], 10) - 1;
    const reference_label = `${MONTHS_PT[mIdx] || "Maio"}/${reference_month.split("-")[0]}`;

    // Generate simulated campaigns extracted via OCR
    const rows = [];
    if (platform === "meta") {
      const metaCampaigns = [
        { name: "Meta_Conversão_Lookalike_Compradores_OCR", spend: 3200, clicks: 640, impr: 48000, conv: 112, rev: 9600 },
        { name: "Meta_Remarketing_Carrinho_Abandonado_OCR", spend: 1100, clicks: 310, impr: 12000, conv: 45, rev: 3850 },
        { name: "Meta_CBO_Produtos_Semelhantes_OCR", spend: 2450, clicks: 490, impr: 39000, conv: 70, rev: 5900 },
        { name: "Meta_Tráfego_WhatsApp_Suporte_OCR", spend: 850, clicks: 425, impr: 18000, conv: 35, rev: 0 }
      ];

      metaCampaigns.forEach((c, idx) => {
        const spend = c.spend;
        const clicks = c.clicks;
        const impressions = c.impr;
        const conversions = c.conv;
        const revenue = c.rev;

        const ctr = impressions > 0 ? clicks / impressions : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        rows.push({
          campaign_name: c.name,
          platform: "meta",
          dataset_type: "meta_campaign_performance",
          date: `${reference_month}-01`,
          spend,
          clicks,
          impressions,
          conversions,
          revenue,
          ctr,
          cpc,
          cpm,
          roas,
          status: idx === 3 ? "Pausado" : "Ativo"
        });
      });
    } else {
      // Google Ads
      const googleCampaigns = [
        { name: "Google_Pesquisa_Marca_Institucional_OCR", spend: 1800, clicks: 900, impr: 9500, conv: 140, rev: 8400 },
        { name: "Google_PerformanceMax_Produtos_Gerais_OCR", spend: 4500, clicks: 1200, impr: 85000, conv: 180, rev: 17200 },
        { name: "Google_Search_Concorrentes_OCR", spend: 1200, clicks: 210, impr: 5200, conv: 14, rev: 950 },
        { name: "Google_Display_Remarketing_Dinâmico_OCR", spend: 750, clicks: 310, impr: 32000, conv: 22, rev: 1480 }
      ];

      googleCampaigns.forEach((c, idx) => {
        const spend = c.spend;
        const clicks = c.clicks;
        const impressions = c.impr;
        const conversions = c.conv;
        const revenue = c.rev;

        const ctr = impressions > 0 ? clicks / impressions : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        rows.push({
          campaign_name: c.name,
          platform: "google",
          dataset_type: "campaign_performance",
          date: `${reference_month}-01`,
          spend,
          clicks,
          impressions,
          conversions,
          revenue,
          ctr,
          cpc,
          cpm,
          roas,
          status: idx === 2 ? "Pausado" : "Ativo"
        });
      });
    }

    const simulatedResult = {
      platform,
      dataset_type: platform === "meta" ? "meta_campaign_performance" : "campaign_performance",
      reference_month,
      reference_label,
      rows
    };

    // Simulate network delay for realistic experience
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json({
      success: true,
      source: "simulation_ocr",
      data: simulatedResult
    });

  } catch (error) {
    console.error("API File Parser Error:", error);
    return NextResponse.json(
      { error: "PARSER_ERROR", message: error.message || "Erro ao processar e extrair dados do arquivo." },
      { status: 500 }
    );
  }
}
