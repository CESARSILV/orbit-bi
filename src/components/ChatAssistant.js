"use client";

import { useEffect, useRef, useState, useMemo } from "react";

const PROMPT_CATEGORIES = [
  { id: "todos", label: "Destaques" },
  { id: "midia", label: "Mídia & Escala" },
  { id: "ia", label: "Visibilidade IA" },
  { id: "diagnostico", label: "Diagnósticos" },
];

const ALL_PROMPTS = [
  { cat: "ia", icon: "🤖", label: "Visibilidade & Rastreamento IA", prompt: "Como está nossa visibilidade e o rastreamento dos bots de IA no Bing/Copilot?" },
  { cat: "midia", icon: "⚠️", label: "Onde cortar desperdício?", prompt: "Onde estamos perdendo verba ou com fadiga criativa?" },
  { cat: "midia", icon: "🚀", label: "Qual campanha escalar?", prompt: "Qual campanha tem melhor desempenho para escalar orçamento?" },
  { cat: "diagnostico", icon: "🎯", label: "Diagnóstico CPA & CPL", prompt: "Faça um diagnóstico do CPA e CPL consolidados do período." },
  { cat: "ia", icon: "🔍", label: "Top buscas no Bing", prompt: "Quais são as principais buscas e termos que geraram cliques no Bing?" },
  { cat: "ia", icon: "🩺", label: "Saúde HTTP & Robots.txt", prompt: "Como está a saúde técnica do rastreamento (status 2xx, 301, 4xx) e robots.txt?" },
  { cat: "midia", icon: "⚖️", label: "Google Ads vs Meta Ads", prompt: "Compare o desempenho e retorno entre Google Ads e Meta Ads." },
  { cat: "diagnostico", icon: "📋", label: "Resumo Executivo para Reunião", prompt: "Gere um resumo executivo com os 3 principais pontos de atenção para reunião de diretoria." },
];

const THINKING_STEPS = [
  "🔍 Cruzando métricas de Google Ads & Meta Ads...",
  "📊 Avaliando CPA, CPL, ROAS e taxas de conversão...",
  "🤖 Consultando telemetria de IA e rastreamento do Bingbot...",
  "💡 Sintetizando recomendações executivas e alavancas de escala...",
];

// Helper para formatar negritos e caixas de insights estratégicos na interface do Chat
function formatMessageText(text) {
  if (!text) return "";

  const lines = text.split("\n");
  
  return lines.map((line, i) => {
    const lower = line.toLowerCase();
    let isInsight = false;
    let className = "";
    let cleanLine = line;

    if (lower.startsWith("[oportunidade]") || lower.startsWith("oportunidade:")) {
      isInsight = true;
      className = "insight-box oportunidade";
      cleanLine = line.replace(/^\[oportunidade\]\s*/i, "").replace(/^oportunidade:\s*/i, "💡 OPORTUNIDADE: ");
    } else if (lower.startsWith("[escala]") || lower.startsWith("escala:")) {
      isInsight = true;
      className = "insight-box escala";
      cleanLine = line.replace(/^\[escala\]\s*/i, "").replace(/^escala:\s*/i, "🚀 ESCALA RECOMENDADA: ");
    } else if (lower.startsWith("[desperdício]") || lower.startsWith("desperdício:") || lower.startsWith("[desperdicio]")) {
      isInsight = true;
      className = "insight-box desperdicio";
      cleanLine = line.replace(/^\[desperdício\]\s*/i, "").replace(/^\[desperdicio\]\s*/i, "").replace(/^desperdício:\s*/i, "⚠️ DESPERDÍCIO DE VERBA: ");
    } else if (lower.startsWith("[alerta]") || lower.startsWith("alerta:") || lower.startsWith("[atenção]") || lower.startsWith("atenção:")) {
      isInsight = true;
      className = "insight-box alerta";
      cleanLine = line.replace(/^\[alerta\]\s*/i, "").replace(/^\[atenção\]\s*/i, "").replace(/^alerta:\s*/i, "").replace(/^atenção:\s*/i, "⚡ ATENÇÃO / ALERTA: ");
    } else if (lower.startsWith("[diagnóstico ia]") || lower.startsWith("[diagnostico ia]")) {
      isInsight = true;
      className = "insight-box diagnostico-ia";
      cleanLine = line.replace(/^\[diagn[oó]stico ia\]\s*/i, "🤖 DIAGNÓSTICO IA & RASTREAMENTO: ");
    }

    // Processa **negritos**
    const parts = cleanLine.split(/\*\*([^*]+)\*\*/g);
    const renderedLine = parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ fontWeight: 800, color: "var(--text-primary)" }}>{part}</strong>;
      }
      return part;
    });

    if (isInsight) {
      return (
        <div key={i} className={className}>
          {renderedLine}
        </div>
      );
    }

    // Listas básicas
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim().startsWith("• ")) {
      return (
        <div key={i} style={{ paddingLeft: "14px", textIndent: "-10px", margin: "4px 0", color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.5 }}>
          • {renderedLine}
        </div>
      );
    }

    return (
      <p key={i} style={{ margin: "4px 0 8px", lineHeight: 1.55, color: "var(--text-secondary)", fontSize: "0.84rem" }}>
        {renderedLine}
      </p>
    );
  });
}

export default function ChatAssistant({
  messages,
  onSendMessage,
  isPending,
  activePeriodLabel,
  onClearMessages,
  onRegenerateLast,
}) {
  const [input, setInput] = useState("");
  const feedRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [thinkingStep, setThinkingStep] = useState(0);
  const [feedbackState, setFeedbackState] = useState({});

  // Alterna as etapas de raciocínio da IA enquanto pendente
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1800);
    return () => {
      clearInterval(interval);
      setThinkingStep(0);
    };
  }, [isPending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    onSendMessage(input.trim());
    setInput("");
  };

  // Dispara sugestão rápida ao clicar em um chip
  const handleQuickPrompt = (prompt) => {
    if (isPending) return;
    onSendMessage(prompt);
  };

  // Copia mensagem da IA para o clipboard
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // Exporta o bate-papo completo em formato de briefing executivo
  const handleExportChat = () => {
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    let text = `====================================================\n`;
    text += `DOit BI — RELATÓRIO DO COPILOTO DE INSIGHTS IA\n`;
    text += `Período Analisado: ${activePeriodLabel || "Todos os períodos"}\n`;
    text += `Data da Consulta: ${dateStr} às ${timeStr}\n`;
    text += `====================================================\n\n`;

    messages.forEach((m) => {
      if (m.type === "user") {
        text += `👤 PERGUNTA:\n${m.text}\n\n`;
      } else {
        text += `🤖 DIAGNÓSTICO DO COPILOTO IA:\n${m.text}\n\n`;
        text += `----------------------------------------------------\n\n`;
      }
    });

    navigator.clipboard.writeText(text).then(() => {
      setIsCopiedAll(true);
      setTimeout(() => setIsCopiedAll(false), 2500);
    });
  };

  const handleFeedback = (index, type) => {
    setFeedbackState((prev) => ({
      ...prev,
      [index]: prev[index] === type ? null : type,
    }));
  };

  // Filtra prompts de acordo com a aba de categoria
  const filteredPrompts = useMemo(() => {
    if (activeCategory === "todos") return ALL_PROMPTS.slice(0, 5);
    return ALL_PROMPTS.filter((p) => p.cat === activeCategory);
  }, [activeCategory]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  return (
    <article className="assistant-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "470px" }}>
      {/* Cabeçalho Executivo do Copiloto */}
      <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 10 }}>
        <div>
          <p className="eyebrow">Assistente nativo</p>
          <h2 style={{ margin: 0 }}>Copiloto de Insights IA</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {activePeriodLabel && (
            <span style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: 99,
              background: "var(--hover-bg, rgba(255,255,255,0.05))",
              border: "1px solid var(--border-soft, rgba(255,255,255,0.1))",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span>📅</span> {activePeriodLabel}
            </span>
          )}
          <span className="live-pill" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            Online
          </span>
          {messages.length > 1 && (
            <button
              onClick={handleExportChat}
              title="Copiar relatório completo da consulta para pauta de reunião"
              className="action-btn"
              style={{ padding: "3px 9px", fontSize: "0.68rem" }}
            >
              {isCopiedAll ? "✓ Copiado!" : "📄 Exportar"}
            </button>
          )}
          {onClearMessages && messages.length > 1 && (
            <button
              onClick={onClearMessages}
              title="Limpar histórico de conversa"
              className="action-btn"
              style={{ padding: "3px 8px", fontSize: "0.68rem", opacity: 0.75 }}
            >
              Limpar
            </button>
          )}
        </div>
      </div>
      
      {/* Feed de Mensagens */}
      <div className="chat-feed" ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`} style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, opacity: 0.75 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
                {msg.type === "ai" ? "🤖 DOit Copilot" : "👤 Você"}
              </span>
            </div>

            {/* Conteúdo formatado */}
            {formatMessageText(msg.text)}

            {/* Barra de Ações Rápidas por Resposta da IA */}
            {msg.type === "ai" && (
              <div className="message-actions">
                <button 
                  className="message-action-btn"
                  onClick={() => handleCopy(msg.text, index)}
                  title="Copiar resposta para pauta de reunião"
                >
                  {copiedIndex === index ? "✓ Copiado!" : "📋 Copiar"}
                </button>
                <button
                  className={`message-action-btn ${feedbackState[index] === "up" ? "active" : ""}`}
                  onClick={() => handleFeedback(index, "up")}
                  title="Insight útil para a gestão"
                >
                  👍 {feedbackState[index] === "up" ? "Útil" : ""}
                </button>
                <button
                  className={`message-action-btn ${feedbackState[index] === "down" ? "active" : ""}`}
                  onClick={() => handleFeedback(index, "down")}
                  title="Insight pouco relevante"
                >
                  👎
                </button>
                {index === messages.length - 1 && onRegenerateLast && !isPending && (
                  <button
                    className="message-action-btn"
                    onClick={onRegenerateLast}
                    title="Recalcular com análise mais aprofundada"
                    style={{ marginLeft: "auto" }}
                  >
                    🔄 Aprofundar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Indicador de Raciocínio em Etapas */}
        {isPending && (
          <div className="message ai">
            <div className="thinking-box">
              <div className="thinking-text">
                <span style={{ animation: "spin 2s linear infinite" }}>⚙️</span>
                <span>{THINKING_STEPS[thinkingStep]}</span>
              </div>
              <div className="thinking-bar-track">
                <div className="thinking-bar-fill" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Abas de Categorias de Perguntas */}
      <div className="prompt-category-tabs">
        {PROMPT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`prompt-category-tab ${activeCategory === cat.id ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Chips de Perguntas Rápidas Filtrados */}
      <div className="quick-prompt-chips">
        {filteredPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            className="quick-prompt-chip"
            onClick={() => handleQuickPrompt(qp.prompt)}
            disabled={isPending}
            title={qp.prompt}
          >
            <span>{qp.icon}</span>
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Formulário de Envio */}
      <form className="chat-form" onSubmit={handleSubmit} style={{ padding: "12px", borderTop: "1px solid var(--border-soft)", display: "flex", gap: "8px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          type="text"
          placeholder="Pergunte sobre CPA, leads, ROAS, Bingbot ou desperdícios..."
          disabled={isPending}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={isPending || !input.trim()} className="action-btn action-btn--primary" style={{ padding: "0 18px" }}>
          Enviar
        </button>
      </form>
    </article>
  );
}
