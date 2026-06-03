import readXlsxFile from "read-excel-file/browser";
import { buildDeterministicId } from "./data-validator";

export function sanitizeMojibake(str) {
  if (str === undefined || str === null) return str;
  let s = String(str);

  // Primary byte-pair mojibake replacements (UTF-8 decoded as Latin-1)
  s = s
    .replaceAll("\u00C3\u00A9", "\u00E9") // Ã© → é
    .replaceAll("\u00C3\u00A3", "\u00E3") // Ã£ → ã
    .replaceAll("\u00C3\u00A7", "\u00E7") // Ã§ → ç
    .replaceAll("\u00C3\u00B3", "\u00F3") // Ã³ → ó
    .replaceAll("\u00C3\u00B5", "\u00F5") // Ãµ → õ
    .replaceAll("\u00C3\u00BA", "\u00FA") // Ãº → ú
    .replaceAll("\u00C3\u00AA", "\u00EA") // Ãª → ê
    .replaceAll("\u00C3\u00A1", "\u00E1") // Ã¡ → á
    .replaceAll("\u00C3\u00A2", "\u00E2") // Ã¢ → â
    // FIX: previously missing characters
    .replaceAll("\u00C3\u00AD", "\u00ED") // Ã­ → í  (crucial for 'Início')
    .replaceAll("\u00C3\u00A0", "\u00E0") // Ã  → à  (with non-breaking space)
    .replaceAll("\u00C3\u00B4", "\u00F4") // Ã´ → ô
    .replaceAll("\u00C3\u00B6", "\u00F6") // Ã¶ → ö
    .replaceAll("\u00C3\u00BC", "\u00FC") // Ã¼ → ü
    // Uppercase accented characters
    .replaceAll("\u00C3\u0089", "\u00C9") // Ã‰ → É
    .replaceAll("\u00C3\u0081", "\u00C1") // Ã\u0081 → Á
    .replaceAll("\u00C3\u008D", "\u00CD") // Ã\u008D → Í
    .replaceAll("\u00C3\u0093", "\u00D3") // Ã\u0093 → Ó
    .replaceAll("\u00C3\u009A", "\u00DA") // Ã\u009A → Ú
    .replaceAll("\u00C3\u0083", "\u00C3") // Ã\u0083 → Ã
    .replaceAll("\u00C3\u0087", "\u00C7") // Ã\u0087 → Ç
    // Legacy string-based replacements (fallback for some exports)
    .replaceAll("\u00C3o", "\u00E3o") // Ão → ão (some Windows-1252 exports)
    .replaceAll("Ã©", "é")
    .replaceAll("Ã£", "ã")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ã§", "ç")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ãµ", "õ")
    .replaceAll("Ãª", "ê")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã¢", "â");

  s = s
    .replace(/in\u00C3c/gi, "in\u00EDc") // inÃc → iníc
    .replace(/in\u00E3c/gi, "in\u00EDc") // inãc → iníc (post-mojibake)
    .replace(/m\u00C3di/gi, "m\u00EDdi") // mÃdi → mídi
    .replace(/m\u00E3di/gi, "m\u00EDdi") // mãdi → mídi
    .replace(/per\u00C3od/gi, "per\u00EDod") // perÃod → períod
    .replace(/per\u00E3od/gi, "per\u00EDod") // perãod → períod
    .replace(/t\u00C3tul/gi, "t\u00EDtul") // tÃtul → títul
    .replace(/t\u00E3tul/gi, "t\u00EDtul"); // tãtul → títul

  return s;
}

// ----------------------------------------------------
// Formatting & Cleaning Helpers
// ----------------------------------------------------

export function parseFormattedFloat(val) {
  if (val === undefined || val === null || val === "") return 0;
  
  // If it's already a number, return it
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }

  let cleaned = String(val)
    .replace(/[R$\s%]/g, "") // remove currency, percentage and spaces
    .trim();

  if (cleaned === "" || cleaned === "-" || cleaned === "--") return 0;

  // ---------------------------------------------------------------
  // Number format detection:
  //
  // Brazilian/European formats:
  //   "4.234.567"    → 4234567     (multiple dots = thousand separators)
  //   "1.200,50"     → 1200.50     (dot=thousand, comma=decimal)
  //   "1200,50"      → 1200.50     (comma only = decimal)
  //
  // US/English formats:
  //   "1,200.50"     → 1200.50     (comma=thousand, dot=decimal)
  //   "1,200"        → 1200        (comma=thousand, no decimal)
  //
  // Ambiguous:
  //   "4.234"        → could be 4.234 (decimal) or 4234 (thousands)
  //                    Rule: if exactly 3 digits after single dot → 4234
  // ---------------------------------------------------------------

  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount   = (cleaned.match(/\./g) || []).length;

  if (dotCount > 1 && commaCount === 0) {
    // Multiple dots, no comma: "4.234.567" → Brazilian thousand separators
    cleaned = cleaned.replaceAll(".", "");

  } else if (dotCount > 1 && commaCount > 0) {
    // Multiple dots + comma: "4.234.567,89" → BR format
    if (cleaned.lastIndexOf(".") < cleaned.lastIndexOf(",")) {
      // dot before comma → BR: dot=thousand, comma=decimal
      cleaned = cleaned.replaceAll(".", "").replace(",", ".");
    } else {
      // comma before dot → US: comma=thousand, dot=decimal
      cleaned = cleaned.replaceAll(",", "");
    }

  } else if (dotCount === 1 && commaCount === 0) {
    // Single dot, no comma: could be decimal OR thousand
    const afterDot = cleaned.split(".")[1] || "";
    if (afterDot.length === 3) {
      // Exactly 3 digits after dot: "4.234" → 4234 (thousand separator)
      // Exception: if the part before dot has 0 digits it's decimal: ".234"
      const beforeDot = cleaned.split(".")[0];
      if (beforeDot.length >= 1 && beforeDot !== "") {
        cleaned = cleaned.replace(".", "");
      }
      // else leave as-is (decimal like ".5" → 0.5)
    }
    // Otherwise: "4.5", "1.23", "0.99" → leave as-is (decimal)

  } else if (commaCount === 1 && dotCount === 0) {
    // Single comma, no dot: "1200,50" → BR decimal
    cleaned = cleaned.replace(",", ".");

  } else if (commaCount === 1 && dotCount === 1) {
    if (cleaned.indexOf(".") < cleaned.indexOf(",")) {
      // "1.200,50" → BR format: dot=thousand, comma=decimal
      cleaned = cleaned.replaceAll(".", "").replace(",", ".");
    } else {
      // "1,200.50" → US format: comma=thousand, dot=decimal
      cleaned = cleaned.replaceAll(",", "");
    }

  } else if (commaCount > 0 && dotCount === 0) {
    // Multiple commas, no dot: "1,234,567" → US thousand separators
    cleaned = cleaned.replaceAll(",", "");
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parsePercentage(val) {
  if (val === undefined || val === null || val === "") return 0;
  let parsed = parseFormattedFloat(val);
  // If value was explicitly a percentage in string, sheetJS sometimes gives decimal, sometimes raw.
  // We assume if it's > 1 and was text with '%', or is just raw, we divide by 100
  if (String(val).includes("%")) {
    return parsed / 100;
  }
  // If no percentage sign and we expect a ratio, let's keep it, but if it is e.g. 5.5 (meaning 5.5%), divide by 100
  if (parsed > 1) {
    return parsed / 100;
  }
  return parsed;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_MAP_PT = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

export function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;

  const str = String(val).trim();
  if (str === "" || str === "-") return null;

  // FIX: Handle ISO YYYY-MM-DD as LOCAL date to avoid UTC timezone offset (e.g. 2025-10-01 UTC = 2025-09-30 in UTC-3)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }

  // FIX: Handle YYYY-MM (monthly segmentation export — e.g. Meta Ads "Detalhamento por Mês")
  // Value is like "2025-10" — treat as first day of that month
  const isoMonthMatch = str.match(/^(\d{4})-(\d{2})$/);
  if (isoMonthMatch) {
    return new Date(parseInt(isoMonthMatch[1], 10), parseInt(isoMonthMatch[2], 10) - 1, 1);
  }

  const strLower = str.toLowerCase();
  
  // Substitui pontos por barras em datas no formato DD.MM.YYYY ou DD.MM.YY para evitar que sejam apagados na limpeza
  let cleanStr = strLower.replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, "$1/$2/$3");
  cleanStr = cleanStr.replace(/[.,]/g, "").replace(/\s+/g, " ");
  
  // FIX: Handle "month de year" format (e.g. "outubro de 2025") — Meta Ads monthly export
  // Split on " de " gives ["outubro", "2025"] (only 2 parts, no day)
  if (cleanStr.includes(" de ")) {
    const parts = cleanStr.split(" de ");
    if (parts.length >= 3) {
      // "1 de outubro de 2025" — day + month + year
      let dayPart = parts[0].trim();
      const monthPart = parts[1].trim();
      const yearPart = parts[2].trim();

      const dayMatch = dayPart.match(/\d+/);
      const day = dayMatch ? parseInt(dayMatch[0], 10) : 1;
      const month = MONTH_MAP_PT[monthPart] !== undefined ? MONTH_MAP_PT[monthPart] : 0;
      const year = parseInt(yearPart, 10) || new Date().getFullYear();

      return new Date(year, month, day);
    } else if (parts.length === 2) {
      // "outubro de 2025" — month + year only (no day) — treat as 1st of month
      const monthPart = parts[0].trim();
      const yearPart = parts[1].trim();
      const month = MONTH_MAP_PT[monthPart];
      const year = parseInt(yearPart, 10);
      if (month !== undefined && !isNaN(year)) {
        return new Date(year, month, 1);
      }
    }
  }

  // FIX: Handle "outubro/2025" or "outubro 2025" formats (month name + slash/space + year)
  const monthYearSlash = cleanStr.match(/^([a-z\u00e0-\u00ff]+)[\s\/]+(\d{4})$/);
  if (monthYearSlash) {
    const monthPart = monthYearSlash[1].trim();
    const year = parseInt(monthYearSlash[2], 10);
    const month = MONTH_MAP_PT[monthPart];
    if (month !== undefined && !isNaN(year)) {
      return new Date(year, month, 1);
    }
  }

  // Check DD/MM/YYYY or MM/DD/YYYY — use cleanStr which is already lowercased
  const slashParts = cleanStr.split(/[\/\-]/);
  if (slashParts.length === 3) {
    const p0 = parseInt(slashParts[0], 10);
    const p1 = parseInt(slashParts[1], 10);
    const p2 = parseInt(slashParts[2], 10);

    // Smart 2-digit to 4-digit year conversion
    let year = p2;
    if (year <= 99 && year >= 0) {
      year += 2000;
    }

    if (year > 1900) {
      // M-03 FIX: Smart detection of BR (DD/MM/YYYY) vs US (MM/DD/YYYY)
      if (p0 > 12) {
        // p0 > 12 significa que p0 NÃO pode ser mês → é o dia no formato brasileiro (DD/MM/YYYY)
        const day = p0;
        const month = p1 - 1;
        return new Date(year, month, day);
      } else if (p1 > 12) {
        // p1 > 12 significa que p1 NÃO pode ser mês → é o dia no formato americano (MM/DD/YYYY)
        const month = p0 - 1;
        const day = p1;
        return new Date(year, month, day);
      } else {
        // Ambíguo — padrão brasileiro DD/MM/YYYY
        const day = p0;
        const month = p1 - 1;
        return new Date(year, month, day);
      }
    } else if (p0 > 1900) {
      // YYYY/MM/DD
      const year = p0;
      const month = p1 - 1;
      const day = p2;
      return new Date(year, month, day);
    }
  }

  return null;
}

// ----------------------------------------------------
// Temporal Intelligence Builder
// ----------------------------------------------------

export function applyTemporalIntelligence(dateVal) {
  const d = parseDate(dateVal);
  if (!d || isNaN(d.getTime())) {
    const fallbackDate = new Date();
    const y = fallbackDate.getFullYear();
    const m = fallbackDate.getMonth() + 1;
    const mPad = String(m).padStart(2, "0");
    return {
      date: `${y}-${mPad}-01`,
      day: 1,
      week: 1,
      month: m,
      month_name: MONTHS_PT[m - 1],
      quarter: `Q${Math.ceil(m / 3)}`,
      year: y,
      year_month: `${y}-${mPad}`,
      reference_month: `${y}-${mPad}`,
      reference_label: `${MONTHS_PT[m - 1]}/${y}`
    };
  }

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const mPad = String(m).padStart(2, "0");
  const dPad = String(day).padStart(2, "0");

  // Calculate week of the year
  const startOfYear = new Date(y, 0, 1);
  const pastDays = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

  return {
    date: `${y}-${mPad}-${dPad}`,
    day,
    week,
    month: m,
    month_name: MONTHS_PT[m - 1],
    quarter: `Q${Math.ceil(m / 3)}`,
    year: y,
    year_month: `${y}-${mPad}`,
    reference_month: `${y}-${mPad}`,
    reference_label: `${MONTHS_PT[m - 1]}/${y}`
  };
}

// ----------------------------------------------------
// Platform & Dataset Classifiers
// ----------------------------------------------------

export function detectPlatform(fileName, rowKeys, rows = []) {
  const name = fileName.toLowerCase();

  if (name.includes("doitsa") || name.includes("doit_sa") || name.includes("doit sa")) {
    return "doitsa";
  }
  if (name.includes("meta") || name.includes("facebook") || name.includes("instagram") || name.includes("fbad")) {
    return "meta";
  }
  if (name.includes("google") || name.includes("gads") || name.includes("adwords") || name.includes("g_ads")) {
    return "google";
  }
  if (name.includes("bitrix") || name.includes("crm") || name.includes("leads")) {
    return "bitrix";
  }

  let googleScore = 0;
  let metaScore = 0;
  let bitrixScore = 0;
  let doitsaScore = 0;

  const googleColumns = [
    "cpc méd.", "cpc med.", "impr.", "taxa de conv.", "custo / conv.",
    "valor de conv. / custo", "all conv. value", "imputação de custo", "imputacao de custo",
    "palavra-chave da rede de pesquisa", "tipo de corresp.", "pesquisa do google",
    "tipo de campanha", "status da campanha"
  ];

  const metaColumns = [
    "veiculação", "veiculacao", "configuração de atribuição", "configuracao de atribuicao",
    "alcance", "valor usado (brl)", "valor usado", "resultados", "cliques (todos)",
    "ctr (todos)", "cpc (todos)", "custo por resultado", "início dos relatórios",
    "inicio dos relatorios", "encerramento dos relatórios", "encerramento dos relatorios"
  ];

  const bitrixColumns = [
    "nome do lead", "telefone de trab", "criado pelo form", "etapa alterada p", "dor principal",
    "etapa", "modificado por", "quantas pessoas", "como ficou sabe"
  ];

  const doitsaColumns = ["demo", "demos", "agendamento", "data de agendamento", "data do agendamento"];

  rowKeys.forEach(key => {
    const k = key.toLowerCase().trim();
    if (googleColumns.some(gc => k === gc || k.includes(gc))) googleScore += 2;
    if (metaColumns.some(mc => k === mc || k.includes(mc))) metaScore += 2;
    if (bitrixColumns.some(bc => k === bc || k.includes(bc))) bitrixScore += 2;
    if (doitsaColumns.some(dc => k === dc || k.includes(dc))) doitsaScore += 2;
  });

  if (doitsaScore > googleScore && doitsaScore > metaScore && doitsaScore > bitrixScore) return "doitsa";
  if (bitrixScore > googleScore && bitrixScore > metaScore && bitrixScore > doitsaScore) return "bitrix";


  // Check row content
  if (rows && rows.length > 0) {
    rows.slice(0, 10).forEach(row => {
      for (const [k, val] of Object.entries(row)) {
        const keyLower = k.toLowerCase();
        const valStr = String(val).toLowerCase();
        
        if (keyLower.includes("tipo") && (valStr.includes("pesquisa") || valStr.includes("search") || valStr.includes("display") || valStr.includes("pmax"))) {
          googleScore += 2;
        }
        if (keyLower.includes("status") && (valStr.includes("qualificada") || valStr.includes("eligible"))) {
          googleScore += 2;
        }
        if (keyLower.includes("veiculação") && (valStr.includes("ativo") || valStr.includes("pausado") || valStr.includes("veiculando"))) {
          metaScore += 2;
        }
      }
    });
  }

  return metaScore > googleScore ? "meta" : "google";
}

export function detectDataset(platform, rowKeys) {
  const keys = rowKeys.map(k => k.toLowerCase().trim());

  if (platform === "bitrix") {
    return "crm_leads";
  }

  if (platform === "doitsa") {
    return "crm_leads";
  }

  if (platform === "meta") {
    const hasAd = keys.some(k => k.includes("anúncio") || k.includes("anuncio") || k.includes("ad name") || k.includes("ad_name") || k === "ad" || k === "ads");
    const hasAdset = keys.some(k => k.includes("conjunto") || k.includes("adset") || k.includes("ad set") || k.includes("ad_set"));
    const hasDispositivo = keys.some(k => k === "dispositivo" || k === "device" || k.includes("dispositivo de"));
    const hasPlacement = keys.some(k => k === "posicionamento" || k === "placement" || k === "posicionamentos" || k.includes("posicionamento e") || k.includes("plataforma de posicionamento"));
    const hasIdade = keys.some(k => k.includes("idade") || k.includes("age") || k.includes("faixa"));
    const hasSexo = keys.some(k => k.includes("sexo") || k.includes("gender") || k.includes("gênero") || k.includes("genero"));
    const hasData = keys.some(k => k === "data" || k === "date" || k.includes("início") || k.includes("inicio") || k.includes("dia") || k.includes("day"));

    if (hasDispositivo) return "device_performance";
    if (hasPlacement) return "network_performance";
    if (hasSexo && hasIdade) return "demographics_gender_age";
    if (hasIdade) return "demographics_age";
    if (hasSexo) return "demographics_gender";
    if (hasAd) return "meta_ad_performance";
    if (hasAdset) return "meta_adset_performance";
    if (hasData) return "daily_time_series";
    return "meta_campaign_performance";
  }

  // Google Ads Datasets Detection
  const hasCliques = keys.some(k => k === "cliques" || k === "clicks");
  const hasCusto = keys.some(k => k === "custo" || k === "cost" || k === "spend" || k.includes("valor"));
  const hasImpressoes = keys.some(k => k === "impressões" || k === "impressions" || k === "impr.");
  const hasCampaign = keys.some(k => k === "campanha" || k === "campaign" || k === "nome da campanha" || k === "campaign name");

  const hasDia = keys.some(k => k === "dia" || k === "day" || k === "dia da semana" || k === "day of week");
  const hasHora = keys.some(k => k === "hora" || k === "hour" || k === "hora de início" || k === "hour of day" || k === "hora de inicio");
  const hasData = keys.some(k => k === "data" || k === "date");
  const hasDispositivo = keys.some(k => k === "dispositivo" || k === "device");
  const hasIdade = keys.some(k => k === "faixa de idade" || k === "age" || k === "idade");
  const hasSexo = keys.some(k => k === "sexo" || k === "gender" || k === "gênero");
  const hasKeyword = keys.some(k => k === "palavra-chave da rede de pesquisa" || k === "keyword" || k === "palavra-chave");
  const hasSearchTerm = keys.some(k => k === "pesquisa do google" || k === "search term" || k === "pesquisar" || k === "termo de pesquisa");
  const hasRede = keys.some(k => k === "rede" || k === "network" || k === "rede com parceiros de pesquisa");

  if (hasCampaign && (hasCliques || hasCusto || hasImpressoes)) return "campaign_performance";
  if (hasDia && hasHora && hasCliques) return "weekday_hour_performance";
  if (hasDia && hasCliques) return "weekday_performance";
  if (hasHora && hasCliques) return "hourly_performance";
  if (hasDispositivo && (hasCusto || hasCliques)) return "device_performance";
  if (hasSexo && hasIdade && hasImpressoes) return "demographics_gender_age";
  if (hasIdade && hasImpressoes) return "demographics_age";
  if (hasSexo && hasImpressoes) return "demographics_gender";
  if (hasKeyword && (keys.includes("ctr") || keys.includes("cpc méd.") || hasCliques)) return "search_keywords";
  if (hasSearchTerm && (hasCusto || hasCliques)) return "search_terms";
  if (hasRede && (hasCliques || hasCusto)) return "network_performance";
  if (hasData && (hasCliques || hasCusto || hasImpressoes)) return "daily_time_series";

  // Fallback to time series or general campaigns if has data / campaigns
  if (hasData) return "daily_time_series";
  return "daily_time_series"; // Default general campaigns are treated as time series or parsed campaigns
}

// ----------------------------------------------------
// Semantic Synonyms Mapping
// ----------------------------------------------------

export const SYNONYMS = {
  // ---- CORE METRICS ----
  campaign_name: [
    // Meta Ads
    "Nome da campanha", "nome da campanha", "nome_da_campanha", "campanhas",
    // Google Ads
    "Campaign", "campaign", "Campaign name", "campaign name",
    // Generic
    "Campanha", "campanha", "nome", "name", "campaign_name", "nome_campanha"
  ],
  spend: [
    // Meta Ads exact column names
    "Valor usado (BRL)", "valor usado (brl)", "Valor usado", "valor usado",
    "Valor gasto (BRL)", "valor gasto (brl)", "Valor gasto", "valor gasto",
    // Google Ads exact column names
    "Custo", "custo", "Imputação de custo", "imputação de custo", "imputacao de custo",
    // English / Generic
    "Cost", "cost", "Spend", "spend", "Amount spent", "amount spent",
    "Amount Spent (BRL)", "amount spent (brl)",
    // Other
    "Investimento", "investimento", "Investimento (BRL)", "investimento (brl)",
    "Gasto", "gasto", "gastos", "custo_total", "total cost", "valor_usado", "valor_gasto"
  ],
  clicks: [
    // Meta Ads exact
    "Cliques (todos)", "cliques (todos)", "Cliques no link", "cliques no link",
    "Cliques", "cliques", "Clique", "clique",
    // Google Ads PT-BR — relatório padrão de Campanhas usa 'Interações' para cliques
    "Interações", "interações", "Interacoes", "interacoes",
    "Interação", "interação",
    // English
    "Clicks", "clicks", "Link Clicks", "link clicks", "Clicks (all)", "clicks (all)",
    "Interactions", "interactions",
    // Other
    "Cliques Totais", "cliques totais", "cliques_no_link", "cliques_totais", "total clicks", "total_clicks"
  ],
  impressions: [
    // Meta Ads exact
    "Impressões", "impressões", "Impressões (todos)", "impressões (todos)",
    // Generic
    "Impressoes", "impressoes", "Impr.", "impr.", "impr",
    // English
    "Impressions", "impressions", "Views", "views", "Visualizações", "visualizações"
  ],
  conversions: [
    // Meta Ads exact — 'Resultados' é o campo principal de conversões no Meta
    "Resultados", "resultados", "Results", "results",
    // Compras / e-commerce
    "Compras", "compras", "Purchases", "purchases", "Purchase", "purchase",
    "Compras no site", "compras no site", "Website purchases", "website purchases",
    "Compras (pixel do Facebook)", "compras (pixel do facebook)",
    "Compras no Facebook", "compras no facebook",
    "Conversões de compras", "conversões de compras",
    // Google Ads PT-BR — nomes exatos do CSV exportado
    "Todas as conv.", "todas as conv.",           // total de conversões (inclui assistidas)
    "Conv.", "conv.",                             // abreviação usada em alguns relatórios
    "Conversões", "conversões", "Conversoes", "conversoes",
    "Conversões totais", "conversões totais", "Todas as conversões", "todas as conversões",
    // English
    "Conversions", "conversions", "Total conversions", "total conversions", "All conversions", "all conversions",
    // DOitSA
    "Demo", "demo", "demos"
  ],
  leads: [
    // PRIORIDADE 1: coluna total "Leads" do Meta Ads — já inclui Leads na Meta + Leads no site
    // Deve ser mapeada primeiro para evitar dupla contagem com as sub-colunas
    "Leads", "leads",
    // PRIORIDADE 2: sub-colunas específicas (usadas quando não há coluna total)
    "Leads na Meta", "leads na Meta", "leads na meta",           // formulários nativos do Meta
    "Leads no site", "leads no site",                            // leads via pixel no site
    "Leads (Meta)", "leads (Meta)", "leads (meta)",
    "Leads (site)", "leads (site)",
    // Meta Ads resultados de formulário
    "Resultado de preenchimento de formulários", "resultado de preenchimento de formulários",
    "Leads de formulário instantâneo", "leads de formulário instantâneo",
    "Envios de formulário de lead", "envios de formulário de lead",
    "Preenchimento de formulário", "preenchimento de formulário",
    "Formulário de lead", "formulário de lead",
    // Meta Ads outros
    "Leads (formulário)", "leads (formulário)", "Leads (formulario)", "leads (formulario)",
    "Cadastros de lead", "cadastros de lead",
    "Leads instantâneos", "leads instantâneos",
    // Generic
    "Lead", "lead",
    "Leads totais", "leads totais", "Leads gerados", "leads gerados",
    "Leads_total", "leads_total", "Cadastros", "cadastros",
    "Contatos", "contatos", "Formulários preenchidos", "formulários preenchidos",
    "Form leads", "form leads", "Lead gen", "lead gen", "Lead form", "lead form",
    "Captações", "captações"
  ],
  revenue: [
    // Meta Ads exact
    "Valor de conversão de compras", "valor de conversão de compras",
    "Valor de conversão de compras (BRL)", "valor de conversão de compras (brl)",
    "Compras no site (valor de conversão)", "compras no site (valor de conversão)",
    "Compras (valor de conversão)", "compras (valor de conversão)",
    "Valor de conversão de compras no site", "valor de conversão de compras no site",
    "Valor de conversão de compras no Facebook", "valor de conversão de compras no facebook",
    // Google Ads PT-BR — nomes exatos do CSV exportado
    "Valor de todas as conv.", "valor de todas as conv.",   // receita total de todas as conversões
    "Valor de conv.", "valor de conv.",                     // receita de conversões primárias
    "Valor conv.", "valor conv.",
    "Valor de conversão", "valor de conversão",
    "All conv. value", "all conv. value",
    "Valor das conversões", "valor das conversões",
    "Valor total de conversões", "valor total de conversões",
    "Valor de conversão de todas as conversões", "valor de conversão de todas as conversões",
    // ATENÇÃO: "Valor de conv. / custo" é ROAS (ratio), NÃO receita — removido
    // Generic
    "Receita", "receita", "Receita (BRL)", "receita (brl)",
    "Revenue", "revenue", "Conversion value", "conversion value",
    "Purchase value", "purchase value", "Purchase conversion value", "purchase conversion value",
    "Website purchase conversion value", "website purchase conversion value",
    "Valor de compra", "valor de compra", "Valor de compras", "valor de compras",
    "Conversões (valor)", "conversões (valor)", "valor_conversao", "receita_total", "total revenue"
  ],
  ctr: [
    // Meta Ads exact
    "CTR (todos)", "ctr (todos)", "CTR (all)", "ctr (all)",
    "CTR (link)", "ctr (link)",
    // Google Ads PT-BR — relatório padrão usa 'Taxa de interação'
    "Taxa de interação", "taxa de interação",
    "Taxa de interacao", "taxa de interacao",
    // Generic
    "CTR", "ctr", "Taxa de cliques", "taxa de cliques",
    "Click-through rate", "click-through rate", "Taxa de clique", "taxa de clique",
    "taxa_de_clique", "ctr_total"
  ],
  cpc: [
    // Meta Ads exact — 'Custo por resultados' = CPA do Meta
    "CPC (todos)", "cpc (todos)", "CPC (all)", "cpc (all)",
    "Custo por resultados", "custo por resultados",
    "Custo por resultado", "custo por resultado",
    // Google Ads PT-BR — relatório padrão usa 'Custo médio'
    "Custo médio", "custo médio",
    "Custo medio", "custo medio",
    // Google Ads outros formatos
    "CPC méd.", "cpc méd.", "CPC médio", "cpc médio",
    // Generic
    "CPC", "cpc", "Cost per click", "cost per click", "cpc_medio", "cpc_med"
  ],
  reach: [
    // Meta Ads exact
    "Alcance", "alcance", "Pessoas alcançadas", "pessoas alcançadas",
    // English
    "Reach", "reach", "Alcance total", "alcance total"
  ],
  frequency: [
    // Meta Ads exact
    "Frequência", "frequência", "Frequencia", "frequencia",
    // Generic
    "Frequency", "frequency", "Freq", "freq", "Frequência média", "frequência média"
  ],
  date: [
    // Meta Ads com segmentação por MÊS — coluna chama-se 'Mês'
    "Mês", "mês", "Mes", "mes", "Month", "month",
    "Mês do relatório", "mês do relatório",
    // Meta Ads com segmentação por DIA — coluna chama-se 'Início dos relatórios'
    "Início dos relatórios", "início dos relatórios",
    "Inicio dos relatorios", "inicio dos relatorios",
    // Google Ads
    "Dia", "dia", "Day", "day", "Data", "data", "Date", "date",
    "Reporting starts", "reporting starts", "Reporting start", "reporting start",
    "data_inicio", "start_date",
    "Dia da semana", "dia da semana", "Day of week", "day of week",
    // CRM / Bitrix
    "Criado", "criado", "Data de criação", "data de criação"
  ],
  hour: [
    "Hora", "hora", "Hour", "hour",
    "Hora de início", "hora de início", "Hour of day", "hour of day",
    "Hora de inicio", "hora de inicio", "Horário", "horário", "Horario", "horario", "hora_dia"
  ],
  status: [
    // Meta Ads exact
    "Veiculação da campanha", "veiculação da campanha",
    "Veiculação", "veiculação", "Veiculacao", "veiculacao",
    // Generic
    "Status", "status", "Estado", "estado", "Situação", "situação",
    "Delivery", "delivery", "Status da campanha", "status da campanha", "status_campanha"
  ],
  lead_id: [
    "ID", "id", "Lead ID", "lead_id", "id_lead"
  ],
  lead_status: [
    "Etapa", "etapa", "Status do Lead", "status do lead", "Fase", "fase"
  ],
  lead_source: [
    "Fonte", "fonte", "UTM Source", "utm_source", "utm source", "UTM Source.1", "Origem",
    "Como ficou sabendo do DOit", "como ficou sabendo do DOit", "Como ficou sabendo", "como ficou sabendo"
  ],
  lead_medium: [
    "UTM Medium", "utm_medium", "utm medium", "UTM Medium.1", "Meio", "meio"
  ],
  lead_campaign: [
    "UTM Campaign", "utm_campaign", "utm campaign", "Campanha", "campanha"
  ],
  lead_industry: [
    "Empresa: Indústria", "Empresa: Industria", "Indústria", "Industria", "industria", "Setor", "Segmento", "Dor Principal ??"
  ],
  adset_name: [
    // Meta Ads exact
    "Nome do conjunto de anúncios", "nome do conjunto de anúncios",
    "Nome do conjunto de anuncios", "nome do conjunto de anuncios",
    // English
    "Ad Set Name", "ad set name", "Ad Set", "ad set", "Adset name", "adset name",
    // Generic
    "Conjunto de anúncios", "conjunto de anúncios", "Conjunto de anuncios", "conjunto de anuncios",
    "adset", "nome_do_conjunto", "conjunto", "ad_set", "adset_name", "adset_id"
  ],
  ad_name: [
    // Meta Ads exact
    "Nome do anúncio", "nome do anúncio",
    "Nome do anuncio", "nome do anuncio",
    // English
    "Ad Name", "ad name", "Ad", "ad",
    // Generic
    "Anúncio", "anúncio", "Anuncio", "anuncio",
    "nome_do_anuncio", "anuncio_nome", "ad_name", "ad_id", "Anúncios", "anúncios"
  ],
  placement: [
    // Meta Ads exact
    "Posicionamento", "posicionamento", "Posicionamentos", "posicionamentos",
    "Plataforma de posicionamento", "plataforma de posicionamento",
    "Posicionamento e dispositivo", "posicionamento e dispositivo",
    // English
    "Placement", "placement",
    // Generic
    "Canal", "canal", "placement_platform"
  ],
  device: [
    // Meta Ads / Google Ads
    "Dispositivo", "dispositivo", "Device", "device",
    "Equipamento", "equipamento",
    "Tipo de dispositivo", "tipo de dispositivo", "Device category", "device category"
  ],
  gender: [
    "Sexo", "sexo", "Gender", "gender",
    "Gênero", "gênero", "Genero", "genero", "Gêneros", "gêneros"
  ],
  age_range: [
    "Faixa de idade", "faixa de idade", "Age range", "age range",
    "Idade", "idade", "Age", "age",
    "Faixa etária", "faixa etária", "Faixa etaria", "faixa etaria",
    "age_range", "faixa_etaria", "grupo_idade"
  ],
  keyword: [
    // Google Ads exact
    "Palavra-chave da Rede de Pesquisa", "palavra-chave da rede de pesquisa",
    "Palavra-chave", "palavra-chave", "Palavras-chave", "palavras-chave",
    // English
    "Keyword", "keyword", "Keyword name", "keyword name",
    // Generic
    "Palavra chave", "palavra chave", "Palavras chave", "palavras chave", "keyword_name"
  ],
  search_term: [
    // Google Ads exact
    "Pesquisa do Google", "pesquisa do google",
    "Termo de pesquisa", "termo de pesquisa",
    // Generic
    "Search term", "search term", "Pesquisar", "pesquisar",
    "Termo pesquisado", "termo pesquisado", "Termo", "termo",
    "search_term", "query", "pesquisa_usuario"
  ],
  network: [
    // Google Ads exact
    "Rede", "rede", "Rede com parceiros de pesquisa", "rede com parceiros de pesquisa",
    "Rede de publicidade", "rede de publicidade",
    // Generic
    "Network", "network", "Network type", "network type",
    "network_type", "posicionamento", "Posicionamento", "placement", "Placement",
    "posicionamentos", "Posicionamentos", "plataforma de posicionamento",
    "Plataforma de posicionamento", "placement_platform", "posicionamento e dispositivo", "Canal", "canal"
  ]
};

export function getSemanticValue(row, targetField, defaultValue = undefined) {
  const synonyms = SYNONYMS[targetField];
  if (!synonyms) return defaultValue;

  // Normalize: remove accents and lowercase for robust matching
  const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  for (const syn of synonyms) {
    // Exact match first
    if (row[syn] !== undefined) return row[syn];
    // Accent-insensitive + case-insensitive match on row keys
    const normSyn = normalize(syn);
    const foundKey = Object.keys(row).find(k => normalize(k) === normSyn);
    if (foundKey !== undefined && row[foundKey] !== undefined) return row[foundKey];
  }
  return defaultValue;
}

// ----------------------------------------------------
// File Content Parsing (CSV/Excel)
// ----------------------------------------------------

// BP-08 FIX: RFC 4180 compliant CSV parser supporting double-quote escape ("")
export function splitCsvLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // RFC 4180: two consecutive quotes inside a quoted field = literal quote
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsv(text) {
  const rawLines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length > 0);
  if (rawLines.length < 2) return [];

  // Find the header line index
  let headerLineIndex = 0;
  let bestScore = -1;
  let bestDelimiter = ",";
  const delimiters = [",", ";", "\t"];

  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const line = rawLines[i];
    const lowerLine = line.toLowerCase();
    const hasKeywords = 
      lowerLine.includes("campanha") || 
      lowerLine.includes("campaign") || 
      lowerLine.includes("custo") || 
      lowerLine.includes("spend") || 
      lowerLine.includes("receita") || 
      lowerLine.includes("revenue") ||
      lowerLine.includes("cliques") ||
      lowerLine.includes("clicks") ||
      lowerLine.includes("dia") ||
      lowerLine.includes("dispositivo");

    const delimiterScores = delimiters.map((delimiter) => {
      const columns = splitCsvLine(line, delimiter);
      const filledColumns = columns.filter((col) => col.trim()).length;
      return { delimiter, columns: filledColumns, score: filledColumns + (hasKeywords ? 8 : 0) };
    });
    const bestForLine = delimiterScores.sort((a, b) => b.score - a.score)[0];

    if (bestForLine.score > bestScore && bestForLine.columns > 1) {
      bestScore = bestForLine.score;
      headerLineIndex = i;
      bestDelimiter = bestForLine.delimiter;
    }
  }

  const headerLine = rawLines[headerLineIndex];
  const delimiter = bestDelimiter;

  // FIX: Keep original header case for display in the wizard dropdown
  // Matching is done case-insensitively everywhere (detectPlatform, detectDataset, getSemanticValue, wizard auto-mapping)
  const headers = splitCsvLine(headerLine, delimiter).map((item) =>
    sanitizeMojibake(item.replace(/^["']|["']$/g, "").trim())
  );

  const dataLines = rawLines.slice(headerLineIndex + 1);

  return dataLines.map((line) => {
    const values = splitCsvLine(line, delimiter).map((item) =>
      item.replace(/^["']|["']$/g, "").trim()
    );
    return headers.reduce((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
}

export async function parseExcelFile(file) {
  try {
    const rawRows = await readXlsxFile(file);

    if (rawRows.length < 2) return [];

    let headerIndex = 0;
    let bestScore = -1;
    rawRows.slice(0, 12).forEach((row, index) => {
      const text = row.join(" ").toLowerCase();
      const filled = row.filter((cell) => String(cell).trim()).length;
      const keywords = ["campanha", "campaign", "custo", "spend", "receita", "revenue", "cliques", "clicks", "data", "dispositivo"]
        .filter((word) => text.includes(word)).length;
      const score = filled + keywords * 4;
      if (score > bestScore) {
        bestScore = score;
        headerIndex = index;
      }
    });

    // FIX: Keep original header case for display in the wizard dropdown
    const headers = rawRows[headerIndex].map((header, index) => {
      const value = sanitizeMojibake(String(header || "").trim());
      return value || `Coluna_${index + 1}`;
    });

    return rawRows.slice(headerIndex + 1).map((row) =>
      headers.reduce((record, header, index) => {
        record[header] = row[index] ?? "";
        return record;
      }, {})
    );
  } catch (xlsxErr) {
    console.warn("read-excel-file failed, trying HTML/CSV fallback parser...", xlsxErr);

    // Fallback: Ler arquivo como texto
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo como texto."));
      reader.readAsText(file, "utf-8");
    });

    // Se parecer código HTML (muito comum em exportações falsas de ERPs/CRMs de planilhas)
    if (text.includes("<table") || text.includes("<tr") || text.includes("<html") || text.includes("xmlns:x=\"urn:schemas-microsoft-com:office:excel\"")) {
      if (typeof window !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const rows = Array.from(doc.querySelectorAll("tr"));
        if (rows.length >= 2) {
          const rawRows = rows.map(tr =>
            Array.from(tr.querySelectorAll("th, td")).map(td => td.innerText.trim())
          );

          let headerIndex = 0;
          let bestScore = -1;
          rawRows.slice(0, 12).forEach((row, index) => {
            const rowText = row.join(" ").toLowerCase();
            const filled = row.filter((cell) => String(cell).trim()).length;
            const keywords = ["campanha", "campaign", "custo", "spend", "receita", "revenue", "cliques", "clicks", "data", "dispositivo"]
              .filter((word) => rowText.includes(word)).length;
            const score = filled + keywords * 4;
            if (score > bestScore) {
              bestScore = score;
              headerIndex = index;
            }
          });

          const headers = rawRows[headerIndex].map((header, index) => {
            const value = sanitizeMojibake(String(header || "").trim());
            return value || `Coluna_${index + 1}`;
          });

          return rawRows.slice(headerIndex + 1).map((row) =>
            headers.reduce((record, header, index) => {
              record[header] = row[index] ?? "";
              return record;
            }, {})
          );
        }
      }
    }

    // Se parecer um arquivo CSV ou TSV com extensão de Excel alterada
    const rows = parseCsv(text);
    if (rows && rows.length > 0) {
      return rows;
    }

    throw xlsxErr;
  }
}

// Helper to determine reference month from file name or rows
export function inferReferenceMonth(fileName, rows) {
  const name = fileName.toLowerCase();
  
  const rangeRegex = /(\d{4})[\.\-_](\d{2})[\.\-_](\d{2})-(\d{4})[\.\-_](\d{2})[\.\-_](\d{2})/;
  const rangeMatch = name.match(rangeRegex);
  if (rangeMatch) {
    return `${rangeMatch[4]}-${rangeMatch[5]}`;
  }

  // Match YYYY-MM-DD or YYYY.MM.DD or YYYY_MM_DD or YYYY-MM
  const dateRegex = /(\d{4})[\.\-_](\d{2})([\.\-_](\d{2}))?/;
  const match = name.match(dateRegex);
  if (match) {
    const year = match[1];
    const month = match[2];
    return `${year}-${month}`;
  }

  // Look for Portuguese month names in filename
  for (const [key, val] of Object.entries(MONTH_MAP_PT)) {
    if (name.includes(key)) {
      const currentYear = new Date().getFullYear();
      const monthPad = String(val + 1).padStart(2, "0");
      return `${currentYear}-${monthPad}`;
    }
  }

  // Look into rows
  for (const row of rows.slice(0, 100)) {
    const dateVal = getSemanticValue(row, "date");
    if (dateVal) {
      const d = parseDate(dateVal);
      if (d && !isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
      }
    }
  }

  // Fallback to current month
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// BP-07 FIX: Extended to cover more Meta Ads footer/header row patterns
export function isTotalOrMetadata(name) {
  if (!name) return true;
  const lowercaseName = String(name).toLowerCase().trim();
  
  // Padrões de dash/traço — o Google Ads usa "--" em linhas de subtotal/total
  // Ex: coluna Campanha = "--" nas linhas de total por segmentação
  if (/^[-–—\s]+$/.test(lowercaseName)) return true; // apenas traços/hífens/espaços

  return (
    lowercaseName === "total" ||
    lowercaseName.startsWith("total:") ||
    lowercaseName.startsWith("total ") ||
    lowercaseName === "total geral" ||
    lowercaseName === "resumo" ||
    // Google Ads aggregate row patterns
    lowercaseName === "todas as campanhas" ||
    lowercaseName === "all campaigns" ||
    lowercaseName === "todos os conjuntos de anúncios" ||
    lowercaseName === "all ad sets" ||
    lowercaseName === "todos os anúncios" ||
    lowercaseName === "all ads" ||
    lowercaseName === "sem campanha" ||
    lowercaseName === "unknown" ||
    lowercaseName === "(not set)" ||
    lowercaseName === "(not provided)" ||
    lowercaseName.startsWith("período:") ||
    lowercaseName.startsWith("period:") ||
    lowercaseName.includes("filtros aplicados") ||
    lowercaseName.includes("relatório gerado") ||
    lowercaseName.includes("gerado em") ||
    // Meta Ads specific footer patterns
    lowercaseName.startsWith("resultados encontrados:") ||
    lowercaseName.startsWith("configuração de atribuição:") ||
    lowercaseName.startsWith("configuracao de atribuicao:") ||
    lowercaseName.startsWith("orçamento") ||
    lowercaseName.startsWith("orcamento") ||
    lowercaseName.includes("account id") ||
    lowercaseName.includes("account name") ||
    lowercaseName === "soma de resultados" ||
    lowercaseName === "encerramento dos relatórios" ||
    lowercaseName === "início dos relatórios" ||
    (lowercaseName.startsWith("\"encerramento") || lowercaseName.startsWith("encerramento dos"))
  );
}

// ----------------------------------------------------
// Master ETL Processing Function
// ----------------------------------------------------

export async function processUploadFile(file) {
  let rows = [];
  const fileName = file.name;

  if (fileName.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    rows = parseCsv(text);
  } else if (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")) {
    rows = await parseExcelFile(file);
  } else {
    throw new Error("Formato de arquivo não suportado (apenas CSV, XLS e XLSX).");
  }

  if (rows.length === 0) {
    throw new Error("Arquivo vazio ou sem dados legíveis.");
  }

  const rowKeys = Object.keys(rows[0]);
  const lowerFileName = fileName.toLowerCase();
  const platform = detectPlatform(fileName, rowKeys, rows);
  let dataset_type = detectDataset(platform, rowKeys);
  if (lowerFileName.includes("campanha")) {
    dataset_type = platform === "meta" ? "meta_campaign_performance" : "campaign_performance";
  }
  if (lowerFileName.includes("dispositivo")) dataset_type = "device_performance";
  if (lowerFileName.includes("palavras-chave") || lowerFileName.includes("palavra-chave")) dataset_type = "search_keywords";
  if (lowerFileName.includes("pesquisa")) dataset_type = "search_terms";
  if (lowerFileName.includes("rede")) dataset_type = "network_performance";
  if (lowerFileName.includes("sexo") || lowerFileName.includes("idade") || lowerFileName.includes("demogr")) dataset_type = "demographics_gender_age";
  if (lowerFileName.includes("dia_e_hora") || lowerFileName.includes("dia-hora")) dataset_type = "weekday_hour_performance";
  if (lowerFileName.includes("série_temporal") || lowerFileName.includes("serie_temporal")) dataset_type = "daily_time_series";
  const reference_month = inferReferenceMonth(fileName, rows);
  const reference_label = `${MONTHS_PT[parseInt(reference_month.split("-")[1], 10) - 1]}/${reference_month.split("-")[0]}`;

  // Simple string-based content hash for fingerprinting
  const fileStringSample = JSON.stringify(rows.slice(0, 50));
  let file_hash = 0;
  for (let i = 0; i < fileStringSample.length; i++) {
    file_hash = (file_hash << 5) - file_hash + fileStringSample.charCodeAt(i);
    file_hash |= 0;
  }
  file_hash = Math.abs(file_hash).toString(16);

  const normalizedRows = rows
    .filter(row => {
      // Filter out total sum rows and metadata headers
      const campName = getSemanticValue(row, "campaign_name");
      
      // Se a coluna de campanha está presente no cabeçalho mas seu valor está vazio nesta linha,
      // consideramos uma linha de total ou rodapé do relatório (e.g. Meta Ads) e a descartamos.
      const hasCampHeader = Object.keys(row).some(k => {
        const syns = SYNONYMS.campaign_name || [];
        const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const normK = normalize(k);
        return syns.some(syn => normalize(syn) === normK);
      });
      
      if (hasCampHeader && (campName === undefined || campName === null || String(campName).trim() === "")) {
        return false;
      }

      const deviceName = getSemanticValue(row, "device");
      const dayName = getSemanticValue(row, "date");
      const searchName = getSemanticValue(row, "search_term");
      const keywordName = getSemanticValue(row, "keyword");
      const hasAnyMetric =
        parseFormattedFloat(getSemanticValue(row, "spend", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "clicks", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "impressions", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "conversions", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "revenue", 0)) > 0;
      
      const primaryKey = campName || deviceName || dayName || searchName || keywordName || "";
      return (primaryKey || hasAnyMetric) && !isTotalOrMetadata(primaryKey || "linha com métrica");
    })
    .map((row, idx) => {
      // Map row keys to Universal Schema
      const campName = getSemanticValue(row, "campaign_name");
      const deviceName = getSemanticValue(row, "device");
      const genderName = getSemanticValue(row, "gender");
      const ageName = getSemanticValue(row, "age_range");
      const keyName = getSemanticValue(row, "keyword");
      const termName = getSemanticValue(row, "search_term");
      const netName = getSemanticValue(row, "network");
      
      const dateVal = getSemanticValue(row, "date");
      const hourVal = getSemanticValue(row, "hour");

      // Set fallback if date is missing
      const enrichedDate = applyTemporalIntelligence(dateVal || `${reference_month}-01`);

      // Parsing numeric values safely
      const spend = parseFormattedFloat(getSemanticValue(row, "spend", 0));
      const clicks = Math.round(parseFormattedFloat(getSemanticValue(row, "clicks", 0)));
      const impressions = Math.round(parseFormattedFloat(getSemanticValue(row, "impressions", 0)));
      const conversions = Math.round(parseFormattedFloat(getSemanticValue(row, "conversions", 0)));
      // FIX: Leads NUNCA herda conversions como fallback.
      // Se a coluna de leads não existe no arquivo, leads = 0.
      // Isso evita dupla contagem: conversions + leads = 2x o mesmo número.
      // leads_is_derived = true indica que a coluna real não estava presente.
      const leadsRawVal = getSemanticValue(row, "leads"); // undefined = coluna ausente
      const leadsRaw = leadsRawVal !== undefined
        ? Math.round(parseFormattedFloat(leadsRawVal))
        : -1;
      const leads = leadsRaw >= 0 ? leadsRaw : 0;
      const leads_is_derived = leadsRaw < 0; // flag: não tem coluna real de leads
      const reach = Math.round(parseFormattedFloat(getSemanticValue(row, "reach", 0)));
      const frequency = parseFormattedFloat(getSemanticValue(row, "frequency", 0));
      const revenue = parseFormattedFloat(getSemanticValue(row, "revenue", 0));

      // Re-calculate standard metrics safely to avoid trusting raw sheet calculations
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const cpl = leads > 0 ? spend / leads : 0;
      const cac = conversions > 0 ? spend / conversions : 0;
      const roas = spend > 0 ? revenue / spend : 0;

      // Adset / Ad names (Meta Ads)
      const adsetName = getSemanticValue(row, "adset_name");
      const adName    = getSemanticValue(row, "ad_name");

      const normalizedRow = {
        platform,
        dataset_type,
        // CRÍTICO: não usar nome genérico compartilhado como fallback.
        // "Campanha Geral" para TODAS as linhas sem nome = chaves idênticas = dedup remove dados reais.
        // Usa o spend como parte do identificador único para distinguir linhas sem campanha.
        campaign_name: sanitizeMojibake(campName) || `Campanha Meta ${spend > 0 ? spend.toFixed(2) : idx}`,

        adset_name: sanitizeMojibake(adsetName) || null,
        ad_name: sanitizeMojibake(adName) || null,
        device: sanitizeMojibake(deviceName) || null,
        gender: sanitizeMojibake(genderName) || null,
        age_range: sanitizeMojibake(ageName) || null,
        keyword: sanitizeMojibake(keyName) || null,
        search_term: sanitizeMojibake(termName) || null,
        network: sanitizeMojibake(netName) || null,

        // Time intelligence attributes
        date: enrichedDate.date,
        day: enrichedDate.day,
        week: enrichedDate.week,
        month: enrichedDate.month,
        month_name: enrichedDate.month_name,
        quarter: enrichedDate.quarter,
        year: enrichedDate.year,
        year_month: enrichedDate.year_month,
        reference_month,
        reference_label,
        hour: hourVal !== undefined ? parseInt(String(hourVal).match(/\d+/)?.[0] || "0", 10) : null,

        // Core Metrics
        spend,
        clicks,
        impressions,
        conversions,
        leads,
        leads_is_derived, // true = coluna de leads ausente no arquivo original
        reach: reach || null,
        frequency: frequency || null,
        revenue,

        // Métricas derivadas recalculadas matematicamente (nunca confiando nas do arquivo)
        ctr,
        cpc,
        cpm,
        cpl,
        cac,
        roas,

        status: sanitizeMojibake(getSemanticValue(row, "status")) || "Ativo",
        raw_file_name: fileName,
        file_hash,
        created_at: new Date().toISOString()
      };

      // FIX: ID determinístico baseado nos dados da linha (não em Date.now()).
      // Garante idempotência: importar o mesmo arquivo 2x = mesmo ID = dedup funciona.
      normalizedRow.id = buildDeterministicId(normalizedRow);

      return normalizedRow;
    });

  // Calcula o total real de investimento do arquivo para validação pós-importação.
  // Esse valor é comparado com o total consolidado no banco após o insert.
  const reportTotal = normalizedRows.reduce((sum, r) => {
    // Apenas linhas SEM segmentação para não duplicar o total
    // (linhas com device/keyword são sub-cortes do mesmo investimento)
    if (r.device || r.keyword || r.gender || r.age_range || r.search_term) return sum;
    return sum + (r.spend || 0);
  }, 0);

  return {
    metadata: {
      platform,
      dataset_type,
      reference_month,
      reference_label,
      raw_file_name: fileName,
      file_hash,
      count: normalizedRows.length,
      reportTotal, // soma real do arquivo — usada para validação de integridade
    },
    rows: normalizedRows
  };
}
