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
      const systemPrompt = `Você é o DOit OCR & Vision AI, um pipeline de ingestão de dados e inteligência de marketing.
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

    // Fallback: AI não configurada — retornar erro informativo
    return NextResponse.json({
      error: "AI_NOT_CONFIGURED",
      message: "Nenhuma chave de IA configurada. Configure OPENAI_API_KEY ou GEMINI_API_KEY nas variáveis de ambiente para ativar a extração inteligente de dados via Vision AI."
    }, { status: 422 });

  } catch (error) {
    console.error("API File Parser Error:", error);
    return NextResponse.json(
      { error: "PARSER_ERROR", message: error.message || "Erro ao processar e extrair dados do arquivo." },
      { status: 500 }
    );
  }
}
