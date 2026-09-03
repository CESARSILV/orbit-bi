import { NextResponse } from "next/server";
import { generateProviderText } from "@/lib/ai-providers";

export async function POST(request) {
  try {
    const { messages = [], campaigns = [], totals = {}, manualAdjustments = [], uploadedFiles } = await request.json();
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

    // Build context prompt
    const systemPrompt = `Você é o DOit AI, um analista executivo sênior de mídia paga e especialista em performance de Google Ads e Meta Ads.
Você analisa dados de marketing digital de forma ultra-estratégica, direta e profissional.

Resumo dos totais atuais:
- Investimento Total: ${brlFormat(totals.investimento)}
- CPA Médio: ${brlFormat(totals.cpa ?? totals.cac)}
- Total de Leads Qualificados: ${(totals.qualificados || 0).toLocaleString("pt-BR")}
- Total de Agendamentos: ${(totals.conversoes || 0).toLocaleString("pt-BR")}
- Total de Demos Realizadas: ${(totals.demos || 0).toLocaleString("pt-BR")}
- CPL Médio: ${brlFormat(totals.cpl)}
- CTR Médio: ${((totals.ctr || 0) * 100).toFixed(2).replace(".", ",")}%
${adjustmentContext}

Aqui estão os dados reais do painel atual do usuário (campanhas ativas):
${JSON.stringify(campaigns, null, 2)}

Instruções importantes:
1. Responda em português brasileiro (PT-BR) de forma objetiva e executiva.
2. Baseie suas análises em CPA, CPL, CTR, CPC e CPM estritamente nos dados fornecidos acima.
3. Se houver imagens ou planilhas enviadas, incorpore-as na análise.
4. Sugira ações práticas de otimização de orçamento baseadas em CPA e volume de agendados.
5. Quando houver ajuste manual, trate o total efetivo como a referência consolidada e deixe explícito que a distribuição por campanha permanece factual quando isso for relevante.`;

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
