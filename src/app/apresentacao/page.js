"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Custom icons as React components
function IconHome() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function IconPrint() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function IconChannels() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20"/>
      <path d="m5 17 5-5 5 5"/>
      <path d="m14 10 3-3 5 5"/>
      <circle cx="10" cy="12" r="2"/>
      <circle cx="17" cy="7" r="2"/>
    </svg>
  );
}

function IconSynonyms() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 3 4 4-4 4"/>
      <path d="M20 7H4"/>
      <path d="m8 21-4-4 4-4"/>
      <path d="M4 17h16"/>
    </svg>
  );
}

function IconParser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  );
}

function IconDevices() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function IconHeatmap() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="3" y1="14" x2="21" y2="14"/>
    </svg>
  );
}

function IconMap() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}

function IconGemini() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18"/>
      <path d="M3 12h18"/>
      <path d="m12 12 4-4"/>
      <path d="m12 12-4 4"/>
    </svg>
  );
}

function IconPdf() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

function IconSpreadsheet() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
    </svg>
  );
}

function IconOffline() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

function IconPalette() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5Z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  );
}

export default function Apresentacao() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 5;

  useEffect(() => {
    document.title = "Dossiê Executivo de Apresentação | DOit BI";

    // Add keyboard event listener
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Render Slide Contents based on index
  const renderSlideContent = (index) => {
    switch (index) {
      case 0:
        return (
          <div className="slide-cover">
            <h1 className="slide-title-large">DOIT BI</h1>
            <p className="slide-subtitle-large">Plataforma Premium de Analytics e Co-Piloto de IA</p>
            <div className="slide-cover-card">
              <h4>Dossiê Executivo de Apresentação</h4>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text)", margin: "10px 0 16px 0" }}>
                Visão Geral das Funcionalidades e Escala de Mídia
              </p>
              <p>
                Este documento descreve detalhadamente o conjunto de recursos, integrações e visualizações de alto impacto embarcados no DOit BI para tomada de decisão estratégica em campanhas digitais.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <>
            <div className="slide-header-row">
              <h2 className="slide-title">01. CONSOLIDAÇÃO & PARSER DE DADOS</h2>
              <span className="slide-num">01 / 04</span>
            </div>
            <div className="slide-grid-3">
              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconChannels /></div>
                  <h3 className="slide-card-title">Detecção de Canal</h3>
                </div>
                <p className="slide-card-desc">
                  O sistema analisa os arquivos CSV enviados identificando automaticamente a plataforma de origem (Google Ads vs Meta Ads).
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Busca por termos chave no nome do arquivo (ex: gads, facebook).</li>
                  <li>Pontuação por cabeçalhos exclusivos (ex: cpc méd., alcance).</li>
                  <li>Avaliação das primeiras linhas para classificar o tipo.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconSynonyms /></div>
                  <h3 className="slide-card-title">Mapeamento Dinâmico</h3>
                </div>
                <p className="slide-card-desc">
                  Suporte nativo aos formatos de exportação padrão em português do Brasil e inglês.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Unifica sinônimos como &apos;Custo&apos;, &apos;Valor gasto&apos; e &apos;Spend&apos; globais.</li>
                  <li>Mapeia conversões diversas (&apos;Compras&apos;, &apos;Leads&apos;) sob a mesma métrica.</li>
                  <li>Associa receita de conversão para cálculo de ROAS unificado.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconParser /></div>
                  <h3 className="slide-card-title">Parser Universal</h3>
                </div>
                <p className="slide-card-desc">
                  Algoritmo robusto de ingestão que impede quebras e dados corrompidos.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Normaliza formatos de moeda e números brasileiros e americanos.</li>
                  <li>Remove linhas de totalizador automático (&apos;Total Geral&apos;) para evitar duplicidade.</li>
                  <li>Detecta e divide sub-planilhas de segmentações específicas.</li>
                </ul>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className="slide-header-row">
              <h2 className="slide-title">02. PAINÉIS DE SEGMENTAÇÃO AVANÇADA (DASHBOARD)</h2>
              <span className="slide-num">02 / 04</span>
            </div>
            <div className="slide-grid-3">
              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconDevices /></div>
                  <h3 className="slide-card-title">Análise de Dispositivos</h3>
                </div>
                <p className="slide-card-desc">
                  Monitoramento visual da proporção de investimento e conversões entre Celular e Computador.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Barras de progresso dinâmicas representam a fatia percentual.</li>
                  <li>Cálculo individual de Investimento, Conversões e CPA por dispositivo.</li>
                  <li>Indicação visual inteligente e suporte a estados neutros.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconHeatmap /></div>
                  <h3 className="slide-card-title">Densidade Cronológica</h3>
                </div>
                <p className="slide-card-desc">
                  Grade de calor inteligente (7x6) representando o volume de vendas por dia da semana e faixa horária.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Colorização baseada na densidade proporcional de vendas.</li>
                  <li>Tooltips com volume exato e recomendações da IA no hover.</li>
                  <li>Sugestões automáticas para otimizar os horários de veiculação.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconMap /></div>
                  <h3 className="slide-card-title">Distribuição Geográfica</h3>
                </div>
                <p className="slide-card-desc">
                  Mapa vetorial estilizado que divide a performance do investimento pelas cinco macro-regiões do país.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Destaque visual interativo (efeito Glow neon) nas regiões selecionadas.</li>
                  <li>Painel de métricas (Custo, ROI, CPA) atualizado em tempo real.</li>
                  <li>Textos de recomendação gerados para escalabilidade geográfica.</li>
                </ul>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className="slide-header-row">
              <h2 className="slide-title">03. CO-PILOTO DE IA & RELATÓRIOS EXECUTIVOS</h2>
              <span className="slide-num">03 / 04</span>
            </div>
            <div className="slide-grid-3">
              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconGemini /></div>
                  <h3 className="slide-card-title">Assistente de Chat</h3>
                </div>
                <p className="slide-card-desc">
                  Canal de conversação em linguagem natural integrado com a IA do Google Gemini (2.5 Flash).
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Gera diagnósticos contextuais de campanhas carregadas.</li>
                  <li>Suporte a anexo de imagens de anúncios e arquivos TXT complementares.</li>
                  <li>Modo simulação integrado para funcionamento local.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconPdf /></div>
                  <h3 className="slide-card-title">Dossiê e PDF Premium</h3>
                </div>
                <p className="slide-card-desc">
                  Compilação dos dados do painel em formato de apresentação digital de altíssima qualidade visual.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Storytelling estratégico narrando performance e pontos de risco.</li>
                  <li>Layout 16:9 executivo com fontes suavizadas sem falhas de acento.</li>
                  <li>Impressão A4 landscape nativa que gera arquivos impecáveis.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconSpreadsheet /></div>
                  <h3 className="slide-card-title">Exportação Planilha</h3>
                </div>
                <p className="slide-card-desc">
                  Exportação de dados consolidados e higienizados prontos para Excel e Google Sheets.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Fórmulas dinâmicas inclusas no CSV para ROI e ROAS automáticos.</li>
                  <li>Remoção de acentuações incompatíveis com leitores legados.</li>
                  <li>Status de escala e recomendação incluídos por campanha.</li>
                </ul>
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <div className="slide-header-row">
              <h2 className="slide-title">04. ARQUITETURA, PERSISTÊNCIA & SEGURANÇA</h2>
              <span className="slide-num">04 / 04</span>
            </div>
            <div className="slide-grid-3">
              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconDatabase /></div>
                  <h3 className="slide-card-title">Banco de Dados Supabase</h3>
                </div>
                <p className="slide-card-desc">
                  Infraestrutura PostgreSQL em nuvem para gravação e histórico confidencial.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Persistência robusta de contas, campanhas e configurações.</li>
                  <li>Storage seguro para uploads de CSVs e mídias de criativos.</li>
                  <li>Isolamento absoluto via Row-Level Security (RLS) por usuário.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconOffline /></div>
                  <h3 className="slide-card-title">Operação Híbrida</h3>
                </div>
                <p className="slide-card-desc">
                  Funcionamento independente garantido mesmo sem configurações de chaves de nuvem.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Fallback automático para demonstração caso o banco esteja off-line.</li>
                  <li>Ingestão local em memória React ideal para testes rápidos.</li>
                  <li>Independência tecnológica sem lock-in de fornecedores.</li>
                </ul>
              </div>

              <div className="slide-feature-card">
                <div className="slide-card-header">
                  <div className="slide-card-icon"><IconPalette /></div>
                  <h3 className="slide-card-title">Design System Premium</h3>
                </div>
                <p className="slide-card-desc">
                  Identidade visual moderna e fluida projetada para impactar em reuniões de negócios.
                </p>
                <ul style={{ fontSize: "11px", color: "var(--muted)", paddingLeft: "16px", marginTop: "12px", lineHeight: "1.6" }}>
                  <li>Glassmorphism refinado, sombras suaves e gradientes em neon.</li>
                  <li>Adaptabilidade completa para monitores, tablets e celulares.</li>
                  <li>Efeitos hover e micro-interações fluidas nas transições.</li>
                </ul>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pres-wrapper">
      {/* Background decoration in web browser view */}
      <div 
        className="aurora-bg" 
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(circle at 80% 20%, rgba(123, 183, 255, 0.15), transparent 40%), radial-gradient(circle at 10% 80%, rgba(124, 247, 190, 0.1), transparent 45%), #05070e",
          zIndex: -1
        }}
      />

      {/* Interactive Controls & Header (Browser Only) */}
      <header className="pres-header">
        <Link href="/" className="pres-btn" style={{ textDecoration: "none" }}>
          <IconHome /> Voltar ao Painel
        </Link>
        <div className="pres-indicators">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <span
              key={i}
              className={`pres-dot ${currentSlide === i ? "active" : ""}`}
              onClick={() => setCurrentSlide(i)}
              title={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <div className="pres-nav-buttons">
          <button className="pres-btn" onClick={prevSlide} title="Slide Anterior (Seta Esquerda)">
            <IconArrowLeft /> Anterior
          </button>
          <button className="pres-btn" onClick={nextSlide} title="Próximo Slide (Seta Direita)">
            Próximo <IconArrowRight />
          </button>
          <button className="pres-btn primary" onClick={handlePrint}>
            <IconPrint /> Imprimir PDF
          </button>
        </div>
      </header>

      {/* Slide Deck Container (Browser Only) */}
      <article className="slide-deck">
        <div className="slide-content">
          {renderSlideContent(currentSlide)}
        </div>
        <footer className="slide-footer">
          <span className="slide-footer-text">DOIT BI &bull; DOSSIÊ EXECUTIVO DE APRESENTAÇÃO</span>
          <span className="slide-footer-text" style={{ fontWeight: "700" }}>
            Slide {currentSlide + 1} de {totalSlides}
          </span>
        </footer>
      </article>

      {/* Printable Slides Layout (Print Only - Hidden in Browser) */}
      <div className="print-only-slides">
        {Array.from({ length: totalSlides }).map((_, idx) => (
          <div key={idx} className="print-slide">
            <div className="slide-content" style={{ padding: 0 }}>
              {renderSlideContent(idx)}
            </div>
            <footer className="slide-footer" style={{ padding: "16px 0 0 0", borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "transparent", marginTop: "auto" }}>
              <span className="slide-footer-text" style={{ fontSize: "10px" }}>DOIT BI &bull; DOSSIÊ EXECUTIVO DE APRESENTAÇÃO</span>
              <span className="slide-footer-text" style={{ fontSize: "10px", fontWeight: "700" }}>
                Página {idx + 1} de {totalSlides}
              </span>
            </footer>
          </div>
        ))}
      </div>

      {/* Instruction text (Browser Only) */}
      <p className="no-print" style={{ color: "var(--muted)", fontSize: "12px", marginTop: "24px", textAlign: "center" }}>
        Dica: Você pode navegar usando as <strong>Setas do Teclado (← / →)</strong> e clicar em <strong>Imprimir PDF</strong> para salvar.
      </p>
    </div>
  );
}
