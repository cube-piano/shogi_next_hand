// SFEN → 駒文字マップ
const pieceMap = {
    p: "歩", l: "香", n: "桂", s: "銀",
    g: "金", b: "角", r: "飛", k: "玉"
};

const promotedMap = {
    p: "と",
    l: "杏",
    n: "圭",
    s: "全",
    b: "馬",
    r: "龍"
};

const STATS_KEY = "shogi_problem_stats";
let problemFiles = []; // 問題のjsonファイル名一覧
let currentProblem = null; // 現在の問題

// 解答表示ボタンを押したときの処理
document
    .getElementById("answer-btn")
    .addEventListener("click", () => {
        if (!currentProblem) return;

        document.getElementById("answer-text").textContent =
            currentProblem.answer_hand + " (評価値: " + currentProblem.current_eval + ")";
        document.getElementById("real-text").textContent = currentProblem.real_hand + " (評価値: " + currentProblem.after_eval + ")";
        document.getElementById("after-text").textContent =
            currentProblem.after_hands;
        document.getElementById("id-text").textContent = currentProblem.id;
        document.getElementById("date-text").textContent = currentProblem.date;

        document.getElementById("answer-area").style.display = "block";
        document.getElementById("answer-btn").style.display = "None";
        document.getElementById("correct-btn").style.display = "block";
        document.getElementById("incorrect-btn").style.display = "block";
        document.getElementById("detail-area").style.display = "block";
        document.getElementById("manu-btn-area").style.display = "block";
    });

// 正解のとき
document.getElementById("correct-btn").onclick = () => {
    recordAnswer(currentProblem.id, true, false);  // 正解
    loadProblem(getRandomIndex());
};
// 不正解のとき
document.getElementById("incorrect-btn").onclick = () => {
    recordAnswer(currentProblem.id, false, false);  // 不正解
    loadProblem(getRandomIndex());
};
// 問題削除
document.getElementById("delete-btn").onclick = () => {
    recordAnswer(currentProblem.id, false, true);  // 問題削除
    loadProblem(getRandomIndex());
};
// statsをリセットする
document.getElementById("clear-log-btn").onclick = () => {
    localStorage.clear()
};

// 問題一覧読み込み
fetch("problems/index.json")
    .then(res => res.json())
    .then(list => {
        problemFiles = list;
        loadProblem(getRandomIndex());
    })
    .catch(err => {
        console.error("index.json 読み込み失敗", err);
    });

// index番の問題を読み込む
function loadProblem(index) {
    fetch("problems/" + problemFiles[index])
        .then(res => res.json())
        .then(data => {
            const problem = Array.isArray(data) ? data[0] : data;
            currentProblem = problem;
            renderProblem(problem);
        });
}

// 出題するindexをランダムに選ぶ
function getRandomIndex() {
    const stats = loadStats();
    const maxTry = problemFiles.length * 2;

    for (let i = 0; i < maxTry; i++) {
        const r = Math.floor(Math.random() * problemFiles.length);
        const filename = problemFiles[r].split(".");
        const id = filename[0]

        if (stats[id] && stats[id].delete > 0) {
            continue;
        }
        return r
    }
    // 全部deleteされていた場合は妥協
    return Math.floor(Math.random() * problemFiles.length);
}

function loadStats() {
    return JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
}

function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function recordAnswer(problemId, isCorrect, isDelete) {
    const stats = loadStats();
    // statsがないなら作成
    if (!stats[problemId]) {
        stats[problemId] = { correct: 0, total: 0, delete: 0 };
    }

    stats[problemId].total += 1;
    if (isCorrect) {
        stats[problemId].correct += 1;
    }
    if (isDelete) {
        stats[problemId].delete = 1;
    }

    saveStats(stats);
}

function getProblemAccuracy(problemId) {
    const stats = loadStats();
    const s = stats[problemId];
    if (!s || s.total === 0) return null;

    return Math.round((s.correct / s.total) * 100);
}

// ===============================================================
// 描画処理
// ===============================================================

// 問題の表示
function renderProblem(problem) {
    if (!problem || !problem.sfen) {
        console.error("不正な問題データ:", problem);
        return;
    }

    // プレイヤー名を表示
    document.getElementById("player-black").textContent = "▲ " + problem.black_player
    document.getElementById("player-white").textContent = "△ " + problem.white_player

    // 正答率を表示
    const acc = getProblemAccuracy(problem.id);
    if (acc !== null) {
        document.getElementById("accuracy-text").textContent = `正答率: ${acc}%`;
    } else {
        document.getElementById("accuracy-text").textContent = "まだ解答されていません"
    }

    // sfenを解釈 [盤面，手番，持ち駒]
    sfenList = problem.sfen.split(" ")
    // 盤面の描画
    drawBoard(sfenList[0], problem.last_move)
    // 手番の描画
    drawTurn(sfenList[1])
    // 持ち駒の描画
    drawHands(sfenList[2])

    // 見せるパーツ・見せないパーツの指定
    document.getElementById("answer-area").style.display = "None";
    document.getElementById("answer-btn").style.display = "block";
    document.getElementById("correct-btn").style.display = "None";
    document.getElementById("incorrect-btn").style.display = "None";
    document.getElementById("detail-area").style.display = "None";
    document.getElementById("manu-btn-area").style.display = "None";
}

function drawBoard(sfen_board, last_move) {
    const boardDiv = document.getElementById("board");
    boardDiv.innerHTML = "";
    const ranks = sfen_board.split("/");

    // rankIndex: 0 → a段, 8 → i段
    ranks.forEach((rank, rankIndex) => {
        let file = 9; // 左から 9筋 → 1筋

        for (let i = 0; i < rank.length; i++) {
            const c = rank[i];

            // 空マス
            if (isNumber(c)) {
                for (let j = 0; j < Number(c); j++) {
                    const square = `${file}${String.fromCharCode(97 + rankIndex)}`;
                    const highlight = last_move && (last_move.to === square || last_move.from === square);

                    boardDiv.appendChild(
                        createCell("", "", true, highlight)
                    );
                    file--;
                }
            }
            // 成り駒
            else if (c === "+") {
                const p = rank[++i];
                const isBlack = p === p.toUpperCase();
                const piece = promotedMap[p.toLowerCase()];

                const square = `${file}${String.fromCharCode(97 + rankIndex)}`;
                const highlight = last_move && (last_move.to === square || last_move.from === square);

                boardDiv.appendChild(
                    createCell(
                        piece,
                        isBlack ? "black" : "white",
                        true,
                        highlight
                    )
                );
                file--;
            }
            // 通常駒
            else {
                const isBlack = c === c.toUpperCase();
                const piece = pieceMap[c.toLowerCase()] || "";

                const square = `${file}${String.fromCharCode(97 + rankIndex)}`;
                const highlight = last_move && (last_move.to === square || last_move.from === square);

                boardDiv.appendChild(
                    createCell(
                        piece,
                        isBlack ? "black" : "white",
                        true,
                        highlight
                    )
                );
                file--;
            }
        }
    });
}

// 手番を表示
function drawTurn(turn) {
    if (turn == "b") {
        document.getElementById("turn").textContent = "先手の手番です"
    } else {
        document.getElementById("turn").textContent = "後手の手番です"
    }
}

// マスを描画する(枠線の有無・ハイライトを指定)
function createCell(text, colorClass, border, highlight) {
    const div = document.createElement("div");
    div.className = "cell " + colorClass;
    if (border) {
        div.classList.add("border");
    }
    if (highlight) {
        div.classList.add("highlight");
    }
    div.textContent = text;
    return div;
}

// 数字が範囲内かを判定する
function isNumber(c) {
    return c >= "0" && c <= "9";
}

// 持ち駒描画
function drawHands(handPart) {
    const blackHand = document.getElementById("black-hand");
    const whiteHand = document.getElementById("white-hand");

    // クリア
    blackHand.innerHTML = "";
    whiteHand.innerHTML = "";

    if (handPart === "-" || !handPart) return;

    let countStr = "";

    for (let c of handPart) {
        // 数字（枚数）
        if (isNumber(c)) {
            countStr += c;   // 複数桁対応
        } else {
            const count = countStr === "" ? 1 : Number(countStr);
            countStr = "";

            const isBlack = c === c.toUpperCase();
            const piece = pieceMap[c.toLowerCase()];
            const target = isBlack ? blackHand : whiteHand;

            // 枚数分だけ描画
            for (let i = 0; i < count; i++) {
                target.appendChild(
                    createCell(piece, isBlack ? "black" : "white", false)
                );
            }
        }
    }
}

