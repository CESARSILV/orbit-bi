"use client";

import { useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");

export default function SearchOperations({ keywordsData = [], searchTermsData = [] }) {
  const [activeTab, setActiveTab] = useState("keywords"); // "keywords" | "search_terms"

  const hasKeywords = keywordsData && keywordsData.length > 0;
  const hasSearchTerms = searchTermsData && searchTermsData.length > 0;

  // Process Keywords
  // Group and aggregate keywords if they are duplicated in different campaigns
  const groupedKeywords = {};
  keywordsData.forEach(k => {
    const name = k.keyword;
    if (!name) return;
    if (!groupedKeywords[name]) {
      groupedKeywords[name] = { keyword: name, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
    }
    groupedKeywords[name].spend += k.spend || 0;
    groupedKeywords[name].clicks += k.clicks || 0;
    groupedKeywords[name].impressions += k.impressions || 0;
    groupedKeywords[name].conversions += k.conversions || 0;
  });

  const processedKeywords = Object.values(groupedKeywords).map(k => {
    return {
      ...k,
      ctr: k.impressions > 0 ? k.clicks / k.impressions : 0,
      cpc: k.clicks > 0 ? k.spend / k.clicks : 0
    };
  });

  // Top Keywords: Sorted by conversions desc, then click desc
  const topKeywords = [...processedKeywords]
    .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks)
    .slice(0, 5);

  // Worst Keywords: Sorted by cost desc, conversions asc
  const worstKeywords = [...processedKeywords]
    .sort((a, b) => a.conversions - b.conversions || b.spend - a.spend)
    .slice(0, 5);

  // Process Search Terms
  const groupedSearchTerms = {};
  searchTermsData.forEach(s => {
    const name = s.search_term;
    if (!name) return;
    if (!groupedSearchTerms[name]) {
      groupedSearchTerms[name] = { search_term: name, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
    }
    groupedSearchTerms[name].spend += s.spend || 0;
    groupedSearchTerms[name].clicks += s.clicks || 0;
    groupedSearchTerms[name].impressions += s.impressions || 0;
    groupedSearchTerms[name].conversions += s.conversions || 0;
  });

  const processedSearchTerms = Object.values(groupedSearchTerms).map(s => {
    return {
      ...s,
      cpc: s.clicks > 0 ? s.spend / s.clicks : 0
    };
  });

  // Top Searches: Sorted by conversions desc
  const topSearches = [...processedSearchTerms]
    .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks)
    .slice(0, 5);

  // Wasted Spend Search Terms: Cost > 0 and Conversions = 0, sorted by cost desc
  const wastedSearches = [...processedSearchTerms]
    .filter(s => s.conversions === 0 && s.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  // No conversions searches
  const zeroConvSearches = [...processedSearchTerms]
    .filter(s => s.conversions === 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return (
    <article className="glass-card search-ops-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Operações de Busca</p>
          <h3>Palavras-Chave e Termos de Pesquisa</h3>
        </div>
        <div className="segmented">
          <button
            className={activeTab === "keywords" ? "active" : ""}
            onClick={() => setActiveTab("keywords")}
          >
            Palavras-Chave
          </button>
          <button
            className={activeTab === "search_terms" ? "active" : ""}
            onClick={() => setActiveTab("search_terms")}
          >
            Termos de Pesquisa
          </button>
        </div>
      </div>

      <div className="search-ops-content">
        {activeTab === "keywords" && (
          <div className="tab-layout">
            {!hasKeywords ? (
              <div className="empty-state">Nenhuma planilha de palavras-chave carregada para este período.</div>
            ) : (
              <div className="tables-grid">
                <div className="table-box">
                  <h4>Top Palavras-Chave (Melhor Conversão)</h4>
                  <div className="table-wrapper">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Palavra-Chave</th>
                          <th>Cliques</th>
                          <th>CTR</th>
                          <th>Custo</th>
                          <th>Conversões</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topKeywords.map((k, i) => (
                          <tr key={i}>
                            <td className="term-text" title={k.keyword}>{k.keyword}</td>
                            <td>{number.format(k.clicks)}</td>
                            <td>{(k.ctr * 100).toFixed(2)}%</td>
                            <td>{brl.format(k.spend)}</td>
                            <td className="highlight-green">{k.conversions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="table-box">
                  <h4>Piores Palavras-Chave (Baixa Conversão)</h4>
                  <div className="table-wrapper">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Palavra-Chave</th>
                          <th>Cliques</th>
                          <th>CTR</th>
                          <th>Custo</th>
                          <th>Conversões</th>
                        </tr>
                      </thead>
                      <tbody>
                        {worstKeywords.map((k, i) => (
                          <tr key={i}>
                            <td className="term-text" title={k.keyword}>{k.keyword}</td>
                            <td>{number.format(k.clicks)}</td>
                            <td>{(k.ctr * 100).toFixed(2)}%</td>
                            <td>{brl.format(k.spend)}</td>
                            <td className="highlight-red">{k.conversions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "search_terms" && (
          <div className="tab-layout">
            {!hasSearchTerms ? (
              <div className="empty-state">Nenhuma planilha de termos de pesquisa carregada para este período.</div>
            ) : (
              <div className="tables-grid-three">
                {/* Top Searches */}
                <div className="table-box">
                  <h4>Top Termos de Busca</h4>
                  <div className="table-wrapper">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Termo</th>
                          <th>Cliques</th>
                          <th>Custo</th>
                          <th>Conversões</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSearches.map((s, i) => (
                          <tr key={i}>
                            <td className="term-text" title={s.search_term}>{s.search_term}</td>
                            <td>{number.format(s.clicks)}</td>
                            <td>{brl.format(s.spend)}</td>
                            <td className="highlight-green">{s.conversions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Wasted searches */}
                <div className="table-box">
                  <h4>
                    <span className="wasted-badge">⚠</span> Desperdício de Verba
                  </h4>
                  <div className="table-wrapper">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Termo</th>
                          <th>Cliques</th>
                          <th>Custo</th>
                          <th>Conversões</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wastedSearches.map((s, i) => (
                          <tr key={i}>
                            <td className="term-text" title={s.search_term}>{s.search_term}</td>
                            <td>{number.format(s.clicks)}</td>
                            <td className="highlight-red">{brl.format(s.spend)}</td>
                            <td>{s.conversions}</td>
                          </tr>
                        ))}
                        {wastedSearches.length === 0 && (
                          <tr>
                            <td colSpan="4" className="empty-row">Nenhum termo com desperdício detectado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Zero conversion searches */}
                <div className="table-box">
                  <h4>Cliques Sem Conversão</h4>
                  <div className="table-wrapper">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Termo</th>
                          <th>Cliques</th>
                          <th>Custo</th>
                          <th>Conversões</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zeroConvSearches.map((s, i) => (
                          <tr key={i}>
                            <td className="term-text" title={s.search_term}>{s.search_term}</td>
                            <td>{number.format(s.clicks)}</td>
                            <td>{brl.format(s.spend)}</td>
                            <td>{s.conversions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
