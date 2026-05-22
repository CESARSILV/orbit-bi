import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { messages, campaigns, uploadedFiles } = await request.json();

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

    // Latest user message
    const latestUserMsg = [...messages].reverse().find(m => m.type === "user")?.text || "";

    // Build context prompt
    const systemPrompt = `Você é o Orbit AI, um analista executivo sênior de mídia paga e especialista em performance de Google Ads e Meta Ads.
Você analisa dados de marketing digital de forma ultra-estratégica, direta e profissional.

Aqui estão os dados reais do painel atual do usuário (campanhas ativas):
${JSON.stringify(campaigns, null, 2)}

Instruções importantes:
1. Responda em português brasileiro (PT-BR) de forma objetiva e executiva.
2. Baseie suas análises, ROAS, CPA e lucros estritamente nos dados fornecidos acima.
3. Se houver imagens ou planilhas enviadas, incorpore-as na análise.
4. Sugira ações práticas de otimização de orçamento (ex: transferir verba de campanhas de baixo ROAS para alto ROAS).`;

    // Map conversation and any attached files
    const contents = [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          { text: `Mensagem do usuário: "${latestUserMsg}"` }
        ]
      }
    ];

    // If there are uploaded files (base64 images/docs), add them to the contents
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        if (file.base64 && file.mimeType) {
          // Remove prefix like "data:image/png;base64," if present
          const base64Data = file.base64.split(",")[1] || file.base64;
          contents[0].parts.push({
            inlineData: {
              mimeType: file.mimeType,
              data: base64Data
            }
          });
        }
      });
    }

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const replyText = response.text || "Desculpe, não consegui formular uma resposta.";

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "GENAI_ERROR", message: error.message || "Erro de comunicação com a API do Gemini." },
      { status: 500 }
    );
  }
}
