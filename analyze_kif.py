import shogi
import shogi.KIF
import re
import json
from pathlib import Path

KIF_PATH = "input/input4.kif"
OUT_DIR = Path("output")
OUT_DIR.mkdir(exist_ok=True)

eval_pattern = re.compile(r"評価値\s*(-?\d+)")
# 指し手の行を取り出す正規表現
move_line_pattern = re.compile(r"^\s+\d+\s+")

# 棋譜をすべて読み込む
def read_kif(path):
    # ShiftJISで読み込む
    with open(path, encoding="cp932", newline="") as f:
        return f.readlines()

def parse():
    # 棋譜をすべて読み込む
    lines = read_kif(KIF_PATH)

    # --- 評価値抽出 ---
    evals = []
    # 1行ずつ読み込む
    for line in lines:
        # **解析から始まる行(評価値，読み筋)
        if line.startswith("**解析"):
            m = eval_pattern.search(line)
            print(f"eval: {m}")
            if m:
                evals.append(int(m.group(1)))
        # 数字から始まる行 (棋譜の一手)
        if move_line_pattern.match(line):
            print("指し手行:", line.strip())

    # --- 解析行を除去 ---
    kif_text = "".join(l for l in lines if not l.startswith("**"))

    games = shogi.KIF.Parser.parse_str(kif_text)
    if not games:
        raise RuntimeError("KIFの解析に失敗しました")

    game = games[0]

    board = shogi.Board()
    moves = game["moves"]   # ← これが正解

    last_eval = None

    for i, move in enumerate(moves):
        sfen_before = board.sfen()

        # --- 型安全な指し手適用 ---
        if isinstance(move, shogi.Move):
            board.push(move)
        elif isinstance(move, str):
            board.push_usi(move)
        else:
            raise TypeError(f"未知の指し手型: {type(move)}")

        if i >= len(evals):
            break

        current_eval = evals[i]

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
    # print(starts_with_number_regex("   45 s"))
