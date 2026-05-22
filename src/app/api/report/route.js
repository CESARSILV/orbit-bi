import { NextResponse } from "next/server";
import { generateProviderText } from "@/lib/ai-providers";

export async function POST(request) {
  try {
    const { campaigns, totals } = await request.json();

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

    const response = await generateProviderText({
      systemPrompt,
      userText: "Gere o relatório executivo no formato JSON solicitado.",
      wantsJson: true,
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

    return NextResponse.json({ ...data, provider: response.provider });
  } catch (error) {
    console.error("AI Report Error:", error);
    return NextResponse.json(
      { error: error.code || "AI_ERROR", message: error.message || "Erro de comunicação com a IA." },
      { status: error.code === "API_KEY_MISSING" ? 400 : 500 }
    );
  }
}
