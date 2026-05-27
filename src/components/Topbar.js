"use client";

import { useTheme } from "@/lib/ThemeContext";

export default function Topbar({ onRefresh, onGenerateReport, onClearData }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <header className="topbar-premium">
      {/* ── Lado esquerdo: identidade ──────────────────────────────── */}
      <div className="topbar-left">
        <div className="topbar-badge">
          <span className="topbar-badge-dot" />
          Painel Executivo
        </div>

        <h1 className="topbar-title">
          <span className="topbar-title-highlight">Copiloto</span>
          {" "}de Performance
        </h1>

        <p className="topbar-subtitle">
          Google Ads &amp; Meta Ads — análise em tempo real com IA
        </p>

        {/* Pills de plataforma decorativas */}
        <div className="topbar-platforms">
          <span className="platform-pill google">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Ads
          </span>
          <span className="platform-pill meta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Meta Ads
          </span>
        </div>
      </div>

      {/* ── Lado direito: ações ────────────────────────────────────── */}
      <div className="topbar-actions-premium">
        <button
          className="action-btn action-btn--danger"
          id="btnClearData"
          onClick={onClearData}
          title="Limpar todos os dados importados"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
          <span>Limpar Dados</span>
        </button>

        <button
          className="action-btn action-btn--ghost"
          id="btnDemo"
          onClick={onRefresh}
          title="Sincronizar dados"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span>Atualizar</span>
        </button>

        <button
          className="action-btn action-btn--primary"
          id="btnReport"
          onClick={onGenerateReport}
          title="Gerar relatório executivo em PDF"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>Gerar PDF</span>
        </button>
      </div>
    </header>
  );
}
