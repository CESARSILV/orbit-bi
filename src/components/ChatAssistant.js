"use client";

import { useEffect, useRef, useState } from "react";

const QUICK_PROMPTS = [
  { icon: "🤖", label: "Visibilidade & Rastreamento IA", prompt: "Como está nossa visibilidade e o rastreamento dos bots de IA no Bing/Copilot?" },
  { icon: "⚠️", label: "Onde cortar desperdício?", prompt: "Onde estamos perdendo verba ou com fadiga criativa?" },
  { icon: "🚀", label: "Qual campanha escalar?", prompt: "Qual campanha tem melhor desempenho para escalar orçamento?" },
  { icon: "🎯", label: "Diagnóstico CPA & CPL", prompt: "Faça um diagnóstico do CPA e CPL consolidados do período." },
  { icon: "🔍", label: "Top buscas no Bing", prompt: "Quais são as principais buscas e termos que geraram cliques no Bing?" },
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
}) {
  const [input, setInput] = useState("");
  const feedRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

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

  // Scroll to bottom when messages list changes
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  return (
    <article className="assistant-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "450px" }}>
      <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
      
      <div className="chat-feed" ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {/* Renderiza botão de copiar para mensagens da IA */}
            {msg.type === "ai" && (
              <button 
                className="copy-insight-btn"
                onClick={() => handleCopy(msg.text, index)}
                title="Copiar insight executivo para reunião"
              >
                {copiedIndex === index ? "✓ Copiado!" : "📋 Copiar"}
              </button>
            )}
            {formatMessageText(msg.text)}
          </div>
        ))}
        {isPending && (
          <div className="message ai" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>Analisando métricas de mídia &amp; IA...</span>
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Chips de Perguntas Rápidas Sugeridas */}
      <div className="quick-prompt-chips">
        {QUICK_PROMPTS.map((qp, idx) => (
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
