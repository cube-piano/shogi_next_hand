import shogi
import shogi.KIF
import re
import json
from pathlib import Path

KIF_PATH = "input/input4.kif"
OUT_DIR = Path("output")
OUT_DIR.mkdir(exist_ok=True)

# 評価値の行を分析する正規表現
analysis_pattern = re.compile(
    r"評価値\s*(-?\d+)\s+読み筋\s+(.+)$"
)

# 棋譜をすべて読み込む
def read_kif(path):
    # ShiftJISで読み込む
    with open(path, encoding="cp932", newline="") as f:
        return f.readlines()

def parse():
    # 棋譜をすべて読み込む
    lines = read_kif(KIF_PATH)

    eval_values = [] # 評価値のリスト
    predicted_hand = [] # 読み筋のリスト

    # 評価値・読み筋を抽出
    for line in lines:
        # **解析から始まる行のみ調べる (評価値，読み筋)
        if line.startswith("**解析"):
            # 正規表現で取り出す
            m = analysis_pattern.search(line)
            if m:
                eval_value = int(m.group(1)) # 評価値
                eval_values.append(eval_value)
                ph = m.group(2) # 読み筋
                predicted_hand.append(ph)

    # --- 解析行を除去 ---
    kif_text = "".join(l for l in lines if not l.startswith("**"))
    # 棋譜を解析
    games = shogi.KIF.Parser.parse_str(kif_text)
    if not games:
        raise RuntimeError("KIFの解析に失敗しました")
    game = games[0] # gamesはリストになっているので0番目のみ抽出
    moves = game["moves"]   # 解析結果から指し手のリストを抽出

    # 棋譜を並べるための盤面
    board = shogi.Board()
    last_eval = None

    # ここまで実装確認済み

    for i, move in enumerate(moves):
        sfen_before = board.sfen()

        # --- 型安全な指し手適用 ---
        if isinstance(move, shogi.Move):
            board.push(move)
        elif isinstance(move, str):
            board.push_usi(move)
        else:
            raise TypeError(f"未知の指し手型: {type(move)}")

        if i >= len(eval_values):
            break

        current_eval = eval_values[i]

        if last_eval is not None:
            diff = last_eval - current_eval

            # 後手番補正
            if not board.turn:
                diff = -diff

            if diff >= 200:
                label = "悪手" if diff >= 500 else "疑問手"

                out = {
                    "id": f"KIF_M{i+1}",
                    "sfen": sfen_before,
                    "answers": [],
                    "comment": f"{i+1}手目は評価値が{diff}低下する{label}"
                }

                with open(
                    OUT_DIR / f"{out['id']}.json",
                    "w",
                    encoding="utf-8"
                ) as fw:
                    json.dump(out, fw, ensure_ascii=False, indent=2)

        last_eval = current_eval

if __name__ == "__main__":
    parse()
