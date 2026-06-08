"use client";

import { useEffect, useRef, useState } from "react";

// Helper simples para formatar negritos e caixas de insights estratégicos na interface do Chat
function formatMessageText(text) {
  if (!text) return "";

  // Trata quebras de linha
  let lines = text.split("\n");
  
  return lines.map((line, i) => {
    // Detecta caixas de realce com palavras-chave [OPORTUNIDADE], [DESPERDÍCIO], [ALERTA/ATENÇÃO]
    let lower = line.toLowerCase();
    let isInsight = false;
    let className = "";
    let cleanLine = line;

    if (lower.startsWith("[oportunidade]") || lower.startsWith("oportunidade:")) {
      isInsight = true;
      className = "insight-box oportunidade";
      cleanLine = line.replace(/^\[oportunidade\]\s*/i, "").replace(/^oportunidade:\s*/i, "💡 OPORTUNIDADE: ");
    } else if (lower.startsWith("[desperdício]") || lower.startsWith("desperdício:") || lower.startsWith("[desperdicio]")) {
      isInsight = true;
      className = "insight-box desperdicio";
      cleanLine = line.replace(/^\[desperdício\]\s*/i, "").replace(/^\[desperdicio\]\s*/i, "").replace(/^desperdício:\s*/i, "⚠️ DESPERDÍCIO DE VERBA: ");
    } else if (lower.startsWith("[alerta]") || lower.startsWith("alerta:") || lower.startsWith("[atenção]") || lower.startsWith("atenção:")) {
      isInsight = true;
      className = "insight-box alerta";
      cleanLine = line.replace(/^\[alerta\]\s*/i, "").replace(/^\[atenção\]\s*/i, "").replace(/^alerta:\s*/i, "").replace(/^atenção:\s*/i, "⚡ ATENÇÃO / ALERTA: ");
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
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      return (
        <div key={i} style={{ paddingLeft: "12px", textIndent: "-12px", margin: "4px 0", color: "var(--text-secondary)" }}>
          • {renderedLine}
        </div>
      );
    }

    return (
      <p key={i} style={{ margin: "4px 0 8px", lineHeight: 1.5, color: "var(--text-secondary)" }}>
        {renderedLine}
      </p>
    );
  });
}

export default function ChatAssistant({ messages, onSendMessage, isPending }) {
  const [input, setInput] = useState("");
  const feedRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    onSendMessage(input.trim());
    setInput("");
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
      <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="eyebrow">Assistente nativo</p>
          <h2 style={{ margin: 0 }}>Copiloto de Insights IA</h2>
        </div>
        <span className="live-pill" style={{ background: "rgba(255,210,0,0.12)", color: "#ffd200", borderColor: "rgba(255,210,0,0.25)" }}>
          Online
        </span>
      </div>
      
      <div className="chat-feed" ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {/* Renderiza botão de copiar para mensagens da IA */}
            {msg.type === "ai" && (
              <button 
                className="copy-insight-btn"
                onClick={() => handleCopy(msg.text, index)}
                title="Copiar insight executivo"
              >
                {copiedIndex === index ? "✓ Copiado!" : "📋 Copiar"}
              </button>
            )}
            {formatMessageText(msg.text)}
          </div>
        ))}
        {isPending && (
          <div className="message ai" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>Analisando métricas...</span>
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit} style={{ padding: "12px", borderTop: "1px solid var(--border-soft)", display: "flex", gap: "8px", background: "rgba(5, 7, 13, 0.4)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          type="text"
          placeholder="Pergunte em PT-BR sobre CPA, leads, ROAS ou desperdícios..."
          disabled={isPending}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={isPending} className="action-btn action-btn--primary" style={{ padding: "0 16px" }}>
          Enviar
        </button>
      </form>
    </article>
  );
}
