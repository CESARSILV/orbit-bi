"use client";

export default function ControlStrip({
  platform,
  onPlatformChange,
  period,
  onPeriodChange,
  campaign,
  onCampaignChange,
  device,
  onDeviceChange,
  gender,
  onGenderChange,
  age,
  onAgeChange,
  network,
  onNetworkChange,
  keyword,
  onKeywordChange,
  searchTerm,
  onSearchTermChange,
  uniqueValues = {},
  onExport,
}) {
  const monthsList = uniqueValues.months || [];
  const campaignsList = uniqueValues.campaigns || [];
  const devicesList = uniqueValues.devices || [];
  const gendersList = uniqueValues.genders || [];
  const agesList = uniqueValues.ages || [];
  const networksList = uniqueValues.networks || [];
  const keywordsList = uniqueValues.keywords || [];
  const searchTermsList = uniqueValues.searchTerms || [];

  return (
    <section className="control-strip-advanced" aria-label="Filtros avançados do painel">
      <div className="filters-grid">
        {/* Platform */}
        <label className="filter-item">
          Plataforma
          <select
            id="platformFilter"
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value)}
          >
            <option value="todas">Todas</option>
            <option value="google">Google Ads</option>
            <option value="meta">Meta Ads</option>
          </select>
        </label>

        {/* Reference Month / Period */}
        <label className="filter-item">
          Mês de Referência
          <select
            id="periodFilter"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
          >
            <option value="todos">Todos os Meses</option>
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {/* Campaign */}
        <label className="filter-item">
          Campanha
          <select
            id="campaignFilter"
            value={campaign}
            onChange={(e) => onCampaignChange(e.target.value)}
          >
            <option value="todas">Todas</option>
            {campaignsList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {/* Device */}
        <label className="filter-item">
          Dispositivo
          <select
            id="deviceFilter"
            value={device}
            onChange={(e) => onDeviceChange(e.target.value)}
          >
            <option value="todos">Todos</option>
            {devicesList.map((d) => (
              <option key={d} value={d}>
                {d === "mobile" ? "Celular" : d === "desktop" ? "Computador" : d}
              </option>
            ))}
          </select>
        </label>

        {/* Gender */}
        <label className="filter-item">
          Sexo / Gênero
          <select
            id="genderFilter"
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
          >
            <option value="todos">Todos</option>
            {gendersList.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        {/* Age Range */}
        <label className="filter-item">
          Faixa Etária
          <select
            id="ageFilter"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
          >
            <option value="todas">Todas</option>
            {agesList.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {/* Network */}
        <label className="filter-item">
          Rede
          <select
            id="networkFilter"
            value={network}
            onChange={(e) => onNetworkChange(e.target.value)}
          >
            <option value="todas">Todas</option>
            {networksList.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {/* Keyword */}
        <label className="filter-item">
          Palavra-chave
          <select
            id="keywordFilter"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
          >
            <option value="todas">Todas</option>
            {keywordsList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        {/* Search Term */}
        <label className="filter-item">
          Termo Pesquisado
          <select
            id="searchTermFilter"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          >
            <option value="todos">Todos</option>
            {searchTermsList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-actions">
        <button
          className="icon-btn-advanced"
          id="btnExport"
          title="Exportar base consolidada de marketing"
          onClick={onExport}
        >
          ⇩ Exportar CSV
        </button>
      </div>
    </section>
  );
}
