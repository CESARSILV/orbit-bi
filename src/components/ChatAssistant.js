"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatAssistant({ messages, onSendMessage, isPending }) {
  const [input, setInput] = useState("");
  const feedRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    onSendMessage(input.trim());
    setInput("");
  };

  // Scroll to bottom when messages list changes
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  return (
    <article className="assistant-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Assistente nativo</p>
          <h2>Analista IA</h2>
        </div>
      </div>
      <div className="chat-feed" ref={feedRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
        {isPending && (
          <div className="message ai" style={{ opacity: 0.6 }}>
            Digitando...
          </div>
        )}
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          type="text"
          placeholder="Pergunte em PT-BR sobre campanhas, períodos ou oportunidades..."
          disabled={isPending}
        />
        <button type="submit" disabled={isPending}>
          Enviar
        </button>
      </form>
    </article>
  );
}
