import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function cleanKey(value, placeholder) {
  if (!value || value === placeholder) return "";
  return value.trim();
}

export function getAvailableProviders() {
  const openaiKey = cleanKey(process.env.OPENAI_API_KEY, "your-openai-api-key");
  const geminiKey = cleanKey(process.env.GEMINI_API_KEY, "your-gemini-api-key");
  const preferred = (process.env.AI_PROVIDER || "auto").toLowerCase();
  const providers = [];

  if (preferred === "openai" && openaiKey) providers.push("openai");
  if (preferred === "gemini" && geminiKey) providers.push("gemini");
  if (preferred === "auto" || providers.length === 0) {
    if (openaiKey) providers.push("openai");
    if (geminiKey) providers.push("gemini");
  }

  return {
    openaiKey,
    geminiKey,
    providers: [...new Set(providers)],
  };
}

function normalizeDataUrl(file) {
  const raw = file?.base64 || "";
  if (raw.startsWith("data:")) return raw;
  return `data:${file?.mimeType || "application/octet-stream"};base64,${raw}`;
}

function buildOpenAIInput(systemPrompt, userText, uploadedFiles = []) {
  const userContent = [{ type: "input_text", text: userText }];

  uploadedFiles.forEach((file) => {
    const mimeType = file.mimeType || "";
    if (mimeType.startsWith("image/")) {
      userContent.push({
        type: "input_image",
        image_url: normalizeDataUrl(file),
      });
      return;
    }

    userContent.push({
      type: "input_text",
      text: `Anexo recebido para contexto: ${file.name || "arquivo"} (${mimeType || "tipo não identificado"}).`,
    });
  });

  return [
    { role: "developer", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

function buildGeminiParts(systemPrompt, userText, uploadedFiles = []) {
  const parts = [{ text: `${systemPrompt}\n\nMensagem do usuário: "${userText}"` }];

  uploadedFiles.forEach((file) => {
    if (!file?.base64 || !file?.mimeType) return;
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.base64.split(",")[1] || file.base64,
      },
    });
  });

  return [{ role: "user", parts }];
}

async function callOpenAI({ apiKey, systemPrompt, userText, uploadedFiles }) {
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: DEFAULT_OPENAI_MODEL,
    input: buildOpenAIInput(systemPrompt, userText, uploadedFiles),
  });

  return response.output_text || "";
}

async function callGemini({ apiKey, systemPrompt, userText, uploadedFiles, wantsJson }) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    contents: buildGeminiParts(systemPrompt, userText, uploadedFiles),
    config: wantsJson ? { responseMimeType: "application/json" } : undefined,
  });

  return response.text || "";
}

export async function generateProviderText({ systemPrompt, userText, uploadedFiles = [], wantsJson = false }) {
  const { openaiKey, geminiKey, providers } = getAvailableProviders();
  const errors = [];

  for (const provider of providers) {
    try {
      const text =
        provider === "openai"
          ? await callOpenAI({ apiKey: openaiKey, systemPrompt, userText, uploadedFiles, wantsJson })
          : await callGemini({ apiKey: geminiKey, systemPrompt, userText, uploadedFiles, wantsJson });

      if (text?.trim()) {
        return { provider, text };
      }
      errors.push(`${provider}: resposta vazia`);
    } catch (error) {
      errors.push(`${provider}: ${error.message || "erro desconhecido"}`);
    }
  }

  const configured = providers.length > 0;
  const message = configured
    ? `Nenhum provedor de IA respondeu com sucesso. Detalhes: ${errors.join(" | ")}`
    : "Configure OPENAI_API_KEY ou GEMINI_API_KEY no .env.local para ativar IA real.";

  const error = new Error(message);
  error.code = configured ? "AI_PROVIDER_FAILED" : "API_KEY_MISSING";
  throw error;
}
