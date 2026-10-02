import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const BUILTIN_GEMINI_KEY = Buffer.from("QVEuQWI4Uk42SUxXSmxIY1AyQjl6bHFXZzU3MlR6ZkZDWnNDU0hSOUp6RDZ1ckpDY1dDTGc=", "base64").toString("utf-8");

function cleanKey(value, placeholder) {
  if (!value || value === placeholder) return "";
  return value.trim();
}

function readKeyFromEnvFile(keyName) {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(new RegExp(`^${keyName}=(.*)$`, "m"));
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch (e) {
    // ignore
  }
  return "";
}

function resolveKey(envVal, keyName, placeholder) {
  let val = cleanKey(envVal, placeholder);
  if (!val) {
    val = cleanKey(readKeyFromEnvFile(keyName), placeholder);
  }
  if (!val && keyName === "GEMINI_API_KEY") {
    val = cleanKey(BUILTIN_GEMINI_KEY, placeholder);
  }
  return val;
}

export function getAvailableProviders(overrideKey = {}) {
  const openaiKey = cleanKey(overrideKey.openaiKey) || resolveKey(process.env.OPENAI_API_KEY, "OPENAI_API_KEY", "your-openai-api-key");
  const geminiKey = cleanKey(overrideKey.geminiKey) || resolveKey(process.env.GEMINI_API_KEY, "GEMINI_API_KEY", "your-gemini-api-key");
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

async function callOpenAI({ apiKey, systemPrompt, userText, uploadedFiles, wantsJson }) {
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: DEFAULT_OPENAI_MODEL,
    input: buildOpenAIInput(systemPrompt, userText, uploadedFiles),
    ...(wantsJson ? { text: { format: { type: "json_object" } } } : {}),
  });

  return response.output_text || "";
}

async function callGemini({ apiKey, systemPrompt, userText, uploadedFiles, wantsJson }) {
  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = [DEFAULT_GEMINI_MODEL, "gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
  const uniqueModels = [...new Set(modelsToTry)];
  let lastError = null;

  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildGeminiParts(systemPrompt, userText, uploadedFiles),
        config: wantsJson ? { responseMimeType: "application/json" } : undefined,
      });

      if (response?.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      // Se for erro de modelo não encontrado (404/NOT_FOUND), tenta o próximo da lista
      const isNotFound = err.status === 404 || String(err.message || "").includes("NOT_FOUND") || String(err.message || "").includes("no longer available");
      if (!isNotFound) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Falha ao comunicar com os modelos Gemini disponíveis.");
}

export async function generateProviderText({ systemPrompt, userText, uploadedFiles = [], wantsJson = false, overrideKey = {} }) {
  const { openaiKey, geminiKey, providers } = getAvailableProviders(overrideKey);
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
