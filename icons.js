// ===== オリジナルSVGアイコンセット =====
// viewBox="0 0 24 24"  stroke-based  strokeWidth=1.8
const ICONS = {
  // ナビゲーション
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>`,

  journal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4h16v16H4z" rx="2"/>
    <path d="M8 8h8M8 12h8M8 16h5"/>
    <path d="M4 4v16"/>
    <rect x="2" y="4" width="3" height="16" rx="1" fill="currentColor" opacity="0.15"/>
  </svg>`,

  ledger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M3 15h18M9 9v9M15 9v9"/>
  </svg>`,

  tax: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M9 9h.01M15 15h.01"/>
    <path d="M15 9L9 15"/>
    <path d="M9 8.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1zM15 14.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1z" fill="currentColor" stroke="none"/>
  </svg>`,

  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/>
    <path d="M14 3v6h6"/>
    <path d="M8 13h8M8 17h5"/>
  </svg>`,

  // セクション
  income: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v10M8 11l4-4 4 4"/>
  </svg>`,

  expense: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v10M8 13l4 4 4-4"/>
  </svg>`,

  profit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 17l4-4 4 3 5-6 3 2"/>
    <path d="M21 7h-4v4"/>
    <rect x="3" y="20" width="18" height="1.5" rx=".75" fill="currentColor" stroke="none" opacity="0.3"/>
  </svg>`,

  budget: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6" width="20" height="14" rx="2"/>
    <path d="M16 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
    <path d="M2 10h20"/>
    <path d="M6 14h2"/>
  </svg>`,

  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 20V10l5-3 5 3 5-5"/>
    <path d="M3 20h18"/>
    <circle cx="8" cy="7" r="1" fill="currentColor" stroke="none"/>
    <circle cx="13" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="18" cy="5" r="1" fill="currentColor" stroke="none"/>
  </svg>`,

  donut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 3a9 9 0 0 1 9 9" stroke-width="3" opacity="0.4"/>
  </svg>`,

  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M8 2v4M16 2v4"/>
    <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>
    <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
  </svg>`,

  kasji: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12h18"/>
    <path d="M3 6h18"/>
    <path d="M3 18h18"/>
    <rect x="12" y="4" width="9" height="4" rx="1" fill="currentColor" opacity="0.2" stroke="none"/>
    <rect x="12" y="10" width="9" height="4" rx="1" fill="currentColor" opacity="0.2" stroke="none"/>
  </svg>`,

  taxSummary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 14l2 2 4-4"/>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M9 3v6"/>
  </svg>`,

  recent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>`,

  import: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <path d="M7 10l5 5 5-5"/>
    <path d="M12 15V3"/>
  </svg>`,

  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <path d="M12 9v4M12 17h.01"/>
  </svg>`,

  // フォームアイコン
  date: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M3 9h18M8 2v4M16 2v4"/>
  </svg>`,

  debit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v14M5 12l7-7 7 7"/>
    <rect x="3" y="18" width="18" height="2" rx="1" fill="currentColor" opacity="0.2" stroke="none"/>
  </svg>`,

  credit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 19V5M5 12l7 7 7-7"/>
    <rect x="3" y="4" width="18" height="2" rx="1" fill="currentColor" opacity="0.2" stroke="none"/>
  </svg>`,

  memo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>
    <path d="M18 2l4 4-9 9H9v-4l9-9z"/>
  </svg>`,

  kasjiForm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <path d="M9 22V12h6v10"/>
  </svg>`,

  account: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    <path d="M2 10h20"/>
    <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/>
  </svg>`,

  taxForm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>`,

  amount: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>`,

  // 決算・エクスポート
  pl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2"/>
    <path d="M8 7h8M8 11h8M8 15h5"/>
    <path d="M2 7h20" opacity="0.3"/>
  </svg>`,

  bs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2"/>
    <path d="M12 3v18"/>
    <path d="M2 12h20" opacity="0.3"/>
    <path d="M6 7h3M6 10h2M6 15h3M6 18h2"/>
    <path d="M15 7h3M15 10h2M15 15h3M15 18h2"/>
  </svg>`,

  export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <path d="M17 8l-5-5-5 5"/>
    <path d="M12 3v12"/>
  </svg>`,

  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,

  ledgerAccount: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <path d="M8 7h8M8 11h6M8 15h4"/>
  </svg>`,
};

// アイコンをSVG文字列で返すヘルパー
function icon(name, cls = '') {
  const svg = ICONS[name];
  if (!svg) return '';
  // classをrootのsvgタグに付与
  return svg.replace('<svg ', `<svg class="icon ${cls}" `);
}
