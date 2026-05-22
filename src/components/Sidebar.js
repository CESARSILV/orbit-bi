"use client";

import { isSupabaseConfigured } from "@/lib/supabase";

export default function Sidebar({ activeSection, onSectionChange, user, onSignOut }) {
  const navItems = [
    { label: "Visão geral", section: "visao-geral" },
    { label: "Comparações", section: "comparacao" },
    { label: "Criativos", section: "criativos" },
    { label: "Relatórios", section: "relatorios" },
    { label: "Automações", section: "automacoes" },
  ];

  const handleNavClick = (section) => {
    onSectionChange(section);
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="brand">
        <div className="brand-mark">O</div>
        <div>
          <strong>Orbit BI</strong>
          <span>Inteligência de mídia paga</span>
        </div>
      </div>

      <nav className="nav-list" style={{ marginBottom: "20px" }}>
        {navItems.map((item) => (
          <button
            key={item.section}
            className={`nav-item ${activeSection === item.section ? "active" : ""}`}
            onClick={() => handleNavClick(item.section)}
          >
            {item.label}
          </button>
        ))}
        <a
          href="/apresentacao"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-item"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            marginTop: "16px",
            border: "1px dashed rgba(255, 255, 255, 0.2)",
            background: "rgba(123, 183, 255, 0.05)",
            color: "var(--blue)",
            justifyContent: "center",
            fontWeight: "600"
          }}
        >
          Apresentação e PDF
        </a>
      </nav>

      {/* Auth Info Footer inside Sidebar */}
      {isSupabaseConfigured && (user || onSignOut) && (
        <div className="user-profile-badge" style={{
          padding: "12px",
          borderRadius: "var(--radius)",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--line)",
          fontSize: "0.82rem",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "auto",
          marginBottom: "120px" // give room to status card
        }}>
          <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "var(--soft)" }}>
            👤 {user ? user.email : "Modo Visitante"}
          </div>
          {user && (
            <button 
              onClick={onSignOut}
              style={{
                background: "rgba(255, 125, 143, 0.15)",
                color: "var(--red)",
                border: "1px solid rgba(255, 125, 143, 0.3)",
                borderRadius: "var(--radius)",
                padding: "6px",
                width: "100%",
                fontSize: "0.76rem",
                fontWeight: "bold",
                textAlign: "center"
              }}
            >
              Desconectar
            </button>
          )}
        </div>
      )}

      <div className="sidebar-card">
        <span className="status-dot"></span>
        <p>IA multimodal pronta para analisar imagens e PDFs no chat, além de estruturar CSV, XLS e XLSX de Google Ads e Meta Ads.</p>
      </div>
    </aside>
  );
}
