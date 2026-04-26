"""
classifier.py — 勘定科目自動分類エンジン

学習フロー:
  1. 初回: キーワードルールで分類（ベースライン）
  2. ユーザーが正解ラベルを付与 → training_data.csv に蓄積
  3. --train で機械学習モデルを再学習
  4. 次回から ML モデル優先で分類（精度向上）

使い方:
  # CSVを分類（結果をoutput.csvに出力）
  python classifier.py --classify input.csv

  # 正解ラベルを学習データに追加
  python classifier.py --learn output.csv

  # モデルを再学習
  python classifier.py --train

  # 分類精度を評価
  python classifier.py --evaluate
"""

import argparse
import csv
import json
import os
import re
import sys
import pickle
import unicodedata
from datetime import datetime
from pathlib import Path

# --- scikit-learn ---
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report
import pandas as pd

# ローカルモジュール
from tokenizer import tokenize, tokens_to_string, extract_features

# ===== パス設定 =====
BASE_DIR       = Path(__file__).parent
MODEL_PATH     = BASE_DIR / "model.pkl"
TRAIN_DATA     = BASE_DIR / "training_data.csv"
RULES_PATH     = BASE_DIR / "rules.json"
HISTORY_PATH   = BASE_DIR / "history.json"

# ===== 青色申告 勘定科目マスタ =====
ACCOUNTS = [
    "売上高", "受取手数料", "受取利息", "雑収入",        # 収益
    "仕入高",                                           # 売上原価
    "給料賃金", "外注工賃", "減価償却費",                # 人件費系
    "地代家賃", "水道光熱費", "通信費", "消耗品費",       # 固定費
    "旅費交通費", "接待交際費", "広告宣伝費",             # 変動費
    "損害保険料", "修繕費", "福利厚生費", "利子割引料",   # その他経費
    "租税公課", "雑費",                                  # 租税・雑費
    "普通預金", "当座預金", "現金", "売掛金",             # 資産
    "買掛金", "未払費用", "借入金",                       # 負債
]

# ===== キーワードルール =====
# rules.json が存在する場合はそちらを優先（ユーザー編集可能）
DEFAULT_RULES = {
    "旅費交通費": [
        "suica", "icoca", "電車", "バス", "タクシー", "jr", "新幹線",
        "交通", "駅", "乗車", "高速", "etc", "飛行機", "航空",
    ],
    "通信費": [
        "ドコモ", "au", "ソフトバンク", "携帯", "スマホ", "wifi",
        "インターネット", "光回線", "プロバイダ", "ntt", "通信",
    ],
    "水道光熱費": [
        "電気", "ガス", "水道", "東電", "東ガス", "関電", "光熱",
        "電力", "九電", "中電",
    ],
    "地代家賃": [
        "家賃", "賃料", "マンション", "アパート", "テナント", "地代", "駐車場",
    ],
    "消耗品費": [
        "文房具", "コクヨ", "プリンタ", "インク", "トナー", "コピー用紙",
        "ボールペン", "のり", "ファイル", "電池", "消耗",
    ],
    "広告宣伝費": [
        "広告", "宣伝", "pr", "チラシ", "sns", "google ads",
        "facebook ads", "instagram", "マーケ",
    ],
    "接待交際費": [
        "接待", "交際", "会食", "ゴルフ", "贈答", "手土産", "お中元", "お歳暮",
    ],
    "福利厚生費": [
        "健康診断", "社員旅行", "慶弔", "保養", "社食", "ジム", "福利",
    ],
    "損害保険料": [
        "保険", "共済", "損保",
    ],
    "修繕費": [
        "修理", "修繕", "メンテナンス", "補修",
    ],
    "租税公課": [
        "税金", "住民税", "固定資産税", "印紙", "登録免許税", "収入印紙",
    ],
    "外注工賃": [
        "外注", "業務委託", "フリーランス", "請負", "下請け",
    ],
    "売上高": [
        "売上", "請求", "入金", "報酬", "売り上げ",
    ],
    "雑費": [
        "その他", "雑費", "雑", "その他経費",
    ],
}


def load_rules() -> dict:
    """rules.json を読み込む（なければデフォルトを使用）"""
    if RULES_PATH.exists():
        with open(RULES_PATH, encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_RULES


def save_rules(rules: dict):
    with open(RULES_PATH, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)
    print(f"[rules] {RULES_PATH} に保存しました")


def classify_by_rules(text: str, rules: dict) -> tuple[str, float]:
    """
    キーワードルールで分類する
    戻り値: (勘定科目, 信頼スコア 0.0-1.0)
    """
    text_n = unicodedata.normalize("NFKC", text).lower()
    best_account = "消耗品費"
    best_score   = 0.0

    for account, keywords in rules.items():
        matched = sum(1 for kw in keywords if kw.lower() in text_n)
        if matched > 0:
            score = min(matched / max(len(keywords) * 0.3, 1), 1.0)
            if score > best_score:
                best_score   = score
                best_account = account

    return best_account, round(best_score, 3)


def load_model():
    """保存済みモデルをロードする"""
    if MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    return None


def train_model(df: pd.DataFrame) -> Pipeline:
    """
    学習データから TF-IDF + LinearSVC モデルを学習する
    df 列: [text, account]
    """
    # テキストをトークン化
    X = df["text"].apply(lambda t: tokens_to_string(tokenize(str(t))))
    y = df["account"]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),   # ユニグラム＋バイグラム
            min_df=1,
            max_features=5000,
            sublinear_tf=True,
        )),
        ("clf", LinearSVC(
            C=1.0,
            max_iter=2000,
            class_weight="balanced",  # クラス不均衡を補正
        )),
    ])
    pipeline.fit(X, y)
    return pipeline


def classify_by_model(text: str, model: Pipeline) -> tuple[str, float]:
    """
    MLモデルで分類する
    LinearSVC は確率を返さないため decision_function でスコアを計算
    """
    token_str = tokens_to_string(tokenize(text))
    pred = model.predict([token_str])[0]
    # decision_function でクラス信頼度を取得
    try:
        scores = model.decision_function([token_str])[0]
        classes = model.classes_
        idx = list(classes).index(pred)
        # ソフトマックス的なスコア正規化
        exp_scores = [2 ** s for s in scores]
        confidence = exp_scores[idx] / sum(exp_scores)
    except Exception:
        confidence = 0.75
    return pred, round(confidence, 3)


class AccountClassifier:
    """
    勘定科目分類エンジン

    優先順位:
      1. MLモデル（信頼スコア 0.7 以上）
      2. キーワードルール
      3. MLモデル（スコアに関わらず）
      4. デフォルト（消耗品費）
    """

    def __init__(self):
        self.rules = load_rules()
        self.model = load_model()
        self.history: list[dict] = self._load_history()

    def _load_history(self) -> list[dict]:
        if HISTORY_PATH.exists():
            with open(HISTORY_PATH, encoding="utf-8") as f:
                return json.load(f)
        return []

    def _save_history(self):
        with open(HISTORY_PATH, "w", encoding="utf-8") as f:
            json.dump(self.history, f, ensure_ascii=False, indent=2)

    def classify(self, text: str, amount: float = 0.0, is_income: bool = False) -> dict:
        """
        テキストと金額から最適な勘定科目を返す

        Returns:
            {
                account     : str    — 予測勘定科目
                confidence  : float  — 信頼スコア（0.0-1.0）
                method      : str    — 分類手法
                alternatives: list   — 次候補リスト
                needs_review: bool   — 確認が必要かどうか
            }
        """
        # 収入は先に判定
        if is_income:
            return {
                "account":      "売上高",
                "confidence":   1.0,
                "method":       "income_rule",
                "alternatives": ["受取手数料", "雑収入"],
                "needs_review": False,
            }

        ml_account   = None
        ml_confidence = 0.0
        rule_account  = None
        rule_confidence = 0.0

        # MLモデル分類
        if self.model:
            ml_account, ml_confidence = classify_by_model(text, self.model)

        # キーワードルール分類
        rule_account, rule_confidence = classify_by_rules(text, self.rules)

        # 判定ロジック
        if self.model and ml_confidence >= 0.70:
            account    = ml_account
            confidence = ml_confidence
            method     = "ml_model"
        elif rule_confidence > 0:
            account    = rule_account
            confidence = rule_confidence
            method     = "keyword_rule"
        elif self.model:
            account    = ml_account
            confidence = ml_confidence
            method     = "ml_model_low"
        else:
            account    = "消耗品費"
            confidence = 0.1
            method     = "default"

        # 次候補（account 以外の上位）
        alternatives = self._get_alternatives(text, account)

        # 信頼スコアが低い場合はレビュー要求
        needs_review = confidence < 0.5

        result = {
            "account":      account,
            "confidence":   confidence,
            "method":       method,
            "alternatives": alternatives,
            "needs_review": needs_review,
        }

        # 分類履歴に記録
        self.history.append({
            "text":       text,
            "amount":     amount,
            "is_income":  is_income,
            "predicted":  account,
            "confidence": confidence,
            "method":     method,
            "timestamp":  datetime.now().isoformat(),
            "corrected":  None,  # ユーザー修正後に埋まる
        })
        self._save_history()

        return result

    def _get_alternatives(self, text: str, predicted: str) -> list[str]:
        """予測以外の上位候補を返す"""
        candidates = []
        if self.model:
            token_str = tokens_to_string(tokenize(text))
            try:
                scores  = self.model.decision_function([token_str])[0]
                classes = self.model.classes_
                ranked  = sorted(zip(classes, scores), key=lambda x: -x[1])
                candidates = [c for c, _ in ranked if c != predicted][:3]
            except Exception:
                pass
        if not candidates:
            # ルールから上位科目を選ぶ
            scores = {}
            text_n = unicodedata.normalize("NFKC", text).lower()
            for acc, kws in self.rules.items():
                if acc == predicted:
                    continue
                s = sum(1 for kw in kws if kw in text_n)
                if s > 0:
                    scores[acc] = s
            candidates = sorted(scores, key=lambda x: -scores[x])[:3]
        return candidates or ["消耗品費", "雑費"]

    def add_correction(self, text: str, correct_account: str):
        """
        ユーザーが修正した正解ラベルを学習データに追加する
        """
        # 最新の履歴エントリを修正
        for entry in reversed(self.history):
            if entry["text"] == text and entry["corrected"] is None:
                entry["corrected"] = correct_account
                break
        self._save_history()

        # training_data.csv に追記
        row = {"text": text, "account": correct_account}
        file_exists = TRAIN_DATA.exists()
        with open(TRAIN_DATA, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["text", "account"])
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)

        print(f"[learn] 学習データ追加: '{text}' → {correct_account}")


# ===== CLI インターフェース =====

def detect_encoding(filepath: str) -> str:
    """文字コードを自動検出する（BOM優先 → Shift-JIS試行 → UTF-8）"""
    with open(filepath, "rb") as f:
        raw = f.read(4096)
    if raw.startswith(b'\xef\xbb\xbf'):
        return 'utf-8-sig'
    if raw.startswith(b'\xff\xfe'):
        return 'utf-16'
    # Shift-JIS / CP932 試行
    for enc in ('cp932', 'shift-jis'):
        try:
            raw.decode(enc)
            return enc
        except Exception:
            pass
    return 'utf-8'


def detect_delimiter(first_line: str) -> str:
    """先頭行から区切り文字を推定する"""
    counts = {',': first_line.count(','), '\t': first_line.count('\t')}
    return max(counts, key=counts.get)


# 列名の候補（どれかに一致すれば採用）
COL_ALIASES = {
    "date":        ["date", "日付", "取引日", "年月日", "Date"],
    "description": ["description", "内容", "摘要", "件名", "Description",
                    "取引内容", "備考", "明細", "name", "Name"],
    "amount":      ["amount", "金額", "取引金額", "Amount", "金額(税込)",
                    "入出金額", "出金額", "入金額", "価格"],
}


def resolve_column(fieldnames: list[str], col_key: str, override: str = "") -> str:
    """
    列名を解決する
    override が指定された場合はそれを使用。
    なければ COL_ALIASES でファジーマッチ。
    """
    if override and override in fieldnames:
        return override
    for alias in COL_ALIASES.get(col_key, []):
        if alias in fieldnames:
            return alias
    # 部分一致フォールバック
    col_lower = col_key.lower()
    for f in fieldnames:
        if col_lower in f.lower():
            return f
    return ""


def parse_amount(val: str) -> float:
    """金額文字列を数値に変換（¥・カンマ・全角数字に対応）"""
    import unicodedata
    val = unicodedata.normalize("NFKC", str(val))
    val = val.replace(",", "").replace("¥", "").replace("￥", "").strip()
    # 括弧は負の金額を表すことがある (1,000) → -1000
    if val.startswith("(") and val.endswith(")"):
        val = "-" + val[1:-1]
    try:
        return float(val)
    except ValueError:
        return 0.0


def cmd_classify(
    input_path: str,
    output_path: str,
    encoding: str = "",
    delimiter: str = "",
    col_date: str = "",
    col_desc: str = "",
    col_amount: str = "",
):
    """CSVを分類してoutput.csvに出力する（詳細エラー診断付き）"""

    errors   = []   # 致命的エラー（処理続行不可）
    warnings = []   # 警告（処理は続行）

    # ============================================================
    # STEP 1: ファイルの存在・サイズ確認
    # ============================================================
    from pathlib import Path
    p = Path(input_path)

    if not p.exists():
        print(f"\n{'='*60}")
        print(f"  ❌ エラー: ファイルが見つかりません")
        print(f"{'='*60}")
        print(f"  パス : {input_path}")
        print(f"  確認 : ファイル名・パスにタイポがないか確認してください")
        print(f"  現在のディレクトリ: {Path.cwd()}")
        print(f"  このフォルダにあるCSV: {list(Path.cwd().glob('*.csv'))}")
        return

    size = p.stat().st_size
    if size == 0:
        print(f"\n{'='*60}")
        print(f"  ❌ エラー: ファイルが空です（0 bytes）")
        print(f"{'='*60}")
        print(f"  パス : {input_path}")
        print(f"  確認 : PRiMPOで正しくエクスポートできているか確認してください")
        return

    print(f"\n{'='*60}")
    print(f"  📂 CSV読み込み診断レポート")
    print(f"{'='*60}")
    print(f"  ファイル: {input_path}")
    print(f"  サイズ  : {size:,} bytes")

    # ============================================================
    # STEP 2: 生バイト確認（BOM・文字化け検出）
    # ============================================================
    with open(input_path, "rb") as f:
        raw = f.read(min(size, 4096))

    bom_detected = ""
    if raw.startswith(b'\xef\xbb\xbf'):
        bom_detected = "UTF-8 BOM"
    elif raw.startswith(b'\xff\xfe'):
        bom_detected = "UTF-16 LE BOM"
    elif raw.startswith(b'\xfe\xff'):
        bom_detected = "UTF-16 BE BOM"

    null_bytes = raw.count(b'\x00')
    if null_bytes > 10:
        warnings.append(f"NULLバイトが {null_bytes}個 検出 → UTF-16の可能性（--encoding utf-16 を試してください）")

    # ============================================================
    # STEP 3: 文字コード判定
    # ============================================================
    enc = encoding or detect_encoding(input_path)
    if bom_detected:
        print(f"  BOM    : {bom_detected} 検出")
    print(f"  文字コード: {enc}{'（自動検出）' if not encoding else '（指定）'}")

    # 実際にデコードを試みる
    content = None
    tried_encodings = [enc] if encoding else [enc, 'utf-8', 'utf-8-sig', 'cp932', 'shift-jis', 'utf-16']
    decode_errors = {}

    for try_enc in tried_encodings:
        try:
            with open(input_path, encoding=try_enc, errors='strict') as f:
                content = f.read()
            enc = try_enc  # 成功したエンコードを確定
            print(f"  デコード: ✅ {enc} で成功")
            break
        except UnicodeDecodeError as e:
            decode_errors[try_enc] = f"行{e.lineno if hasattr(e,'lineno') else '?'} 付近: {e.reason}"
        except Exception as e:
            decode_errors[try_enc] = str(e)

    if content is None:
        print(f"\n{'='*60}")
        print(f"  ❌ エラー原因: 文字コードのデコード失敗")
        print(f"{'='*60}")
        print(f"\n  試したエンコードと失敗理由:")
        for enc_tried, reason in decode_errors.items():
            print(f"    {enc_tried:12s} → {reason}")
        print(f"\n  先頭バイト（hex）: {raw[:32].hex()}")
        print(f"\n  ▶ 解決策:")
        print(f"    1. テキストエディタ（メモ帳・VSCode）でファイルを開き、")
        print(f"       「名前をつけて保存」→ 文字コード「UTF-8」で保存し直す")
        print(f"    2. または文字コードを明示して再実行:")
        print(f"       python classifier.py --classify {input_path} --encoding utf-16")
        print(f"       python classifier.py --classify {input_path} --encoding shift-jis")
        return

    # ============================================================
    # STEP 4: 行数・内容確認
    # ============================================================
    all_lines  = content.splitlines()
    data_lines = [l for l in all_lines if l.strip()]

    print(f"  総行数  : {len(all_lines)}行 （空行除く: {len(data_lines)}行）")

    if len(data_lines) == 0:
        print(f"\n{'='*60}")
        print(f"  ❌ エラー原因: ファイルに内容がありません")
        print(f"{'='*60}")
        print(f"  先頭バイト: {raw[:64].hex()}")
        print(f"  ▶ 解決策: PRiMPOで再度エクスポートしてください")
        return

    if len(data_lines) == 1:
        print(f"\n{'='*60}")
        print(f"  ❌ エラー原因: ヘッダー行のみでデータ行がありません")
        print(f"{'='*60}")
        print(f"  ヘッダー: {repr(data_lines[0])}")
        print(f"  ▶ 解決策: PRiMPOのエクスポート設定でデータ期間が正しく選択されているか確認してください")
        return

    # 先頭数行を表示
    print(f"\n  先頭3行（生テキスト）:")
    for i, line in enumerate(data_lines[:3]):
        display = line if len(line) <= 80 else line[:80] + "..."
        print(f"    [{i}] {repr(display)}")

    # ============================================================
    # STEP 5: 区切り文字判定
    # ============================================================
    delim = delimiter or detect_delimiter(data_lines[0])
    delim_counts = {',': data_lines[0].count(','), '\t': data_lines[0].count('\t')}

    if max(delim_counts.values()) == 0:
        warnings.append(
            f"カンマもタブも見つかりません（カンマ:{delim_counts[',']} タブ:{delim_counts[chr(9)]}）"
            f" → ファイルが1列のみか、区切り文字が特殊な可能性があります"
        )

    delim_name = {',': 'カンマ(,)', '\t': 'タブ(\\t)'}.get(delim, repr(delim))
    print(f"\n  区切り文字: {delim_name}{'（指定）' if delimiter else '（自動検出）'}")

    # ============================================================
    # STEP 6: CSV列名解析
    # ============================================================
    import io
    reader    = csv.DictReader(io.StringIO(content), delimiter=delim)
    fieldnames = reader.fieldnames or []

    if not fieldnames:
        print(f"\n{'='*60}")
        print(f"  ❌ エラー原因: ヘッダー行の解析に失敗しました")
        print(f"{'='*60}")
        print(f"  先頭行  : {repr(data_lines[0])}")
        print(f"  区切り  : {delim_name}")
        print(f"\n  ▶ 解決策:")
        print(f"    区切り文字を明示してください:")
        print(f"    python classifier.py --classify {input_path} --delimiter ','")
        print(f"    python classifier.py --classify {input_path} --delimiter $'\\t'  # タブの場合")
        return

    print(f"  検出した列: {fieldnames}")

    # ============================================================
    # STEP 7: 必須列の解決
    # ============================================================
    c_date   = resolve_column(fieldnames, "date",        col_date)
    c_desc   = resolve_column(fieldnames, "description", col_desc)
    c_amount = resolve_column(fieldnames, "amount",      col_amount)

    print(f"\n  列マッピング:")
    print(f"    日付列  : {repr(c_date)  or '❌ 未検出（なくても動作します）'}")
    print(f"    摘要列  : {repr(c_desc)  or '⚠ 未検出 → 全列を結合してテキスト化します'}")
    print(f"    金額列  : {repr(c_amount) or '⚠ 未検出 → 全件 支出として扱います'}")

    if not c_desc:
        warnings.append(
            f"摘要列が見つかりません（候補: {COL_ALIASES['description']}）\n"
            f"    全列の値を結合してテキストとして使用します\n"
            f"    列名を明示する場合: --col-desc '列名'"
        )
    if not c_amount:
        warnings.append(
            f"金額列が見つかりません（候補: {COL_ALIASES['amount']}）\n"
            f"    収入・支出の判定が行えません\n"
            f"    列名を明示する場合: --col-amount '列名'"
        )

    # ============================================================
    # STEP 8: サンプル行の金額パース確認
    # ============================================================
    amount_parse_failures = []
    sample_rows = list(csv.DictReader(io.StringIO(content), delimiter=delim))[:5]

    for i, row in enumerate(sample_rows, 1):
        if c_amount:
            raw_val = row.get(c_amount, "")
            parsed  = parse_amount(raw_val)
            if raw_val and parsed == 0.0 and raw_val.strip() not in ("0", "", "０"):
                amount_parse_failures.append(
                    f"行{i}: 金額列の値 {repr(raw_val)} を数値に変換できませんでした"
                )

    if amount_parse_failures:
        for msg in amount_parse_failures:
            warnings.append(msg)

    # ============================================================
    # 警告表示
    # ============================================================
    if warnings:
        print(f"\n  ⚠ 警告 ({len(warnings)}件):")
        for i, w in enumerate(warnings, 1):
            for line in w.splitlines():
                prefix = f"    {i}. " if line == w.splitlines()[0] else "       "
                print(f"{prefix}{line}")

    print(f"\n{'='*60}")
    print(f"  🔄 分類処理開始")
    print(f"{'='*60}")

    # ============================================================
    # STEP 9: 分類処理
    # ============================================================
    clf  = AccountClassifier()
    rows = []
    skipped_rows = []

    for i, row in enumerate(csv.DictReader(io.StringIO(content), delimiter=delim), start=1):
        # 摘要テキスト取得
        text = (row.get(c_desc) or "").strip() if c_desc else ""
        if not text:
            text = " ".join(v for v in row.values() if v and v.strip())

        # 金額取得
        raw_amt = (row.get(c_amount) or "0") if c_amount else "0"
        amount  = parse_amount(raw_amt)

        # 空行スキップ
        if not text and amount == 0:
            skipped_rows.append((i, dict(row)))
            continue

        is_income = amount >= 0
        result    = clf.classify(text, amount=abs(amount), is_income=is_income)

        rows.append({
            **row,
            "predicted_account": result["account"],
            "confidence":        result["confidence"],
            "method":            result["method"],
            "alternatives":      "|".join(result["alternatives"]),
            "needs_review":      "要確認" if result["needs_review"] else "OK",
            "correct_account":   "",
        })

    # ============================================================
    # STEP 10: 結果出力・サマリー
    # ============================================================
    print(f"\n  処理行数  : {len(rows) + len(skipped_rows)}行")
    print(f"  分類成功  : {len(rows)}件")
    print(f"  スキップ  : {len(skipped_rows)}件（空行・金額ゼロ）")

    if rows:
        with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

        need_review = sum(1 for r in rows if r["needs_review"] == "要確認")
        by_account  = {}
        for r in rows:
            acc = r["predicted_account"]
            by_account[acc] = by_account.get(acc, 0) + 1

        print(f"\n  ✅ 分類完了 → {output_path}")
        print(f"  要確認   : {need_review}件（信頼度 < 0.5）")

        print(f"\n  科目別件数:")
        for acc, cnt in sorted(by_account.items(), key=lambda x: -x[1]):
            bar = "█" * min(cnt, 20)
            print(f"    {acc:18s} {bar} {cnt}件")

        print(f"\n  次のステップ:")
        print(f"    1. {output_path} を開いて 'correct_account' 列に正解を入力")
        print(f"    2. python classifier.py --learn {output_path}")
        print(f"    3. python classifier.py --train")

    else:
        print(f"\n{'='*60}")
        print(f"  ❌ エラー原因: 有効なデータ行が0件でした")
        print(f"{'='*60}")

        # スキップされた行の内容を表示して原因を絞り込む
        if skipped_rows:
            print(f"\n  スキップされた行（先頭3件）:")
            for row_num, row_data in skipped_rows[:3]:
                print(f"    行{row_num}: {dict(list(row_data.items())[:4])}")
            print(f"\n  考えられる原因:")
            print(f"    ① 摘要列と金額列の両方が空 → 列名が正しく認識されていない")
            print(f"    ② 金額が文字列（'¥1,000' 等）でパース失敗")
        else:
            print(f"\n  考えられる原因:")
            print(f"    ① ヘッダー行しかなく、データがない")
            print(f"    ② 区切り文字が違うため1列として読まれている")

        print(f"\n  ▶ 解決策（試す順番）:")
        print(f"    Step1: 診断ツールで詳細を確認")
        print(f"           python diagnose_csv.py {input_path}")
        print(f"    Step2: 列名を明示して再実行")
        print(f"           python classifier.py --classify {input_path} \\")
        print(f"             --col-desc '{c_desc or '内容'}' \\")
        print(f"             --col-amount '{c_amount or '金額'}' \\")
        print(f"             --encoding {enc}")
        print(f"    Step3: 区切り文字を明示")
        print(f"           python classifier.py --classify {input_path} --delimiter ','")
        print(f"    Step4: ファイルをUTF-8で保存し直す（Excelなら「CSV UTF-8」で保存）")


def cmd_learn(corrected_path: str):
    """
    ユーザーが修正したCSVから学習データを追加する
    corrected.csv には predicted_account と correct_account 列が必要
    """
    clf = AccountClassifier()
    count = 0

    with open(corrected_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text    = row.get("description") or row.get("内容") or row.get("摘要") or ""
            correct = row.get("correct_account") or row.get("正解科目") or ""
            if text and correct:
                clf.add_correction(text, correct)
                count += 1

    print(f"[learn] {count}件の正解ラベルを追加しました")
    print("  → python classifier.py --train で再学習してください")


def cmd_train():
    """training_data.csv からモデルを学習する"""
    if not TRAIN_DATA.exists():
        print("[train] training_data.csv がありません")
        print("  まず --classify でデータを分類し、--learn で正解ラベルを追加してください")
        sys.exit(1)

    df = pd.read_csv(TRAIN_DATA, encoding="utf-8-sig")
    df = df.dropna(subset=["text", "account"])
    df = df[df["text"].str.strip() != ""]

    if len(df) < 5:
        print(f"[train] 学習データが少なすぎます（{len(df)}件）。最低5件必要です")
        sys.exit(1)

    print(f"[train] 学習データ: {len(df)}件 / {df['account'].nunique()}科目")

    # クロスバリデーション（データが十分ある場合）
    if len(df) >= 20:
        pipeline = train_model(df)
        X = df["text"].apply(lambda t: tokens_to_string(tokenize(str(t))))
        y = df["account"]
        cv_scores = cross_val_score(
            pipeline, X, y,
            cv=StratifiedKFold(n_splits=min(5, len(df) // 3), shuffle=True, random_state=42),
            scoring="accuracy"
        )
        print(f"[train] CV精度: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
    else:
        pipeline = train_model(df)

    # 最終モデルを全データで学習
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"[train] モデル保存: {MODEL_PATH}")

    # クラス別件数表示
    print("\n--- 科目別 学習データ件数 ---")
    for acc, cnt in df["account"].value_counts().items():
        bar = "█" * min(cnt, 20)
        print(f"  {acc:20s} {bar} {cnt}件")


def cmd_evaluate():
    """現在のモデルを学習データで評価する"""
    model = load_model()
    if not model:
        print("[evaluate] モデルがありません。先に --train を実行してください")
        sys.exit(1)

    if not TRAIN_DATA.exists():
        print("[evaluate] training_data.csv がありません")
        sys.exit(1)

    df = pd.read_csv(TRAIN_DATA, encoding="utf-8-sig").dropna(subset=["text", "account"])
    X = df["text"].apply(lambda t: tokens_to_string(tokenize(str(t))))
    y = df["account"]
    y_pred = model.predict(X)

    print("\n=== 分類レポート ===")
    print(classification_report(y, y_pred, zero_division=0))
    acc = (y == y_pred).mean()
    print(f"全体精度: {acc:.1%}")


def cmd_add_rule(account: str, keywords: str):
    """キーワードルールに新しいエントリを追加する"""
    rules = load_rules()
    kw_list = [k.strip() for k in keywords.split(",") if k.strip()]
    if account not in rules:
        rules[account] = []
    for kw in kw_list:
        if kw not in rules[account]:
            rules[account].append(kw)
    save_rules(rules)
    print(f"[rule] '{account}' にキーワードを追加: {kw_list}")


def cmd_stats():
    """分類履歴の統計を表示する"""
    if not HISTORY_PATH.exists():
        print("[stats] 履歴がありません")
        return
    with open(HISTORY_PATH, encoding="utf-8") as f:
        history = json.load(f)
    total    = len(history)
    corrected = sum(1 for h in history if h.get("corrected"))
    by_method = {}
    for h in history:
        m = h.get("method", "unknown")
        by_method[m] = by_method.get(m, 0) + 1
    print(f"\n=== 分類統計 ===")
    print(f"  総分類数:   {total}件")
    print(f"  ユーザー修正: {corrected}件（修正率 {corrected/max(total,1):.1%}）")
    print(f"\n  分類手法の内訳:")
    for method, cnt in sorted(by_method.items(), key=lambda x: -x[1]):
        pct = cnt / max(total, 1)
        print(f"    {method:20s} {cnt}件 ({pct:.1%})")


# ===== メイン =====
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="PRiMPO CSV 勘定科目 自動分類エンジン",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使い方の流れ:
  1. python classifier.py --classify input.csv
     → output_classified.csv に予測科目が追記される

  2. output_classified.csv を開き、correct_account 列に正解を入力

  3. python classifier.py --learn output_classified.csv
     → 正解データを training_data.csv に蓄積

  4. python classifier.py --train
     → 機械学習モデルを学習・保存

  5. python classifier.py --evaluate
     → 精度確認

  繰り返すほど精度が向上します。
        """
    )
    parser.add_argument("--classify",   metavar="INPUT_CSV",    help="CSVを分類する")
    parser.add_argument("--output",     metavar="OUTPUT_CSV",   help="出力先CSVパス", default="output_classified.csv")
    parser.add_argument("--encoding",   metavar="ENCODING",     help="文字コード指定 (例: utf-8 / cp932 / shift-jis)", default="")
    parser.add_argument("--delimiter",  metavar="DELIM",        help="区切り文字 (例: , またはタブ)", default="")
    parser.add_argument("--col-date",   metavar="COL",          help="日付列名 (例: '日付')", default="")
    parser.add_argument("--col-desc",   metavar="COL",          help="摘要列名 (例: '内容')", default="")
    parser.add_argument("--col-amount", metavar="COL",          help="金額列名 (例: '金額')", default="")
    parser.add_argument("--learn",      metavar="CORRECTED_CSV", help="修正済みCSVを学習データに追加")
    parser.add_argument("--train",      action="store_true",    help="モデルを学習する")
    parser.add_argument("--evaluate",   action="store_true",    help="モデルを評価する")
    parser.add_argument("--stats",      action="store_true",    help="分類統計を表示")
    parser.add_argument("--add-rule",   nargs=2, metavar=("ACCOUNT", "KEYWORDS"),
                                        help="ルール追加: --add-rule 旅費交通費 'suica,icoca,バス'")

    args = parser.parse_args()

    if args.classify:
        cmd_classify(
            args.classify, args.output,
            encoding=args.encoding,
            delimiter=args.delimiter,
            col_date=args.col_date,
            col_desc=args.col_desc,
            col_amount=args.col_amount,
        )
    elif args.learn:
        cmd_learn(args.learn)
    elif args.train:
        cmd_train()
    elif args.evaluate:
        cmd_evaluate()
    elif args.stats:
        cmd_stats()
    elif args.add_rule:
        cmd_add_rule(args.add_rule[0], args.add_rule[1])
    else:
        parser.print_help()
