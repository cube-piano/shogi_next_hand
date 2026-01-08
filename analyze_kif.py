import shogi
import shogi.KIF
import re
import json
from pathlib import Path
from collections import defaultdict

KIF_PATH = "input/input4.kif"
OUT_DIR = Path("problems")
OUT_DIR.mkdir(exist_ok=True)
INDEX_PATH = OUT_DIR / "index.json"

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

# usi形式の指し手を日本語に直す 
def usi_to_japanese(sfen, usi_move: str) -> str:
    board = shogi.Board(sfen)
    return shogi.KIF.Exporter.kif_move_from(usi_move, board)

# boardにmoveを適用して局面を進める
def push_move(move, board):
    if isinstance(move, shogi.Move):
        board.push(move)
    elif isinstance(move, str):
        board.push_usi(move)
    else:
        raise TypeError(f"未知の指し手型: {type(move)}")

# moveをusi形式に直す
def normalize_usi(move):
    if isinstance(move, shogi.Move):
        return move.usi()
    return move

# usi形式のfromとtoを分解する
def parse_last_move(usi: str):
    # 駒打ち
    if "*" in usi:
        return {
            "usi": usi,
            "from": None,
            "to": usi[2:4],
            "piece": usi[0],
            "promote": False,
            "drop": True
        }

    return {
        "usi": usi,
        "from": usi[0:2],
        "to": usi[2:4],
        "piece": None,          # 必要なら board から取得
        "promote": usi.endswith("+"),
        "drop": False
    }

# 出力フォルダの最大idを取得する
def get_next_problem_id(out_dir: Path) -> int:
    nums = []
    for p in out_dir.glob("Q*.json"):
        m = re.match(r"Q(\d{4})\.json", p.name)
        if m:
            nums.append(int(m.group(1)))
    return max(nums) + 1 if nums else 0

# index.jsonを読み込む
def load_index(path: Path):
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return []

# index_listをindex.jsonに保存する
def save_index(path: Path, index_list):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(index_list, f, ensure_ascii=False, indent=4)


def parse():
    # ファイル用id
    next_id = get_next_problem_id(OUT_DIR)

    # index.jsonに書き込む用のリスト
    index_list = load_index(INDEX_PATH)

    # 棋譜をすべて読み込む
    lines = read_kif(KIF_PATH)

    date = ""
    player_black = ""
    player_white = ""

    analysis_data = [] # 読み筋(最善手)のリストを保存する
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

            diff = current_eval - after_eval
            # 後手番補正
            if board.turn:
                diff = -diff

            # 200点以上評価値が下がる手の場合は記録
            if diff >= 200:
                # PVを1手ずつ分割（全角空白対応）
                best_hands = re.sub(r"[ ]+", " ", pv).strip().split(" ")

                out = {
                    "id": f"Q{next_id:04}",
                    "date": date,
                    "sfen": current_board,
                    "last_move": last_move,
                    "answer_hand": [best_hands[0]],
                    "real_hand": best_hands[0][0] + real_hand,
                    "after_hands": [best_hands],
                    "current_eval": current_eval,
                    "after_eval": after_eval,
                    "black_player": player_black,
                    "white_player": player_white,
                }

                with open(
                    OUT_DIR / f"{out['id']}.json",
                    "w",
                    encoding="utf-8"
                ) as fw:
                    json.dump(out, fw, ensure_ascii=False, indent=4)
                filename = f"{out['id']}.json"
                index_list.append(filename)
                next_id += 1

        # 直前の一手を保存
        usi = normalize_usi(move)
        last_move = parse_last_move(usi)

        # 局面を進める
        push_move(move, board)
    save_index(INDEX_PATH, index_list)

if __name__ == "__main__":
    parse()
