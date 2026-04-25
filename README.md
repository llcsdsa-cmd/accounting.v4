# 青色申告 複式簿記 会計アプリ v3.0

PRiMPO連携 / 電子帳簿保存法対応 / クラウド保存対応の青色申告準拠 会計Webアプリです。  
GitHub Pagesでそのまま動作します（ビルド不要）。

## ファイル構成

```
index.html   — メインHTML（画面レイアウト）
style.css    — スタイルシート（iPhone 14 Pro Max最適化）
accounts.js  — 勘定科目マスタ（青色申告対応）
icons.js     — カラフルSVGアイコンセット
app.js       — アプリロジック（複式簿記エンジン）
dencho.js    — 電子帳簿保存法対応モジュール
storage.js   — クラウドストレージエンジン
settings.js  — 設定ページUI・ロジック
```

## 主な機能

- **複式簿記エンジン** — 借方・貸方の二重記帳、貸借バランスチェック
- **青色申告対応** — 損益計算書（P/L）・貸借対照表（B/S）
- **消費税管理** — 10%/8%軽減/非課税、本則課税・簡易課税・免税事業者
- **家事按分** — 仕訳ごとに事業割合（%）を設定
- **PRiMPO CSV インポート** — 取込と同時に仕訳帳へ即時振り分け・ダッシュボード更新
- **電子帳簿保存法対応** — SHA-256ハッシュ・変更履歴・7要件検索・電帳法CSV出力
- **クラウド保存** — Google Drive / Dropbox / OneDrive / WebDAV から選択
- **自動バックアップ** — 毎日/週1/保存のたびに自動バックアップ

## クラウド接続の事前準備

### Google Drive
1. Google Cloud Console でプロジェクト作成
2. OAuth 2.0 クライアントID を取得（Web アプリケーション）
3. リダイレクト URI に GitHub Pages の URL を登録
4. 設定ページ → Google Drive → Client ID を入力 → ログイン

### Dropbox
1. Dropbox Developers でアプリ作成
2. App Key を取得
3. Redirect URIs に GitHub Pages の URL を登録
4. 設定ページ → Dropbox → App Key を入力 → ログイン

### OneDrive
1. Azure Portal → App Registration でアプリ登録
2. Client ID を取得
3. Redirect URI を登録（Implicit grant: Access tokens を有効化）
4. 設定ページ → OneDrive → Client ID を入力 → ログイン

### WebDAV（Nextcloud等）
1. 設定ページ → WebDAV → URL・ユーザー名・パスワードを入力
2. 「接続テスト」でOKを確認

## GitHub Pages デプロイ手順

1. このリポジトリを GitHub にプッシュ
2. Settings → Pages → Deploy from a branch → main / root → Save
3. 数分後に `https://<username>.github.io/<repo>/` でアクセス可能

## PRiMPO CSV フォーマット

| 列 | 内容 |
|---|---|
| A | 日付（YYYY-MM-DD） |
| B | 内容・摘要 |
| C | 金額（正=収入、負=支出） |
| D | カテゴリ（任意） |

取込時に設定ページの「CSVインポート設定」で指定した勘定科目・税区分が自動適用されます。

## 注意事項

- 申告の際は税理士に確認してください。
- クラウド接続にはOAuth認証が必要です（トークンはブラウザのlocalStorageに保存）。
- データは常にローカル（localStorage）にもフォールバック保存されます。
