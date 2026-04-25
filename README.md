# 勘定科目 自動分類エンジン

PRiMPOからエクスポートしたCSVを読み込み、摘要テキストを形態素解析して勘定科目に自動分類します。
使えば使うほど精度が上がる学習機能付きです。

## セットアップ

```bash
pip install scikit-learn pandas

# MeCabを使う場合（任意・高精度）
# macOS: brew install mecab mecab-ipadic && pip install mecab-python3 unidic-lite
# Ubuntu: sudo apt install mecab libmecab-dev mecab-ipadic-utf8 && pip install mecab-python3
```

## 基本的な使い方（ループ）

```
PRiMPOからCSVをエクスポート
        ↓
python classifier.py --classify input.csv
        ↓
output_classified.csv を開いて correct_account 列に正解を入力
        ↓
python classifier.py --learn output_classified.csv
        ↓
python classifier.py --train
        ↓
精度が上がる → 最初に戻る
```

## コマンド一覧

```bash
# CSVを分類する
python classifier.py --classify 入力.csv
python classifier.py --classify 入力.csv --output 出力先.csv

# 正解ラベルを学習データに追加
python classifier.py --learn 修正済み.csv

# モデルを再学習
python classifier.py --train

# 精度評価
python classifier.py --evaluate

# 分類統計を見る
python classifier.py --stats

# キーワードルールを追加
python classifier.py --add-rule 旅費交通費 'suica,icoca,電車,バス'

# 会計アプリ用JSONに変換
python export_to_app.py --input output_classified.csv --output kaikei_import.json

# テスト実行（全機能確認）
python test_classifier.py
```

## ファイル構成

| ファイル | 役割 |
|---|---|
| `classifier.py` | 分類エンジン本体・CLIインターフェース |
| `tokenizer.py` | 形態素解析（MeCab自動切替） |
| `export_to_app.py` | 分類済みCSV→会計アプリJSON変換 |
| `test_classifier.py` | テスト・サンプルデータ生成 |
| `training_data.csv` | 学習データ蓄積ファイル（自動生成） |
| `model.pkl` | 学習済みモデル（自動生成） |
| `rules.json` | キーワードルール（自動生成・編集可能） |
| `history.json` | 分類履歴ログ（自動生成） |

## 会計アプリへの取り込み

```bash
python export_to_app.py --input output_classified.csv --output kaikei_import.json
```

→ 会計アプリの「設定 → データ管理 → バックアップから復元」で `kaikei_import.json` を選択

## 精度の目安

| 学習データ件数 | 期待精度 |
|---|---|
| 0件（ルールのみ） | 70〜80% |
| 30件 | 85〜90% |
| 100件 | 90〜95% |
| 300件以上 | 95%超 |
