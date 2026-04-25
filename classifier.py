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

def cmd_classify(input_path: str, output_path: str):
    """CSVを分類してoutput.csvに出力する"""
    clf = AccountClassifier()
    rows = []

    with open(input_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # PRiMPO CSVフォーマット: date, description, amount, category
            text      = row.get("description") or row.get("内容") or row.get("摘要") or ""
            amount_str = row.get("amount") or row.get("金額") or "0"
            try:
                amount = float(str(amount_str).replace(",", "").replace("¥", "").replace("￥", ""))
            except ValueError:
                amount = 0.0
            is_income = amount >= 0

            result = clf.classify(text, amount=abs(amount), is_income=is_income)

            rows.append({
                **row,
                "predicted_account": result["account"],
                "confidence":        result["confidence"],
                "method":            result["method"],
                "alternatives":      "|".join(result["alternatives"]),
                "needs_review":      "要確認" if result["needs_review"] else "OK",
            })

    # 出力
    if rows:
        with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    print(f"[classify] {len(rows)}件を分類 → {output_path}")
    needs_review = sum(1 for r in rows if r["needs_review"] == "要確認")
    if needs_review:
        print(f"  ⚠ 要確認: {needs_review}件（confidence < 0.5）")


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
    parser.add_argument("--classify",   metavar="INPUT_CSV",     help="CSVを分類する")
    parser.add_argument("--output",     metavar="OUTPUT_CSV",     help="出力先CSVパス", default="output_classified.csv")
    parser.add_argument("--learn",      metavar="CORRECTED_CSV",  help="修正済みCSVを学習データに追加")
    parser.add_argument("--train",      action="store_true",       help="モデルを学習する")
    parser.add_argument("--evaluate",   action="store_true",       help="モデルを評価する")
    parser.add_argument("--stats",      action="store_true",       help="分類統計を表示")
    parser.add_argument("--add-rule",   nargs=2, metavar=("ACCOUNT", "KEYWORDS"),
                                        help="ルール追加: --add-rule 旅費交通費 'suica,icoca,バス'")

    args = parser.parse_args()

    if args.classify:
        cmd_classify(args.classify, args.output)
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
