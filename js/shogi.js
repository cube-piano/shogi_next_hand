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

let currentProblem = null;

document
    .getElementById("answer-btn")
    .addEventListener("click", () => {
        if (!currentProblem) return;

        document.getElementById("answer-text").textContent =
            currentProblem.answers.join(", ");

        document.getElementById("comment-text").textContent =
            currentProblem.comment;

        document.getElementById("answer-area").style.display = "block";
        document.getElementById("answer-btn").style.display = "None";
        document.getElementById("correct-btn").style.display = "block";
        document.getElementById("incorrect-btn").style.display = "block";
    });


// 問題読み込み
fetch("problems.json")
    .then(res => res.json())
    .then(data => {
        currentProblem = data[0];   // 今回は1問目
        drawBoardFromSFEN(currentProblem.sfen);

        const sfenParts = currentProblem.sfen.split(" ");
        drawHands(sfenParts[2]);
    })
    .catch(err => {
        console.error("problems.json 読み込み失敗", err);
    });

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

function createCell(text, colorClass = "", cellBorder) {
    const div = document.createElement("div");
    border = cellBorder ? "border " : ""
    div.className = "cell " + border + colorClass;
    div.textContent = text;
    return div;
}

function isNumber(c) {
    return c >= "0" && c <= "9";
}
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

