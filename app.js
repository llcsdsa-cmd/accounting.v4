// ===== 状態管理 =====
let entries = JSON.parse(localStorage.getItem('kaikei_entries') || '[]');
let taxSettings = JSON.parse(localStorage.getItem('kaikei_tax') || '{"method":"exempt","industry":"0.5"}');
let currentPage = 'dashboard';

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', async () => {
  await handleOAuthCallback(); // Google Drive OAuth コールバック処理
  initIcons();
  initAccountSelects();
  initJournalMonth();
  initReportYear();
  initChartYearSelect();
  loadTaxSettings();
  renderAll();
  renderSettingsPage();
  navigate('dashboard');
});

// ===== アイコン初期化 =====
function initIcons() {
  const navMap = {
    'nav-icon-dashboard':    'dashboard',
    'nav-icon-journal':      'journal',
    'nav-icon-ledger':       'ledger',
    'nav-icon-tax':          'tax',
    'nav-icon-dencho':       'dencho',
    'nav-icon-report':       'report',
    'nav-icon-settings-tab': 'settingsNav',
  };
  Object.entries(navMap).forEach(([id, name]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon(name, 'nav-svg');
  });

  const secMap = {
    'sec-icon-budget':      'budget',
    'sec-icon-chart':       'chart',
    'sec-icon-donut':       'donut',
    'sec-icon-donut2':      'donut',
    'sec-icon-calendar':    'calendar',
    'sec-icon-kasji':       'kasji',
    'sec-icon-taxSummary':  'taxSummary',
    'sec-icon-taxSummary2': 'taxSummary',
    'sec-icon-recent':      'recent',
    'sec-icon-settings':    'settings',
    'sec-icon-pl':          'pl',
    'sec-icon-bs':          'bs',
    'sec-icon-export':      'export',
    'sec-icon-cloud':        'cloud',
    'sec-icon-backup-set':   'backupIcon',
    'sec-icon-import-map':   'import',
    'sec-icon-datamanage':   'dangerIcon',
    'sec-icon-search':       'search',
    'sec-icon-checklist':    'checklist',
  };
  Object.entries(secMap).forEach(([id, name]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon(name, 'sec-svg');
  });

  const kpiMap = {
    'kpi-icon-income':  ['income', 'kpi-svg'],
    'kpi-icon-expense': ['expense', 'kpi-svg'],
  };
  Object.entries(kpiMap).forEach(([id, [name, cls]]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon(name, cls);
  });
  const profEl = document.getElementById('kpi-icon-profit');
  if (profEl) profEl.innerHTML = icon('profit', 'kpi-svg profit-svg');

  const imp = document.getElementById('import-svg-icon');
  if (imp) imp.innerHTML = icon('import', 'import-lg-svg');

  const formMap = {
    'fl-date':           'date',
    'fl-debit-account':  'account',
    'fl-debit-tax':      'taxForm',
    'fl-debit-amount':   'amount',
    'fl-credit-account': 'account',
    'fl-credit-tax':     'taxForm',
    'fl-credit-amount':  'amount',
    'fl-memo':           'memo',
    'fl-kasji':          'kasjiForm',
  };
  Object.entries(formMap).forEach(([id, name]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon(name, 'form-svg');
  });

  const debitEl = document.getElementById('dc-icon-debit');
  if (debitEl) debitEl.innerHTML = icon('debit', 'dc-svg');
  const creditEl = document.getElementById('dc-icon-credit');
  if (creditEl) creditEl.innerHTML = icon('credit', 'dc-svg');

  const expMap = {
    'exp-icon-journal': 'journal',
    'exp-icon-pl':      'pl',
    'exp-icon-tax':     'tax',
    'exp-icon-backup':  'backupIcon',
    'exp-icon-restore': 'restoreIcon',
  };
  Object.entries(expMap).forEach(([id, name]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon(name, 'exp-svg');
  });
}

function renderAll() {
  updateDashboard();
  renderJournal();
  renderLedger();
  renderTax();
  renderReport();
  renderDencho();
  renderSettingsPage();
}

// ===== ナビゲーション =====
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById('main-content').scrollTop = 0;
  if (page === 'settings') {
    renderSettingsPage();
    // 設定ページのsec-iconを注入
    const settingsSecMap = {
      'sec-icon-cloud':      'cloud',
      'sec-icon-backup-set': 'backupIcon',
      'sec-icon-import-map': 'import',
      'sec-icon-datamanage': 'dangerIcon',
    };
    Object.entries(settingsSecMap).forEach(([id, name]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = icon(name, 'sec-svg');
    });
  }
}

// ===== 勘定科目セレクト初期化 =====
function initAccountSelects() {
  const selects = ['f-debit-account', 'f-credit-account', 'ledger-account'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    if (id === 'ledger-account') {
      sel.innerHTML = '<option value="">科目を選択</option>';
    } else {
      sel.innerHTML = '<option value="">選択してください</option>';
    }
    Object.entries(ACCOUNTS).forEach(([key, group]) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      group.items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.name;
        opt.textContent = item.name;
        optgroup.appendChild(opt);
      });
      sel.appendChild(optgroup);
    });
  });
}

function initJournalMonth() {
  const now = new Date();
  document.getElementById('journal-month').value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function initReportYear() {
  const sel = document.getElementById('report-year');
  const now = new Date();
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `${y}年`;
    sel.appendChild(opt);
  }
}

// ===== フォーマット =====
function fmt(n) {
  const v = Math.round(n);
  return '¥' + v.toLocaleString('ja-JP');
}
function fmtDate(d) {
  return d.replace(/-/g, '/');
}

// ===== 消費税計算 =====
function getTaxRate(taxCode) {
  if (taxCode === 'exempt10' || taxCode === 'input10') return 0.10;
  if (taxCode === 'exempt8' || taxCode === 'input8') return 0.08;
  return 0;
}

function calcTaxAmount(amount, taxCode) {
  const rate = getTaxRate(taxCode);
  if (rate === 0) return 0;
  // 税込金額から税額を逆算
  return Math.round(amount * rate / (1 + rate));
}

function calcTax() {
  ['debit', 'credit'].forEach(side => {
    const taxSel = document.getElementById(`f-${side}-tax`);
    const amtInput = document.getElementById(`f-${side}-amount`);
    const display = document.getElementById(`${side}-tax-display`);
    if (!taxSel || !amtInput || !display) return;
    const taxCode = taxSel.value;
    const amount = parseFloat(amtInput.value) || 0;
    const taxAmt = calcTaxAmount(amount, taxCode);
    if (taxAmt > 0) {
      const rate = getTaxRate(taxCode) * 100;
      display.textContent = `消費税（${rate}%）: ${fmt(taxAmt)}  本体: ${fmt(amount - taxAmt)}`;
      display.style.display = 'block';
    } else {
      display.style.display = 'none';
    }
  });
  checkBalance();
  updateKasjiPreview();
}

// ===== 貸借チェック =====
function checkBalance() {
  const da = parseFloat(document.getElementById('f-debit-amount').value) || 0;
  const ca = parseFloat(document.getElementById('f-credit-amount').value) || 0;
  const status = document.getElementById('balance-status');
  const check = document.getElementById('balance-check');
  if (da === 0 && ca === 0) {
    status.textContent = '借方・貸方を入力してください';
    check.className = 'balance-check';
  } else if (da === ca && da > 0) {
    status.textContent = '✓ 借方 = 貸方（バランス OK）';
    check.className = 'balance-check ok';
  } else {
    status.textContent = `差額: ${fmt(Math.abs(da - ca))}（借方 ${fmt(da)} / 貸方 ${fmt(ca)}）`;
    check.className = 'balance-check error';
  }
}

// ===== 科目変更時の処理 =====
function onAccountChange(side) {
  // 科目に応じてデフォルト税区分を設定
  const accountName = document.getElementById(`f-${side}-account`).value;
  const acc = getAccountByName(accountName);
  if (!acc) return;
  const taxSel = document.getElementById(`f-${side}-tax`);
  if (acc.type === 'income') taxSel.value = 'exempt10';
  else if (acc.type === 'expense') taxSel.value = 'input10';
  else taxSel.value = 'non';
  calcTax();

  // 家事按分対象科目なら家事按分を促す
  if (acc && KASJI_ELIGIBLE.includes(acc.code)) {
    document.getElementById('f-kasji-enabled').checked = false;
    // ヒント表示
    document.getElementById('f-kasji-enabled').parentElement.parentElement.style.border = '1px solid #c8a86b';
  }
}

// ===== 家事按分 =====
function toggleKasji() {
  const enabled = document.getElementById('f-kasji-enabled').checked;
  document.getElementById('kasji-detail').style.display = enabled ? 'block' : 'none';
  updateKasjiPreview();
}

function updateKasjiPreview() {
  const enabled = document.getElementById('f-kasji-enabled').checked;
  if (!enabled) return;
  const amount = parseFloat(document.getElementById('f-debit-amount').value) ||
                 parseFloat(document.getElementById('f-credit-amount').value) || 0;
  const rate = parseFloat(document.getElementById('f-kasji-rate').value) || 50;
  const bizAmount = Math.round(amount * rate / 100);
  document.getElementById('kasji-preview').textContent = fmt(bizAmount);
}

// ===== モーダル =====
function openEntryModal(entryId = null) {
  resetModal();
  if (entryId) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    document.getElementById('modal-title').textContent = '仕訳編集';
    document.getElementById('edit-id').value = entryId;
    document.getElementById('f-date').value = entry.date;
    document.getElementById('f-debit-account').value = entry.debit.account;
    document.getElementById('f-debit-sub').value = entry.debit.sub || '';
    document.getElementById('f-debit-tax').value = entry.debit.taxCode || 'non';
    document.getElementById('f-debit-amount').value = entry.debit.amount;
    document.getElementById('f-credit-account').value = entry.credit.account;
    document.getElementById('f-credit-sub').value = entry.credit.sub || '';
    document.getElementById('f-credit-tax').value = entry.credit.taxCode || 'non';
    document.getElementById('f-credit-amount').value = entry.credit.amount;
    document.getElementById('f-memo').value = entry.memo || '';
    if (entry.kasji) {
      document.getElementById('f-kasji-enabled').checked = true;
      document.getElementById('f-kasji-rate').value = entry.kasji.rate;
      toggleKasji();
    }
    calcTax();
  } else {
    document.getElementById('modal-title').textContent = '新規仕訳';
    const now = new Date();
    document.getElementById('f-date').value = now.toISOString().slice(0, 10);
  }
  document.getElementById('modal-overlay').style.display = 'flex';
}

function resetModal() {
  document.getElementById('edit-id').value = '';
  document.getElementById('f-date').value = '';
  document.getElementById('f-debit-account').value = '';
  document.getElementById('f-debit-sub').value = '';
  document.getElementById('f-debit-tax').value = 'non';
  document.getElementById('f-debit-amount').value = '';
  document.getElementById('f-credit-account').value = '';
  document.getElementById('f-credit-sub').value = '';
  document.getElementById('f-credit-tax').value = 'non';
  document.getElementById('f-credit-amount').value = '';
  document.getElementById('f-memo').value = '';
  document.getElementById('f-kasji-enabled').checked = false;
  document.getElementById('f-kasji-rate').value = '50';
  document.getElementById('kasji-detail').style.display = 'none';
  document.getElementById('debit-tax-display').style.display = 'none';
  document.getElementById('credit-tax-display').style.display = 'none';
  document.getElementById('balance-check').className = 'balance-check';
  document.getElementById('balance-status').textContent = '借方・貸方を入力してください';
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-overlay')) closeEntryModal();
}

function closeEntryModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

  const debitTaxCode = document.getElementById('f-debit-tax').value;
  const creditTaxCode = document.getElementById('f-credit-tax').value;
  const kasjiEnabled = document.getElementById('f-kasji-enabled').checked;
  const kasjiRate = parseFloat(document.getElementById('f-kasji-rate').value) || 50;

  const entry = {
    id: document.getElementById('edit-id').value || Date.now().toString(),
    date,
    debit: {
      account: debitAccount,
      sub: document.getElementById('f-debit-sub').value,
      amount: debitAmount,
      taxCode: debitTaxCode,
      taxAmount: calcTaxAmount(debitAmount, debitTaxCode),
    },
    credit: {
      account: creditAccount,
      sub: document.getElementById('f-credit-sub').value,
      amount: creditAmount,
      taxCode: creditTaxCode,
      taxAmount: calcTaxAmount(creditAmount, creditTaxCode),
    },
    memo: document.getElementById('f-memo').value,
    kasji: kasjiEnabled ? { rate: kasjiRate, bizAmount: Math.round(debitAmount * kasjiRate / 100) } : null,
    createdAt: Date.now(),
    manually_saved: true, // 済マークを出すためのフラグ
  };

  const existIdx = entries.findIndex(e => e.id === entry.id);
  if (existIdx >= 0) entries[existIdx] = entry;
  else entries.push(entry);

  entries.sort((a, b) => a.date.localeCompare(b.date));
  saveData();
  closeEntryModal();

  renderAll();
  showToast('仕訳を保存しました', 'success');
}

function deleteEntry(id) {
  if (!confirm('この仕訳を削除しますか？')) return;
  entries = entries.filter(e => e.id !== id);
  saveData();
  renderAll();
  showToast('削除しました', 'info');
}

function saveData() {
  const data = {
    entries,
    taxSettings,
    dencho: typeof dencho !== 'undefined' ? dencho : [],
    budget: JSON.parse(localStorage.getItem('kaikei_budget') || '{}'),
  };
  saveAllData(data).then(({ primaryOk }) => {
    if (!primaryOk && storageSettings.primary !== 'local') {
      showToast(`${providerLabel(storageSettings.primary)} への保存失敗 — ローカルに保存済`, 'error');
    }
  });
}

// ===== ダッシュボード =====
function updateDashboard() {
  const period = document.getElementById('period-select').value;
  const now = new Date();
  let filtered = entries.filter(e => {
    const d = new Date(e.date);
    if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q;
    }
    return d.getFullYear() === now.getFullYear();
  });

  // 前期間（比較用）
  let prevFiltered = entries.filter(e => {
    const d = new Date(e.date);
    if (period === 'month') {
      const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === py && d.getMonth() === pm;
    }
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const pq = q === 0 ? 3 : q - 1;
      const py = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === py && Math.floor(d.getMonth() / 3) === pq;
    }
    return d.getFullYear() === now.getFullYear() - 1;
  });

  function calcSums(list) {
    let income = 0, expense = 0, kasjiTotal = 0, kasjiBiz = 0, kasjiHome = 0;
    let taxSales10 = 0, taxReceived = 0, taxPaid = 0;
    list.forEach(e => {
      const creditType = getAccountType(e.credit.account);
      const debitType = getAccountType(e.debit.account);
      if (creditType === 'income') income += e.credit.amount;
      if (debitType === 'expense') {
        const expAmt = e.kasji ? e.kasji.bizAmount : e.debit.amount;
        expense += expAmt;
        if (e.kasji) { kasjiTotal += e.debit.amount; kasjiBiz += e.kasji.bizAmount; kasjiHome += e.debit.amount - e.kasji.bizAmount; }
      }
      if (e.debit.taxCode === 'exempt10') { taxSales10 += e.debit.amount; taxReceived += e.debit.taxAmount; }
      if (e.credit.taxCode === 'exempt10') { taxSales10 += e.credit.amount; taxReceived += e.credit.taxAmount; }
      if (e.debit.taxCode === 'input10' || e.debit.taxCode === 'input8') taxPaid += e.debit.taxAmount;
      if (e.credit.taxCode === 'input10' || e.credit.taxCode === 'input8') taxPaid += e.credit.taxAmount;
    });
    return { income, expense, kasjiTotal, kasjiBiz, kasjiHome, taxSales10, taxReceived, taxPaid };
  }

  const cur = calcSums(filtered);
  const prev = calcSums(prevFiltered);

  document.getElementById('dash-income').textContent = fmt(cur.income);
  document.getElementById('dash-expense').textContent = fmt(cur.expense);

  // 前期比デルタ
  function deltaHtml(cur, prev, reverseColor = false) {
    if (prev === 0) return '';
    const diff = cur - prev;
    const pct = Math.round(diff / prev * 100);
    const up = diff >= 0;
    const positive = reverseColor ? !up : up;
    const sign = up ? '▲' : '▼';
    const cls = positive ? 'delta-up' : 'delta-down';
    return `<span class="s-delta ${cls}">${sign} ${Math.abs(pct)}%</span>`;
  }
  document.getElementById('dash-income-delta').innerHTML = deltaHtml(cur.income, prev.income);
  document.getElementById('dash-expense-delta').innerHTML = deltaHtml(cur.expense, prev.expense, true);

  const profit = cur.income - cur.expense;
  document.getElementById('dash-profit').textContent = fmt(profit);
  document.getElementById('dash-profit').style.color = profit >= 0 ? '#1a7a5e' : '#b03a2e';
  document.getElementById('dash-profit-sub').textContent = profit >= 0 ? '黒字' : '赤字';

  document.getElementById('按分-before').textContent = fmt(cur.kasjiTotal);
  document.getElementById('按分-biz').textContent = fmt(cur.kasjiBiz);
  document.getElementById('按分-home').textContent = fmt(cur.kasjiHome);
  document.getElementById('dash-tax-sales10').textContent = fmt(cur.taxSales10);
  document.getElementById('dash-tax-received').textContent = fmt(cur.taxReceived);
  document.getElementById('dash-tax-paid').textContent = fmt(cur.taxPaid);

  // アラートチェック
  checkAlerts(cur.income, cur.expense);

  // 予算表示更新
  renderBudgetDisplay(cur.income, cur.expense);

  // 最近の仕訳（5件）
  const recent = [...entries].reverse().slice(0, 5);
  const el = document.getElementById('recent-entries');
  if (recent.length === 0) {
    el.innerHTML = '<div class="empty-msg">仕訳がまだありません</div>';
  } else {
    el.innerHTML = recent.map(e => entryCard(e, true)).join('');
  }

  // グラフ・カレンダー更新
  renderCharts();
  renderCalendar();
}

// ===== 予算管理 =====
let budget = JSON.parse(localStorage.getItem('kaikei_budget') || '{"income":0,"expense":0}');

function toggleBudgetEdit() {
  const edit = document.getElementById('budget-edit');
  const isOpen = edit.style.display !== 'none';
  if (!isOpen) {
    document.getElementById('budget-income').value = budget.income || '';
    document.getElementById('budget-expense').value = budget.expense || '';
  }
  edit.style.display = isOpen ? 'none' : 'block';
}

function saveBudget() {
  budget.income = parseFloat(document.getElementById('budget-income').value) || 0;
  budget.expense = parseFloat(document.getElementById('budget-expense').value) || 0;
  localStorage.setItem('kaikei_budget', JSON.stringify(budget));
  document.getElementById('budget-edit').style.display = 'none';
  updateDashboard();
  showToast('予算を保存しました', 'success');
}

function renderBudgetDisplay(income, expense) {
  const el = document.getElementById('budget-display');
  if (!budget.income && !budget.expense) {
    el.innerHTML = '<div class="budget-empty">予算未設定 — 右の「編集」から設定できます</div>';
    return;
  }
  function bar(label, actual, target, isExpense) {
    if (!target) return '';
    const pct = Math.min(100, Math.round(actual / target * 100));
    const over = isExpense ? actual > target : actual < target * 0.5;
    const barColor = over ? '#b03a2e' : '#1a7a5e';
    return `
      <div class="budget-row">
        <div class="budget-row-head">
          <span class="budget-name">${label}</span>
          <span class="budget-vals">${fmt(actual)} / ${fmt(target)}</span>
        </div>
        <div class="budget-bar-bg">
          <div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div class="budget-pct" style="color:${barColor}">${pct}%${over ? (isExpense ? ' 超過！' : ' 未達') : ''}</div>
      </div>`;
  }
  el.innerHTML = bar('収入目標', income, budget.income, false) + bar('支出上限', expense, budget.expense, true);
}

// ===== アラート =====
function checkAlerts(income, expense) {
  const alerts = [];
  if (budget.expense > 0 && expense > budget.expense) {
    alerts.push({ type: 'danger', msg: `支出が予算を超過しています（${fmt(expense - budget.expense)} オーバー）` });
  } else if (budget.expense > 0 && expense > budget.expense * 0.9) {
    alerts.push({ type: 'warn', msg: `支出が予算の90%に達しています` });
  }
  if (budget.income > 0 && income < budget.income * 0.5) {
    alerts.push({ type: 'warn', msg: `収入が目標の50%を下回っています` });
  }
  const banner = document.getElementById('alert-banner');
  if (alerts.length === 0) { banner.style.display = 'none'; return; }
  banner.style.display = 'block';
  banner.innerHTML = alerts.map(a =>
    `<div class="alert-item alert-${a.type}">${a.type === 'danger' ? '⚠️' : '💡'} ${a.msg}</div>`
  ).join('');
}

// ===== グラフ =====
let monthlyChart = null;
let categoryChart = null;
let catTabMode = 'expense';

function initChartYearSelect() {
  const sel = document.getElementById('chart-year');
  if (!sel) return;
  const now = new Date();
  sel.innerHTML = '';
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = `${y}年`;
    sel.appendChild(opt);
  }
}

function switchCatTab(mode) {
  catTabMode = mode;
  document.getElementById('cat-tab-expense').classList.toggle('active', mode === 'expense');
  document.getElementById('cat-tab-income').classList.toggle('active', mode === 'income');
  renderCharts();
}

function renderCharts() {
  renderMonthlyChart();
  renderCategoryChart();
}

function renderMonthlyChart() {
  const yearEl = document.getElementById('chart-year');
  if (!yearEl) return;
  const year = parseInt(yearEl.value) || new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const labels = months.map(m => `${m + 1}月`);
  const incomeData = new Array(12).fill(0);
  const expenseData = new Array(12).fill(0);

  entries.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() !== year) return;
    const m = d.getMonth();
    const ct = getAccountType(e.credit.account);
    const dt = getAccountType(e.debit.account);
    if (ct === 'income') incomeData[m] += e.credit.amount;
    if (dt === 'expense') expenseData[m] += e.kasji ? e.kasji.bizAmount : e.debit.amount;
  });

  const ctx = document.getElementById('monthly-chart');
  if (!ctx) return;
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '収入', data: incomeData, backgroundColor: 'rgba(26,122,94,0.75)', borderRadius: 4, order: 2 },
        { label: '支出', data: expenseData, backgroundColor: 'rgba(176,58,46,0.75)', borderRadius: 4, order: 2 },
        { label: '利益', data: incomeData.map((v, i) => v - expenseData[i]),
          type: 'line', borderColor: '#3d4a6b', backgroundColor: 'rgba(61,74,107,0.08)',
          tension: 0.4, pointRadius: 3, fill: true, order: 1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ¥${Math.round(ctx.raw).toLocaleString('ja-JP')}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 10 }, callback: v => v >= 10000 ? `${Math.round(v/10000)}万` : v } }
      }
    }
  });
}

function renderCategoryChart() {
  const now = new Date();
  const year = parseInt((document.getElementById('chart-year') || {}).value) || now.getFullYear();
  const catMap = {};

  entries.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() !== year) return;
    if (catTabMode === 'expense') {
      const dt = getAccountType(e.debit.account);
      if (dt !== 'expense') return;
      const key = e.debit.account;
      catMap[key] = (catMap[key] || 0) + (e.kasji ? e.kasji.bizAmount : e.debit.amount);
    } else {
      const ct = getAccountType(e.credit.account);
      if (ct !== 'income') return;
      const key = e.credit.account;
      catMap[key] = (catMap[key] || 0) + e.credit.amount;
    }
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const labels = sorted.map(([k]) => k);
  const data = sorted.map(([, v]) => v);
  const COLORS = ['#3d4a6b','#1a7a5e','#b03a2e','#8b6914','#2a5aad','#6b3d7a','#2a7a8b','#7a6b3d'];

  const ctx = document.getElementById('category-chart');
  if (!ctx) return;
  if (categoryChart) categoryChart.destroy();

  if (data.length === 0) {
    document.getElementById('category-legend').innerHTML = '<div class="empty-msg">データがありません</div>';
    return;
  }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: COLORS.slice(0, data.length), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ¥${Math.round(ctx.raw).toLocaleString('ja-JP')}` } }
      }
    }
  });

  const total = data.reduce((s, v) => s + v, 0);
  document.getElementById('category-legend').innerHTML = sorted.map(([k, v], i) =>
    `<div class="legend-row">
      <span class="legend-dot" style="background:${COLORS[i]}"></span>
      <span class="legend-name">${k}</span>
      <span class="legend-pct">${Math.round(v / total * 100)}%</span>
      <span class="legend-val">${fmt(v)}</span>
    </div>`
  ).join('');
}

// ===== カレンダー =====
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function calMove(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const titleEl = document.getElementById('cal-title');
  const gridEl = document.getElementById('calendar-grid');
  if (!titleEl || !gridEl) return;

  titleEl.textContent = `${calYear}年${calMonth + 1}月`;

  // 月内の取引日マップ作成
  const dayMap = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() !== calYear || d.getMonth() !== calMonth) return;
    const day = d.getDate();
    if (!dayMap[day]) dayMap[day] = { income: 0, expense: 0 };
    const ct = getAccountType(e.credit.account);
    const dt = getAccountType(e.debit.account);
    if (ct === 'income') dayMap[day].income += e.credit.amount;
    if (dt === 'expense') dayMap[day].expense += e.kasji ? e.kasji.bizAmount : e.debit.amount;
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;

  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  let html = DOW.map((d, i) =>
    `<div class="cal-dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>`
  ).join('');

  // 空白セル
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    const tx = dayMap[day];
    let dots = '';
    if (tx) {
      if (tx.income > 0) dots += '<span class="cal-dot income-dot"></span>';
      if (tx.expense > 0) dots += '<span class="cal-dot expense-dot"></span>';
    }
    const dow = (firstDay + day - 1) % 7;
    html += `<div class="cal-cell${isToday ? ' today' : ''}${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}" onclick="calDayClick(${day})">
      <span class="cal-day-num">${day}</span>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }
  gridEl.innerHTML = html;
}

function calDayClick(day) {
  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const monthStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}`;
  document.getElementById('journal-month').value = monthStr;
  navigate('journal');
  // 少し遅らせてから当日へスクロール
  setTimeout(() => {
    const cards = document.querySelectorAll('.entry-date');
    cards.forEach(c => { if (c.textContent === dateStr.replace(/-/g,'/')) c.closest('.entry-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }, 100);
}

// ===== 仕訳帳 =====
function renderJournal() {
  const month = document.getElementById('journal-month').value;
  const filter = document.getElementById('journal-filter').value;
  let filtered = entries.filter(e => e.date.startsWith(month));
  if (filter !== 'all') {
    filtered = filtered.filter(e => {
      const dt = getAccountType(e.debit.account);
      const ct = getAccountType(e.credit.account);
      if (filter === 'income') return ct === 'income';
      if (filter === 'expense') return dt === 'expense';
      if (filter === 'asset') return dt === 'asset' || ct === 'asset';
      return true;
    });
  }
  const el = document.getElementById('journal-list');
  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-msg">この期間の仕訳はありません</div>';
    return;
  }
  el.innerHTML = filtered.map(e => entryCard(e, false)).join('');
}

function entryCard(e, compact) {
  const kasjiTag = e.kasji ? `<span class="tag kasji-tag">家事按分 ${e.kasji.rate}%</span>` : '';
  const taxTag = (e.debit.taxAmount > 0 || e.credit.taxAmount > 0) ?
    `<span class="tag tax-tag">消費税</span>` : '';
  
  // ★追加：手動保存（確認済み）フラグがある場合に「済」タグを表示
  const checkedTag = e.manually_saved ? `<span class="tag checked-tag" style="background:#1a7a5e; color:white;">済</span>` : '';

  const debitType = getAccountType(e.debit.account);
  const creditType = getAccountType(e.credit.account);
  const amountColor = creditType === 'income' ? 'income-color' : (debitType === 'expense' ? 'expense-color' : '');

  return `
  <div class="entry-card">
    <div class="entry-header">
      <span class="entry-date">${fmtDate(e.date)}</span>
      <div class="entry-tags">${checkedTag}${kasjiTag}${taxTag}</div> <!-- ★ここにcheckedTagを挿入 -->
      <div class="entry-actions">
        <button class="icon-btn" onclick="openEntryModal('${e.id}')">✎</button>
        <button class="icon-btn del" onclick="deleteEntry('${e.id}')">✕</button>
      </div>
    </div>
    <div class="entry-body">
      <div class="debit-line">
        <span class="account-name">${e.debit.account}${e.debit.sub ? ` / ${e.debit.sub}` : ''}</span>
        <span class="entry-amount ${amountColor}">${fmt(e.debit.amount)}</span>
      </div>
      <div class="credit-line">
        <span class="account-name muted">${e.credit.account}${e.credit.sub ? ` / ${e.credit.sub}` : ''}</span>
        <span class="entry-amount muted">${fmt(e.credit.amount)}</span>
      </div>
      ${e.memo ? `<div class="entry-memo">${e.memo}</div>` : ''}
      ${e.kasji ? `<div class="kasji-info">事業分: ${fmt(e.kasji.bizAmount)} / 家事分: ${fmt(e.debit.amount - e.kasji.bizAmount)}</div>` : ''}
      ${e.debit.taxAmount > 0 ? `<div class="tax-info">消費税（借方）: ${fmt(e.debit.taxAmount)}</div>` : ''}
      ${e.credit.taxAmount > 0 ? `<div class="tax-info">消費税（貸方）: ${fmt(e.credit.taxAmount)}</div>` : ''}
    </div>
  </div>`;
}

// ===== 元帳 =====
function renderLedger() {
  const accountName = document.getElementById('ledger-account').value;
  const el = document.getElementById('ledger-content');
  if (!accountName) {
    el.innerHTML = '<div class="empty-msg">科目を選択してください</div>';
    return;
  }
  const relevant = entries.filter(e =>
    e.debit.account === accountName || e.credit.account === accountName
  );
  if (relevant.length === 0) {
    el.innerHTML = '<div class="empty-msg">この科目の取引はありません</div>';
    return;
  }

  const acc = getAccountByName(accountName);
  let balance = 0;
  let rows = relevant.map(e => {
    const isDebit = e.debit.account === accountName;
    const amount = isDebit ? e.debit.amount : e.credit.amount;
    if (acc && acc.normalSide === 'debit') balance += isDebit ? amount : -amount;
    else balance += isDebit ? -amount : amount;

    return `
    <div class="ledger-row">
      <div class="ledger-date">${fmtDate(e.date)}</div>
      <div class="ledger-desc">${e.memo || (isDebit ? e.credit.account : e.debit.account)}</div>
      <div class="ledger-debit">${isDebit ? fmt(amount) : ''}</div>
      <div class="ledger-credit">${!isDebit ? fmt(amount) : ''}</div>
      <div class="ledger-balance">${fmt(Math.abs(balance))}</div>
    </div>`;
  });

  el.innerHTML = `
    <div class="ledger-header-row">
      <div>日付</div><div>摘要</div><div>借方</div><div>貸方</div><div>残高</div>
    </div>
    ${rows.join('')}
    <div class="ledger-total">
      <span>残高合計</span><span>${fmt(Math.abs(balance))}</span>
    </div>`;
}

// ===== 消費税 =====
function loadTaxSettings() {
  document.getElementById('tax-method').value = taxSettings.method;
  document.getElementById('tax-industry').value = taxSettings.industry;
  updateTaxMethodDisplay();
}

function saveTaxSettings() {
  taxSettings.method = document.getElementById('tax-method').value;
  taxSettings.industry = document.getElementById('tax-industry').value;
  localStorage.setItem('kaikei_tax', JSON.stringify(taxSettings));
  updateTaxMethodDisplay();
  renderTax();
}

function updateTaxMethodDisplay() {
  const row = document.getElementById('tax-rate-row');
  row.style.display = taxSettings.method === 'simple' ? 'flex' : 'none';
}

function renderTax() {
  const year = new Date().getFullYear();
  const yearEntries = entries.filter(e => e.date.startsWith(String(year)));

  let sales10 = 0, sales8 = 0, purchase10 = 0, purchase8 = 0;
  let taxReceived10 = 0, taxReceived8 = 0, taxPaid10 = 0, taxPaid8 = 0;

  yearEntries.forEach(e => {
    if (e.debit.taxCode === 'exempt10') { sales10 += e.debit.amount - e.debit.taxAmount; taxReceived10 += e.debit.taxAmount; }
    if (e.credit.taxCode === 'exempt10') { sales10 += e.credit.amount - e.credit.taxAmount; taxReceived10 += e.credit.taxAmount; }
    if (e.debit.taxCode === 'exempt8') { sales8 += e.debit.amount - e.debit.taxAmount; taxReceived8 += e.debit.taxAmount; }
    if (e.credit.taxCode === 'exempt8') { sales8 += e.credit.amount - e.credit.taxAmount; taxReceived8 += e.credit.taxAmount; }
    if (e.debit.taxCode === 'input10') { purchase10 += e.debit.amount - e.debit.taxAmount; taxPaid10 += e.debit.taxAmount; }
    if (e.credit.taxCode === 'input10') { purchase10 += e.credit.amount - e.credit.taxAmount; taxPaid10 += e.credit.taxAmount; }
    if (e.debit.taxCode === 'input8') { purchase8 += e.debit.amount - e.debit.taxAmount; taxPaid8 += e.debit.taxAmount; }
    if (e.credit.taxCode === 'input8') { purchase8 += e.credit.amount - e.credit.taxAmount; taxPaid8 += e.credit.taxAmount; }
  });

  const totalSales = sales10 + sales8;
  const totalReceived = taxReceived10 + taxReceived8;
  let totalPaid = taxPaid10 + taxPaid8;

  // 簡易課税の場合、みなし仕入率で計算
  if (taxSettings.method === 'simple') {
    const rate = parseFloat(taxSettings.industry);
    totalPaid = Math.round(totalReceived * rate);
  }

  const payable = taxSettings.method === 'exempt' ? 0 : Math.max(0, totalReceived - totalPaid);

  document.getElementById('tax-summary-table').innerHTML = `
    <div class="tax-row"><span>課税売上合計（税抜）</span><span>${fmt(totalSales)}</span></div>
    <div class="tax-row"><span>仮受消費税合計</span><span>${fmt(totalReceived)}</span></div>
    <div class="tax-row"><span>仮払消費税合計</span><span>${fmt(taxSettings.method === 'simple' ? totalPaid : taxPaid10 + taxPaid8)}</span></div>
    ${taxSettings.method === 'simple' ? `<div class="tax-row muted"><span>みなし仕入税額（${parseFloat(taxSettings.industry) * 100}%）</span><span>${fmt(totalPaid)}</span></div>` : ''}
    <div class="tax-row total ${taxSettings.method === 'exempt' ? 'exempt' : ''}">
      <span>${taxSettings.method === 'exempt' ? '免税事業者のため納税なし' : '納付消費税額（概算）'}</span>
      <span>${taxSettings.method === 'exempt' ? '—' : fmt(payable)}</span>
    </div>`;

  document.getElementById('tax-breakdown').innerHTML = `
    <div class="tax-breakdown-row">
      <div class="tbr-head">課税売上</div>
      <div class="tax-row"><span>標準税率（10%）売上</span><span>${fmt(sales10)}</span></div>
      <div class="tax-row"><span>軽減税率（8%）売上</span><span>${fmt(sales8)}</span></div>
      <div class="tax-row sub"><span>仮受消費税（10%）</span><span>${fmt(taxReceived10)}</span></div>
      <div class="tax-row sub"><span>仮受消費税（8%）</span><span>${fmt(taxReceived8)}</span></div>
    </div>
    <div class="tax-breakdown-row">
      <div class="tbr-head">課税仕入</div>
      <div class="tax-row"><span>標準税率（10%）仕入</span><span>${fmt(purchase10)}</span></div>
      <div class="tax-row"><span>軽減税率（8%）仕入</span><span>${fmt(purchase8)}</span></div>
      <div class="tax-row sub"><span>仮払消費税（10%）</span><span>${fmt(taxPaid10)}</span></div>
      <div class="tax-row sub"><span>仮払消費税（8%）</span><span>${fmt(taxPaid8)}</span></div>
    </div>`;
}

// ===== 決算・青色申告 =====
function renderReport() {
  const year = parseInt(document.getElementById('report-year').value);
  if (!year) return;
  const yearEntries = entries.filter(e => e.date.startsWith(String(year)));

  // P/L集計
  const plData = {};
  // B/S集計
  const bsData = {};

  yearEntries.forEach(e => {
    // 借方科目
    const da = e.debit.account;
    const daType = getAccountType(da);
    const daAmt = e.kasji ? e.kasji.bizAmount : e.debit.amount;
    if (!plData[da]) plData[da] = { type: daType, debit: 0, credit: 0 };
    plData[da].debit += daAmt;

    // 貸方科目
    const ca = e.credit.account;
    const caType = getAccountType(ca);
    if (!plData[ca]) plData[ca] = { type: caType, debit: 0, credit: 0 };
    plData[ca].credit += e.credit.amount;
  });

  // P/L
  const incomeAccounts = Object.entries(plData).filter(([, v]) => v.type === 'income');
  const expenseAccounts = Object.entries(plData).filter(([, v]) => v.type === 'expense');

  let totalIncome = 0, totalExpense = 0;
  incomeAccounts.forEach(([, v]) => totalIncome += v.credit - v.debit);
  expenseAccounts.forEach(([, v]) => totalExpense += v.debit - v.credit);

  const plRows = [
    '<div class="report-section-label">【収益】</div>',
    ...incomeAccounts.map(([name, v]) => {
      const amt = v.credit - v.debit;
      return `<div class="report-row"><span>${name}</span><span>${fmt(amt)}</span></div>`;
    }),
    `<div class="report-row subtotal"><span>収益合計</span><span>${fmt(totalIncome)}</span></div>`,
    '<div class="report-section-label" style="margin-top:12px">【費用】</div>',
    ...expenseAccounts.map(([name, v]) => {
      const amt = v.debit - v.credit;
      return `<div class="report-row"><span>${name}</span><span>${fmt(amt)}</span></div>`;
    }),
    `<div class="report-row subtotal"><span>費用合計</span><span>${fmt(totalExpense)}</span></div>`,
    `<div class="report-row total ${totalIncome - totalExpense >= 0 ? 'profit' : 'loss'}">
      <span>事業所得</span><span>${fmt(totalIncome - totalExpense)}</span>
    </div>`,
  ];
  document.getElementById('pl-content').innerHTML = plRows.join('');

  // B/S（簡易）
  const assetAccounts = Object.entries(plData).filter(([, v]) => v.type === 'asset');
  const liabilityAccounts = Object.entries(plData).filter(([, v]) => v.type === 'liability');
  let totalAsset = 0, totalLiability = 0;
  assetAccounts.forEach(([, v]) => totalAsset += v.debit - v.credit);
  liabilityAccounts.forEach(([, v]) => totalLiability += v.credit - v.debit);

  document.getElementById('bs-content').innerHTML = `
    <div class="report-section-label">【資産】</div>
    ${assetAccounts.map(([name, v]) => `<div class="report-row"><span>${name}</span><span>${fmt(v.debit - v.credit)}</span></div>`).join('')}
    <div class="report-row subtotal"><span>資産合計</span><span>${fmt(totalAsset)}</span></div>
    <div class="report-section-label" style="margin-top:12px">【負債】</div>
    ${liabilityAccounts.map(([name, v]) => `<div class="report-row"><span>${name}</span><span>${fmt(v.credit - v.debit)}</span></div>`).join('')}
    <div class="report-row subtotal"><span>負債合計</span><span>${fmt(totalLiability)}</span></div>
    <div class="report-row total"><span>純資産（概算）</span><span>${fmt(totalAsset - totalLiability)}</span></div>`;
}

// ===== PRiMPO CSVインポート（電帳法対応版） =====
function importPrimpoCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  importPrimpoCSVWithDencho(file).then(() => {
    event.target.value = '';
  });
}

// ===== CSVエクスポート =====
function exportJournalCSV() {
  let csv = '\uFEFF日付,借方科目,借方補助,借方金額,借方消費税,借方税区分,貸方科目,貸方補助,貸方金額,貸方消費税,貸方税区分,摘要,家事按分率,按分後事業費\n';
  entries.forEach(e => {
    csv += `"${e.date}","${e.debit.account}","${e.debit.sub||''}",${e.debit.amount},${e.debit.taxAmount},"${e.debit.taxCode}","${e.credit.account}","${e.credit.sub||''}",${e.credit.amount},${e.credit.taxAmount},"${e.credit.taxCode}","${e.memo||''}",${e.kasji ? e.kasji.rate : ''},"${e.kasji ? e.kasji.bizAmount : ''}"\n`;
  });
  downloadCSV(csv, '仕訳帳.csv');
}

function exportPLCSV() {
  const year = document.getElementById('report-year').value;
  const yearEntries = entries.filter(e => e.date.startsWith(String(year)));
  const plData = {};
  yearEntries.forEach(e => {
    const da = e.debit.account;
    const daAmt = e.kasji ? e.kasji.bizAmount : e.debit.amount;
    if (!plData[da]) plData[da] = { type: getAccountType(da), debit: 0, credit: 0 };
    plData[da].debit += daAmt;
    const ca = e.credit.account;
    if (!plData[ca]) plData[ca] = { type: getAccountType(ca), debit: 0, credit: 0 };
    plData[ca].credit += e.credit.amount;
  });
  let csv = '\uFEFF科目,種別,金額\n';
  Object.entries(plData).forEach(([name, v]) => {
    const amt = v.type === 'income' ? v.credit - v.debit : v.debit - v.credit;
    if (amt !== 0) csv += `"${name}","${v.type}",${amt}\n`;
  });
  downloadCSV(csv, `損益計算書_${year}.csv`);
}

function exportTaxCSV() {
  let csv = '\uFEFF日付,摘要,借方科目,税区分,税込金額,消費税額\n';
  entries.forEach(e => {
    if (e.debit.taxAmount > 0)
      csv += `"${e.date}","${e.memo||''}","${e.debit.account}","${e.debit.taxCode}",${e.debit.amount},${e.debit.taxAmount}\n`;
    if (e.credit.taxAmount > 0)
      csv += `"${e.date}","${e.memo||''}","${e.credit.account}","${e.credit.taxCode}",${e.credit.amount},${e.credit.taxAmount}\n`;
  });
  downloadCSV(csv, '消費税集計.csv');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ===== 電帳法検索クリア =====
function clearDenchoSearch() {
  ['ds-keyword','ds-date-from','ds-date-to','ds-amt-min','ds-amt-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['ds-category','ds-taxrate','ds-verified','ds-deadline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  renderDenchoSearch();
}

// ===== Toast通知 =====
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 2500);
}
