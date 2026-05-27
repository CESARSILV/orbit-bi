"use client";

import { useState } from "react";

export default function ControlStrip({
  platform, onPlatformChange,
  period, onPeriodChange,
  startDate, onStartDateChange,
  endDate, onEndDateChange,
  campaign, onCampaignChange,
  device, onDeviceChange,
  gender, onGenderChange,
  age, onAgeChange,
  network, onNetworkChange,
  keyword, onKeywordChange,
  searchTerm, onSearchTermChange,
  uniqueValues = {},
  onExport,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const monthsList      = uniqueValues.months      || [];
  const campaignsList   = uniqueValues.campaigns   || [];
  const devicesList     = uniqueValues.devices     || [];
  const gendersList     = uniqueValues.genders     || [];
  const agesList        = uniqueValues.ages        || [];
  const networksList    = uniqueValues.networks    || [];
  const keywordsList    = uniqueValues.keywords    || [];
  const searchTermsList = uniqueValues.searchTerms || [];

  // Conta filtros ativos (diferentes dos padrões)
  const activeCount = [
    platform !== "todas",
    period !== "todos",
    !!startDate,
    !!endDate,
    campaign !== "todas",
    device !== "todos",
    gender !== "todos",
    age !== "todas",
    network !== "todas",
    keyword !== "todas",
    searchTerm !== "todos",
  ].filter(Boolean).length;

  const resetAll = () => {
    onPlatformChange("todas");
    onPeriodChange("todos");
    onStartDateChange("");
    onEndDateChange("");
    onCampaignChange("todas");
    onDeviceChange("todos");
    onGenderChange("todos");
    onAgeChange("todas");
    onNetworkChange("todas");
    onKeywordChange("todas");
    onSearchTermChange("todos");
  };

  return (
    <section className="filter-shell" aria-label="Filtros avançados do painel">

      {/* ── Barra superior sempre visível ────────────────────────── */}
      <div className="filter-toprow">
        <div className="filter-toprow-left">
          <span className="filter-icon">⚙</span>
          <span className="filter-label-main">Filtros</span>
          {activeCount > 0 && (
            <span className="filter-badge">{activeCount} ativo{activeCount > 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="filter-toprow-right">
          {activeCount > 0 && (
            <button className="filter-reset-btn" onClick={resetAll} title="Limpar todos os filtros">
              ✕ Limpar tudo
            </button>
          )}
          <button
            className="filter-expand-btn"
            onClick={() => setIsExpanded(v => !v)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "▲ Recolher" : "▼ Expandir filtros"}
          </button>
          <button className="filter-export-btn" onClick={onExport} title="Exportar CSV">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* ── Linha de filtros principais (sempre visível) ──────────── */}
      <div className="filter-primary-row">
        <label className="filter-chip-label">
          <span className="fchip-icon">🌐</span>
          <span className="fchip-name">Plataforma</span>
          <select id="platformFilter" value={platform} onChange={e => onPlatformChange(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="google">Google Ads</option>
            <option value="meta">Meta Ads</option>
          </select>
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">📅</span>
          <span className="fchip-name">Mês rápido</span>
          <select
            id="periodFilter"
            value={period}
            onChange={e => {
              const val = e.target.value;
              onPeriodChange(val);
              if (val === "todos") resetAll();
            }}
          >
            <option value="todos">Todos os meses</option>
            {monthsList.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">◀</span>
          <span className="fchip-name">Data inicial</span>
          <input id="startDateFilter" type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} />
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">▶</span>
          <span className="fchip-name">Data final</span>
          <input id="endDateFilter" type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)} />
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">📢</span>
          <span className="fchip-name">Campanha</span>
          <select id="campaignFilter" value={campaign} onChange={e => onCampaignChange(e.target.value)}>
            <option value="todas">Todas</option>
            {campaignsList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {/* ── Filtros avançados (colapsáveis) ──────────────────────── */}
      <div className={`filter-advanced-row ${isExpanded ? "filter-advanced-row--open" : ""}`}>
        <label className="filter-chip-label">
          <span className="fchip-icon">📱</span>
          <span className="fchip-name">Dispositivo</span>
          <select id="deviceFilter" value={device} onChange={e => onDeviceChange(e.target.value)}>
            <option value="todos">Todos</option>
            {devicesList.map(d => (
              <option key={d} value={d}>
                {d === "mobile" ? "Celular" : d === "desktop" ? "Computador" : d}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">👥</span>
          <span className="fchip-name">Sexo / Gênero</span>
          <select id="genderFilter" value={gender} onChange={e => onGenderChange(e.target.value)}>
            <option value="todos">Todos</option>
            {gendersList.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">🎯</span>
          <span className="fchip-name">Faixa Etária</span>
          <select id="ageFilter" value={age} onChange={e => onAgeChange(e.target.value)}>
            <option value="todas">Todas</option>
            {agesList.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">🔗</span>
          <span className="fchip-name">Rede</span>
          <select id="networkFilter" value={network} onChange={e => onNetworkChange(e.target.value)}>
            <option value="todas">Todas</option>
            {networksList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">🔑</span>
          <span className="fchip-name">Palavra-chave</span>
          <select id="keywordFilter" value={keyword} onChange={e => onKeywordChange(e.target.value)}>
            <option value="todas">Todas</option>
            {keywordsList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>

        <label className="filter-chip-label">
          <span className="fchip-icon">🔍</span>
          <span className="fchip-name">Termo Pesquisado</span>
          <select id="searchTermFilter" value={searchTerm} onChange={e => onSearchTermChange(e.target.value)}>
            <option value="todos">Todos</option>
            {searchTermsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

    </section>
  );
}
