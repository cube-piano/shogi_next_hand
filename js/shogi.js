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

let problemFiles = []; // 問題のjsonファイル名一覧
let currentIndex = 0; // 問題のindex
let currentProblem = null; // 現在の問題

// 解答表示ボタンを押したときの処理
document
    .getElementById("answer-btn")
    .addEventListener("click", () => {
        if (!currentProblem) return;

        document.getElementById("answer-text").textContent =
            currentProblem.answers;

        document.getElementById("comment-text").textContent =
            currentProblem.comment;

        document.getElementById("answer-area").style.display = "block";
        document.getElementById("answer-btn").style.display = "None";
        document.getElementById("correct-btn").style.display = "block";
        document.getElementById("incorrect-btn").style.display = "block";
    });

document.getElementById("correct-btn").onclick = () => {
    if (currentIndex < problemFiles.length - 1) {
        currentIndex += 1;
        loadProblemByIndex(currentIndex);
    }
};

document.getElementById("incorrect-btn").onclick = () => {
    if (currentIndex > 0) {
        currentIndex -= 1;
        loadProblemByIndex(currentIndex);
    }
};

// 問題一覧読み込み
fetch("problems/index.json")
    .then(res => res.json())
    .then(list => {
        problemFiles = list;
        loadProblemByIndex(0);
    })
    .catch(err => {
        console.error("index.json 読み込み失敗", err);
    });

// indexを指定すると問題を読み込む
function loadProblemByIndex(index) {
    fetch("problems/" + problemFiles[index])
        .then(res => res.json())
        .then(data => {
            const problem = Array.isArray(data) ? data[0] : data;
            currentProblem = problem;
            renderProblem(problem);
        });
}

// 読み込んだ問題の表示
function renderProblem(problem) {
    if (!problem || !problem.sfen) {
        console.error("不正な問題データ:", problem);
        return;
    }

    document.getElementById("problem-id").textContent = problem.id;

    drawBoardFromSFEN(problem.sfen);
    drawHands(problem.sfen.split(" ")[2]);

    document.getElementById("answer-area").style.display = "None";
    document.getElementById("answer-btn").style.display = "block";
    document.getElementById("correct-btn").style.display = "None";
    document.getElementById("incorrect-btn").style.display = "None";
}

// 盤面sfenを与えられて，盤面と持ち駒を描画する
function drawBoardFromSFEN(sfen) {
    const boardDiv = document.getElementById("board");
    boardDiv.innerHTML = "";

    const parts = sfen.split(" ");
    const boardPart = parts[0];
    const handPart = parts[2];   // 持ち駒

    const ranks = boardPart.split("/");

    ranks.forEach(rank => {
        for (let i = 0; i < rank.length; i++) {
            const c = rank[i];

            // 空マス
            if (isNumber(c)) {
                for (let j = 0; j < Number(c); j++) {
                    boardDiv.appendChild(createCell("", "", true));
                }
            }
            // 成り駒
            else if (c === "+") {
                const p = rank[++i];  // 次の文字が本体
                const isBlack = p === p.toUpperCase();
                const piece = promotedMap[p.toLowerCase()];
                boardDiv.appendChild(
                    createCell(piece, isBlack ? "black" : "white", true)
                );
            }
            // 通常駒
            else {
                const isBlack = c === c.toUpperCase();
                const piece = pieceMap[c.toLowerCase()] || "";
                boardDiv.appendChild(
                    createCell(piece, isBlack ? "black" : "white", true)
                );
            }
        }
    });
    drawHands(handPart);
}

// マスを描画する(枠線の有無を選択できる)
function createCell(text, colorClass = "", cellBorder) {
    const div = document.createElement("div");
    border = cellBorder ? "border " : ""
    div.className = "cell " + border + colorClass;
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

