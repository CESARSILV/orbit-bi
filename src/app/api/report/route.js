import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { campaigns, totals } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key") {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message: "A chave GEMINI_API_KEY não está configurada no arquivo .env.local. Adicione-a para ativar o analista de IA real.",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format BRL function for prompt context
    const brlFormat = (val) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val);

    const systemPrompt = `Você é o Orbit AI, um analista executivo sênior de mídia paga e especialista em performance de Google Ads e Meta Ads.
Você deve analisar o desempenho das campanhas e métricas fornecidas do usuário e produzir um diagnóstico estratégico executivo.

Aqui estão os dados reais do painel atual do usuário (campanhas ativas):
${JSON.stringify(campaigns, null, 2)}

Resumo dos totais atuais:
- Investimento Total: ${brlFormat(totals.investimento)}
- Receita Total: ${brlFormat(totals.receita)}
- ROAS Médio: ${totals.roas.toFixed(2)}x
- CPA Médio: ${brlFormat(totals.cpa)}
- Lucro Estimado: ${brlFormat(totals.lucro)}

Sua resposta deve ser estritamente um objeto JSON válido (com aspas duplas, sem formatação markdown, sem \`\`\`json, apenas o JSON puro) seguindo a estrutura abaixo:
{
  "titulo": "Relatório de Performance e Escala",
  "subtitulo": "Subtítulo estratégico de 1 linha conectando os dados a um insight",
  "conclusao": "Diagnóstico de alto nível de 1 parágrafo (máximo de 400 caracteres) explicando a eficiência geral e o ponto mais crítico a otimizar.",
  "recomendacoes": [
    "Recomendação prática de otimização 1 (ex: realocação de verba detalhando valores de campanhas reais)",
    "Recomendação prática de otimização 2 (ex: melhoria de criativo ou audiência baseada em dados reais)",
    "Recomendação prática de otimização 3 (ex: ajuste de lance ou CPA alvo de campanhas de baixo desempenho)"
  ],
  "proximosPassos": [
    "Passo prático imediato 1",
    "Passo prático imediato 2",
    "Passo prático imediato 3"
  ]
}
`;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const replyText = response.text || "";
    let data;
    try {
      data = JSON.parse(replyText.trim());
    } catch (parseErr) {
      // Clean up markdown block wraps if model ignored instructions
      const cleanedText = replyText.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleanedText);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Gemini API Report Error:", error);
    return NextResponse.json(
      { error: "GENAI_ERROR", message: error.message || "Erro de comunicação com a API do Gemini." },
      { status: 500 }
    );
  }
}
