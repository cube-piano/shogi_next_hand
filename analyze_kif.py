import shogi
import shogi.KIF
import re
import json
from pathlib import Path
from collections import defaultdict

KIF_PATH = "input/input4.kif"
OUT_DIR = Path("problems")
OUT_DIR.mkdir(exist_ok=True)

# 日付を取得する正規表現
date_pattern = re.compile(r"(\d{4}/\d{2}/\d{2})")
# プレイヤー名を取得する正規表現
player_pattern =  re.compile(r"^(先手|後手)：(.+)$")
# 評価値の行を分析する正規表現
analysis_eval_pattern = re.compile(r"評価値\s*(-?\d+)\s+読み筋\s+(.+)$")
# 手数を取得する正規表現
move_line_pattern = re.compile(r"^\s*(\d+)\s+")


# 棋譜をすべて読み込む
def read_kif(path):
    # ShiftJISで読み込む
    with open(path, encoding="cp932", newline="") as f:
        return f.readlines()
    
def usi_to_japanese(sfen, usi_move: str) -> str:
    board = shogi.Board(sfen)
    return shogi.KIF.Exporter.kif_move_from(usi_move, board)

def push_move(move, board):
    if isinstance(move, shogi.Move):
        board.push(move)
    elif isinstance(move, str):
        board.push_usi(move)
    else:
        raise TypeError(f"未知の指し手型: {type(move)}")
    
def parse():
    # 棋譜をすべて読み込む
    lines = read_kif(KIF_PATH)

    date = ""
    player_black = ""
    player_white = ""

    analysis_data = []
    pending_analysis = []  # 直近の解析（手数未確定）

    # 評価値・読み筋を抽出
    for line in lines:
        line = line.replace("　", "")
        search_date = date_pattern.search(line)
        search_player = player_pattern.search(line)

        if search_date:
            date = search_date.group(1)
        elif search_player:
            if search_player.group(1) == "先手":
                player_black = search_player.group(2).rstrip("\r")
            else:
                player_white = search_player.group(2).rstrip("\r")

        # --- 解析行 ---
        if line.startswith("**解析"):
            m = analysis_eval_pattern.search(line)
            if m:
                pending_analysis.append({
                    "eval": int(m.group(1)),
                    "pv": m.group(2)
                })
            continue

        # --- 指し手行（手数確定） ---
        m = move_line_pattern.match(line)
        if m and pending_analysis:
            num = int(m.group(1))

            for a in pending_analysis:
                analysis_data.append({
                    "num": num,
                    "eval": a["eval"],
                    "pv": a["pv"]
                })

            pending_analysis.clear()

    analysis_by_num = defaultdict(list)
    for a in analysis_data:
        analysis_by_num[a["num"]].append(a)

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

    for i, move in enumerate(moves):
        move_num = i + 1  # 棋譜の手数 (1始まり)

        # この手数に解析がなければスキップ
        if move_num not in analysis_by_num:
            push_move(move, board)
            continue

        # 現在の局面
        current_board = board.sfen()

        # 実際に指された手（日本語）
        real_hand = usi_to_japanese(current_board, move)
        if len(analysis_by_num[move_num + 1]) <= 0:
            push_move(move, board)
            continue
        after_eval = analysis_by_num[move_num + 1][0]["eval"]

        for analysis in analysis_by_num[move_num]:
            current_eval = analysis["eval"]
            pv = analysis["pv"]

            # PVを1手ずつ分割（全角空白対応）
            best_hands = re.sub(r"[ ]+", " ", pv).strip().split(" ")

            out = {
                "id": f"Q{move_num:04}",
                "date": date,
                "sfen": current_board,
                "answer_hand": [best_hands[0]],
                "real_hand": real_hand,
                "after_hands": [best_hands[1:]],
                "current_eval": current_eval,
                "after_eval": after_eval,
                "black_player": player_black,
                "white_player": player_white,
            }

            diff = abs(current_eval - after_eval)
            if diff >= 200:
                with open(
                    OUT_DIR / f"{out['id']}.json",
                    "w",
                    encoding="utf-8"
                ) as fw:
                    json.dump(out, fw, ensure_ascii=False, indent=4)

        # 局面を進める
        push_move(move, board)


    # for i, move in enumerate(moves):
    #     print(i, move)
    #     # index外ならスキップ
    #     if i+1 >= len(predicted_hand) or i+1 >= len(eval_values):
    #         break

    #     # 現在の局面 (sfen形式)
    #     current_board = board.sfen()
    #     print(" " + current_board)
    #     # 現在の評価値
    #     current_eval = eval_values[i]

    #     # 実際に指された次の指し手 (日本語)
    #     next_hand = usi_to_japanese(current_board, move)
    #     # 最善の手順 (全角スペースを取り除いたうえで一手ごとに分割)
    #     best_hands = str(predicted_hand[i]).replace("　", "").split(" ")
    #     best_hands = best_hands[:-1]
    #     # 指した後の評価値
    #     next_eval = eval_values[i+1]

    #     # if(i == 49):
    #     #     print(current_board)
    #     #     print(current_eval)
    #     #     print(next_hand)
    #     #     print(best_hands)
    #     #     print(next_eval)

    #     if next_eval is not None:
    #         diff = current_eval - next_eval

    #         # 後手番補正
    #         if not board.turn:
    #             diff = -diff

    #         # if diff >= 200:
    #         if i < 80:
    #             label = "悪手" if diff >= 500 else "疑問手"

    #             out = {
    #                 "id": f"Q{i+1:04}",
    #                 "date": date,
    #                 "sfen": current_board,
    #                 "answers": [best_hands[0]],
    #                 "real": next_hand,
    #                 "after" : [best_hands[1:]],
    #                 "current_eval": current_eval,
    #                 "after_eval": next_eval,
    #                 "black_player": player_black,
    #                 "white_player": player_white,
    #                 "comment": f"{i+1}手目は評価値が{diff}低下する{label}"
    #             }

    #             with open(
    #                 OUT_DIR / f"{out['id']}.json",
    #                 "w",
    #                 encoding="utf-8"
    #             ) as fw:
    #                 json.dump(out, fw, ensure_ascii=False, indent=4)

    #         # --- 型安全な指し手適用 ---
    #         if isinstance(move, shogi.Move):
    #             board.push(move)
    #         elif isinstance(move, str):
    #             board.push_usi(move)
    #         else:
    #             raise TypeError(f"未知の指し手型: {type(move)}")

if __name__ == "__main__":
    parse()
