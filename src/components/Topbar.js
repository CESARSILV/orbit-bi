"use client";

export default function Topbar({ onRefresh, onGenerateReport, onClearData }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Painel executivo</p>
        <h1>Copiloto de performance para Google Ads e Meta Ads</h1>
      </div>
      <div className="topbar-actions">
        <button className="danger-btn" id="btnClearData" onClick={onClearData}>
          Limpar Dados
        </button>
        <button className="ghost-btn" id="btnDemo" onClick={onRefresh}>
          Atualizar leitura
        </button>
        <button className="primary-btn" id="btnReport" onClick={onGenerateReport}>
          Gerar PDF executivo
        </button>
      </div>
    </header>
  );
}
