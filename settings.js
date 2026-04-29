// ===================================================
// settings.js — 設定ページUI・ロジック
// ===================================================

function renderSettingsPage() {
  renderStorageStatus();
  renderProviderCards();
  renderBackupSettings();
  renderDataManagement();
  renderImportAutoMapping();
}

// ===== 保存先ステータスバー =====
function renderStorageStatus() {
  const el = document.getElementById('storage-status-bar');
  if (!el) return;
  const p = storageSettings.primary;
  const b = storageSettings.backup;
  const pConnected = p === 'local' || storageSettings[p]?.connected;
  const bConnected = b === 'none'  || storageSettings[b]?.connected;

  el.innerHTML = `
    <div class="status-item ${pConnected ? 'ok' : 'warn'}">
      <span class="status-dot"></span>
      <div>
        <div class="status-label">メイン保存先</div>
        <div class="status-val">${providerIcon(p)} ${providerLabel(p)}</div>
      </div>
    </div>
    <div class="status-divider"></div>
    <div class="status-item ${bConnected ? 'ok' : 'warn'}">
      <span class="status-dot"></span>
      <div>
        <div class="status-label">バックアップ先</div>
        <div class="status-val">${providerIcon(b)} ${providerLabel(b)}</div>
      </div>
    </div>
    <div class="status-divider"></div>
    <div class="status-item">
      <span class="status-dot ok"></span>
      <div>
        <div class="status-label">最終バックアップ</div>
        <div class="status-val">${storageSettings.lastBackup ? storageSettings.lastBackup.slice(0,10) : '未実施'}</div>
      </div>
    </div>`;
}

// ===== プロバイダカード =====
function renderProviderCards() {
  const el = document.getElementById('provider-cards');
  if (!el) return;

  const providers = [
    { id: 'local',    label: 'ローカル（このデバイス）', icon: '📱', desc: 'オフライン動作・設定不要', color: '#64748b' },
    { id: 'gdrive',   label: 'Google Drive',            icon: '🟡', desc: 'Googleアカウントで安全に同期', color: '#eab308' },
    { id: 'dropbox',  label: 'Dropbox',                 icon: '🔵', desc: 'Dropboxフォルダへ自動保存', color: '#3b82f6' },
    { id: 'onedrive', label: 'OneDrive',                icon: '🔷', desc: 'Microsoftクラウドへ同期', color: '#6366f1' },
    { id: 'webdav',   label: 'WebDAV',                  icon: '🌐', desc: 'Nextcloud等の自前サーバー', color: '#10b981' },
  ];

  el.innerHTML = providers.map(p => {
    const cfg = storageSettings[p.id] || {};
    const isPrimary = storageSettings.primary === p.id;
    const isBackup  = storageSettings.backup  === p.id;
    const connected = p.id === 'local' || cfg.connected;
    const badge = connected
      ? '<span class="provider-badge connected-badge">接続済</span>'
      : '<span class="provider-badge disconnected-badge">未接続</span>';

    return `
    <div class="provider-card ${isPrimary ? 'is-primary' : ''}" style="--provider-color:${p.color}">
      <div class="provider-card-head">
        <span class="provider-icon">${p.icon}</span>
        <div class="provider-info">
          <div class="provider-name">${p.label}</div>
          <div class="provider-desc">${p.desc}</div>
        </div>
        ${badge}
      </div>

      ${p.id === 'local' ? '' : renderProviderConfig(p.id, cfg)}

      <div class="provider-actions">
        <button class="prov-btn ${isPrimary ? 'prov-primary-active' : 'prov-primary-btn'}"
          onclick="setPrimary('${p.id}')" ${!connected ? 'disabled' : ''}>
          ${isPrimary ? '✓ メイン保存先' : 'メイン保存先にする'}
        </button>
        <button class="prov-btn ${isBackup ? 'prov-backup-active' : 'prov-backup-btn'}"
          onclick="setBackup('${p.id}')" ${!connected || isPrimary ? 'disabled' : ''}>
          ${isBackup ? '✓ バックアップ中' : 'バックアップ先'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function renderProviderConfig(id, cfg) {
  if (id === 'gdrive') {
    const token = loadGDriveToken();
    const connectedEmail = token ? '接続済み' : '';
    const tokenExpiry = token
      ? (new Date(token.expiresAt) > new Date()
          ? `トークン有効期限: ${new Date(token.expiresAt).toLocaleString('ja-JP')}`
          : '⚠ トークン期限切れ（次回保存時に自動更新）')
      : '';

    return `
    <div class="provider-config">
      ${cfg.connected ? `
        <div class="gdrive-connected-info">
          <div class="connected-row">
            <span class="connected-check">✓</span>
            <span class="connected-label">Google Drive に接続中</span>
          </div>
          ${storageSettings.gdrive.folderName
            ? `<div class="connected-detail">保存先フォルダ: 📁 ${storageSettings.gdrive.folderName}</div>`
            : ''}
          ${tokenExpiry ? `<div class="connected-detail">${tokenExpiry}</div>` : ''}
          <div class="provider-actions" style="margin-top:8px">
            <button class="prov-btn prov-connect-btn" onclick="testAndShowGDriveStatus()">接続テスト</button>
            <button class="prov-btn prov-disconnect-btn" onclick="disconnectGDrive()">切断</button>
          </div>
        </div>
      ` : `
        <div class="gdrive-setup-guide">
          <div class="guide-step">
            <div class="guide-step-num">1</div>
            <div class="guide-step-body">
              <div class="guide-step-title">Google Cloud Consoleでプロジェクト作成</div>
              <a class="guide-link" href="https://console.cloud.google.com/" target="_blank">
                console.cloud.google.com を開く →
              </a>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">2</div>
            <div class="guide-step-body">
              <div class="guide-step-title">Google Drive API を有効化</div>
              <div class="guide-step-sub">APIとサービス → ライブラリ → "Google Drive API"</div>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">3</div>
            <div class="guide-step-body">
              <div class="guide-step-title">OAuth クライアントID を作成</div>
              <div class="guide-step-sub">認証情報 → OAuthクライアントID → ウェブアプリケーション</div>
              <div class="guide-step-sub">リダイレクトURI: <code class="uri-code">${location.origin + location.pathname}</code></div>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">4</div>
            <div class="guide-step-body">
              <div class="guide-step-title">クライアントID・シークレットを入力</div>
            </div>
          </div>
        </div>
        <div class="prov-input-group">
          <label class="prov-input-label">クライアントID</label>
          <input class="prov-input" type="text"
            placeholder="例: 123456789-abc...apps.googleusercontent.com"
            value="${cfg.clientId || ''}"
            oninput="storageSettings.gdrive.clientId=this.value;saveStorageSettings()">
        </div>
        <div class="prov-input-group">
          <label class="prov-input-label">クライアントシークレット</label>
          <input class="prov-input" type="password"
            placeholder="例: GOCSPX-..."
            value="${cfg.clientSecret || ''}"
            oninput="storageSettings.gdrive.clientSecret=this.value;saveStorageSettings()">
        </div>
        <div class="prov-error" id="settings-error-gdrive" style="display:none"></div>
        <button class="prov-btn prov-connect-btn" onclick="connectGDrive()">
          🟡 Google アカウントでログイン
        </button>
      `}
    </div>`;
  }

  if (id === 'dropbox') return `
    <div class="provider-config">
      <input class="prov-input" type="text" placeholder="App Key（Dropbox Developers）"
        value="${cfg.appKey || ''}" oninput="storageSettings.dropbox.appKey=this.value;saveStorageSettings()">
      <input class="prov-input" type="text" placeholder="保存フォルダパス（例: /青色会計）"
        value="${cfg.path || '/青色会計'}" oninput="storageSettings.dropbox.path=this.value;saveStorageSettings()">
      <div class="prov-error" id="settings-error-dropbox"></div>
      ${cfg.connected
        ? `<button class="prov-btn prov-disconnect-btn" onclick="disconnectProvider('dropbox')">切断</button>`
        : `<button class="prov-btn prov-connect-btn" onclick="connectDropbox()">🔵 Dropbox でログイン</button>`}
    </div>`;

  if (id === 'onedrive') return `
    <div class="provider-config">
      <input class="prov-input" type="text" placeholder="Client ID（Azure App Registration）"
        value="${cfg.clientId || ''}" oninput="storageSettings.onedrive.clientId=this.value;saveStorageSettings()">
      <div class="prov-error" id="settings-error-onedrive"></div>
      ${cfg.connected
        ? `<button class="prov-btn prov-disconnect-btn" onclick="disconnectProvider('onedrive')">切断</button>`
        : `<button class="prov-btn prov-connect-btn" onclick="connectOneDrive()">🔷 Microsoft でログイン</button>`}
    </div>`;

  if (id === 'webdav') return `
    <div class="provider-config">
      <input class="prov-input" type="url" placeholder="WebDAV URL（例: https://your.server.com/dav）"
        value="${cfg.url || ''}" oninput="storageSettings.webdav.url=this.value;saveStorageSettings()">
      <div class="prov-row-2">
        <input class="prov-input" type="text" placeholder="ユーザー名"
          value="${cfg.username || ''}" oninput="storageSettings.webdav.username=this.value;saveStorageSettings()">
        <input class="prov-input" type="password" placeholder="パスワード"
          value="${cfg.password || ''}" oninput="storageSettings.webdav.password=this.value;saveStorageSettings()">
      </div>
      <div class="prov-error" id="settings-error-webdav"></div>
      <button class="prov-btn prov-connect-btn" onclick="testWebDAV()">🌐 接続テスト</button>
    </div>`;

  return '';
}

function renderBackupSettings() {
  const el = document.getElementById('backup-settings-body');
  if (!el) return;
  el.innerHTML = `
    <div class="setting-row">
      <label class="setting-label">自動バックアップ</label>
      <label class="toggle-switch">
        <input type="checkbox" ${storageSettings.autoBackup ? 'checked' : ''}
          onchange="storageSettings.autoBackup=this.checked;saveStorageSettings();renderBackupSettings()">
        <span class="toggle-slider"></span>
      </label>
    </div>
    ${storageSettings.autoBackup ? `
    <div class="setting-row">
      <label class="setting-label">バックアップ頻度</label>
      <select class="setting-select" onchange="storageSettings.backupInterval=this.value;saveStorageSettings()">
        <option value="save"   ${storageSettings.backupInterval==='save'   ?'selected':''}>保存のたびに</option>
        <option value="daily"  ${storageSettings.backupInterval==='daily'  ?'selected':''}>毎日</option>
        <option value="weekly" ${storageSettings.backupInterval==='weekly' ?'selected':''}>週1回</option>
      </select>
    </div>` : ''}
    <button class="prov-btn prov-connect-btn" onclick="manualBackup()" style="margin-top:8px">
      今すぐバックアップ
    </button>`;
}

function renderDataManagement() {
  const el = document.getElementById('data-management-body');
  if (!el) return;

  const total = (entries || []).length;
  const dSize = JSON.stringify({ 
    entries, 
    taxSettings, 
    dencho, 
    budget: JSON.parse(localStorage.getItem('kaikei_budget') || '{}') 
  }).length;

  // HTML構造の生成
  el.innerHTML = `
    <div class="data-stat-row">
      <div class="data-stat"><span class="ds-num">${total}</span><span class="ds-label">仕訳件数</span></div>
      <div class="data-stat"><span class="ds-num">${(dSize / 1024).toFixed(1)}KB</span><span class="ds-label">データサイズ</span></div>
      <div class="data-stat"><span class="ds-num">${(dencho || []).length}</span><span class="ds-label">電帳法記録</span></div>
    </div>
    <div class="data-actions" style="display: flex; flex-direction: column; gap: 10px;">
      <button class="export-btn" onclick="exportFullBackup()" style="display: flex; align-items: center; justify-content: center; min-height: 44px;">
        <span id="exp-icon-backup" style="width:24px; height:24px; margin-right:8px; display: flex; align-items: center; justify-content: center;"></span>
        <span>全データ書き出し（JSON）</span>
      </button>
      <button class="export-btn" onclick="document.getElementById('restore-file').click()" style="display: flex; align-items: center; justify-content: center; min-height: 44px;">
        <span id="exp-icon-restore" style="width:24px; height:24px; margin-right:8px; display: flex; align-items: center; justify-content: center;"></span>
        <span>バックアップから復元</span>
      </button>
      <input type="file" id="restore-file" accept=".json" style="display:none" onchange="restoreFromFile(event)">
      <button class="export-btn danger-btn" onclick="confirmClearData()" style="min-height: 44px;">
        データを全削除
      </button>
    </div>`;

  // 0.5秒待ってから赤い星を注入するテスト
  setTimeout(() => {
    const bIcon = document.getElementById('exp-icon-backup');
    const rIcon = document.getElementById('exp-icon-restore');
    
    if (bIcon) {
      bIcon.innerHTML = '<b style="color:red; font-size:20px; display:inline-block;">★</b>';
    }
    if (rIcon) {
      rIcon.innerHTML = '<b style="color:red; font-size:20px; display:inline-block;">★</b>';
    }
    console.log('Unique function test: Star injected');
  }, 500);
}





function renderImportAutoMapping() {
  const el = document.getElementById('import-mapping-body');
  if (!el) return;

  const mapping = JSON.parse(localStorage.getItem('kaikei_import_mapping') || JSON.stringify({
    incomeAccount:  '売上高',
    expenseAccount: '消耗品費',
    bankAccount:    '普通預金',
    defaultTaxCode: 'non',
    autoJournal:    true,
  }));

  el.innerHTML = `
    <div class="map-notice">PRiMPO CSV取込時に自動で設定される勘定科目・税区分を指定します</div>
    <div class="setting-row">
      <label class="setting-label">自動仕訳</label>
      <label class="toggle-switch">
        <input type="checkbox" id="map-auto" ${mapping.autoJournal ? 'checked' : ''}
          onchange="saveImportMapping()">
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="setting-row">
      <label class="setting-label">収入デフォルト科目</label>
      <select class="setting-select" id="map-income" onchange="saveImportMapping()">
        ${getIncomeOptions(mapping.incomeAccount)}
      </select>
    </div>
    <div class="setting-row">
      <label class="setting-label">支出デフォルト科目</label>
      <select class="setting-select" id="map-expense" onchange="saveImportMapping()">
        ${getExpenseOptions(mapping.expenseAccount)}
      </select>
    </div>
    <div class="setting-row">
      <label class="setting-label">預金科目</label>
      <select class="setting-select" id="map-bank" onchange="saveImportMapping()">
        ${getBankOptions(mapping.bankAccount)}
      </select>
    </div>
    <div class="setting-row">
      <label class="setting-label">デフォルト税区分</label>
      <select class="setting-select" id="map-tax" onchange="saveImportMapping()">
        <option value="non"      ${mapping.defaultTaxCode==='non'      ?'selected':''}>対象外</option>
        <option value="exempt10" ${mapping.defaultTaxCode==='exempt10' ?'selected':''}>課税売上10%</option>
        <option value="input10"  ${mapping.defaultTaxCode==='input10'  ?'selected':''}>課税仕入10%</option>
        <option value="free"     ${mapping.defaultTaxCode==='free'     ?'selected':''}>非課税</option>
      </select>
    </div>`;
}

function getIncomeOptions(selected) {
  return ACCOUNTS.income.items.map(a =>
    `<option value="${a.name}" ${a.name===selected?'selected':''}>${a.name}</option>`).join('');
}
function getExpenseOptions(selected) {
  return ACCOUNTS.expenses.items.map(a =>
    `<option value="${a.name}" ${a.name===selected?'selected':''}>${a.name}</option>`).join('');
}
function getBankOptions(selected) {
  return ACCOUNTS.assets.items.filter(a => ['普通預金','当座預金','現金'].includes(a.name)).map(a =>
    `<option value="${a.name}" ${a.name===selected?'selected':''}>${a.name}</option>`).join('');
}

function saveImportMapping() {
  const mapping = {
    incomeAccount:  document.getElementById('map-income')?.value  || '売上高',
    expenseAccount: document.getElementById('map-expense')?.value || '消耗品費',
    bankAccount:    document.getElementById('map-bank')?.value    || '普通預金',
    defaultTaxCode: document.getElementById('map-tax')?.value     || 'non',
    autoJournal:    document.getElementById('map-auto')?.checked  ?? true,
  };
  localStorage.setItem('kaikei_import_mapping', JSON.stringify(mapping));
  showToast('インポート設定を保存しました', 'success');
}

// ===== Google Drive 接続テスト表示 =====
async function testAndShowGDriveStatus() {
  showToast('接続テスト中...', 'info');
  const result = await testGDriveConnection();
  if (result.ok) {
    showToast(`接続OK: ${result.email || 'Google Drive'}`, 'success');
  } else {
    showToast(`接続失敗: ${result.error}`, 'error');
    showGDriveError(result.error);
  }
}

// ===== プロバイダ操作 =====
function setPrimary(id) {
  if (id !== 'local' && !storageSettings[id]?.connected) { showToast('先に接続してください', 'error'); return; }
  storageSettings.primary = id;
  if (storageSettings.backup === id) storageSettings.backup = 'none';
  saveStorageSettings();
  renderSettingsPage();
  showToast(`${providerLabel(id)} をメイン保存先に設定しました`, 'success');
}

function setBackup(id) {
  if (id === storageSettings.primary) return;
  if (id !== 'local' && !storageSettings[id]?.connected) { showToast('先に接続してください', 'error'); return; }
  storageSettings.backup = storageSettings.backup === id ? 'none' : id;
  saveStorageSettings();
  renderSettingsPage();
  const msg = storageSettings.backup === id ? `${providerLabel(id)} をバックアップ先に設定しました` : 'バックアップ先を解除しました';
  showToast(msg, 'success');
}

function disconnectProvider(id) {
  if (!confirm(`${providerLabel(id)} の接続を切断しますか？`)) return;
  if (storageSettings[id]) { storageSettings[id].token = ''; storageSettings[id].connected = false; }
  if (storageSettings.primary === id) storageSettings.primary = 'local';
  if (storageSettings.backup  === id) storageSettings.backup  = 'none';
  saveStorageSettings();
  renderSettingsPage();
  showToast(`${providerLabel(id)} を切断しました`, 'info');
}

// ===== バックアップ操作 =====
async function manualBackup() {
  showToast('バックアップ中...', 'info');
  const data = getCurrentData();
  const { primaryOk, backupOk } = await saveAllData(data);
  const ts = new Date().toISOString().slice(0, 10);
  storageSettings.lastBackup = new Date().toISOString();
  saveStorageSettings();
  renderSettingsPage();
  showToast(primaryOk ? `バックアップ完了（${ts}）` : 'バックアップ失敗', primaryOk ? 'success' : 'error');
}

function getCurrentData() {
  return {
    entries,
    taxSettings,
    dencho,
    budget: JSON.parse(localStorage.getItem('kaikei_budget') || '{}'),
    exportedAt: new Date().toISOString(),
    version: '2.0',
  };
}

function exportFullBackup() {
  const data = getCurrentData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `kaikei_full_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('バックアップファイルを書き出しました', 'success');
}

function restoreFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('現在のデータを上書きして復元しますか？')) { event.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.entries)     { entries = data.entries; localStorage.setItem('kaikei_entries', JSON.stringify(entries)); }
      if (data.taxSettings) { taxSettings = data.taxSettings; localStorage.setItem('kaikei_tax', JSON.stringify(taxSettings)); }
      if (data.dencho)      { dencho = data.dencho; localStorage.setItem('kaikei_dencho', JSON.stringify(dencho)); }
      if (data.budget)      localStorage.setItem('kaikei_budget', JSON.stringify(data.budget));
      renderAll();
      renderSettingsPage();
      showToast('復元が完了しました', 'success');
    } catch (e) {
      showToast('復元失敗: ファイルが無効です', 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function confirmClearData() {
  if (!confirm('全データを削除します。この操作は元に戻せません。本当に削除しますか？')) return;
  if (!confirm('最終確認：本当に削除してよいですか？')) return;
  ['kaikei_entries','kaikei_tax','kaikei_dencho','kaikei_budget'].forEach(k => localStorage.removeItem(k));
  entries = []; taxSettings = { method: 'exempt', industry: '0.5' }; dencho = [];
  renderAll();
  renderSettingsPage();
  showToast('全データを削除しました', 'info');
}
