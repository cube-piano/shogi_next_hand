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


// 問題読み込み
fetch("problems.json")
    .then(res => res.json())
    .then(data => {
        drawBoardFromSFEN(data[0].sfen);
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
                    boardDiv.appendChild(createCell(""));
                }
            }
            // 成り駒
            else if (c === "+") {
                const p = rank[++i];  // 次の文字が本体
                const isBlack = p === p.toUpperCase();
                const piece = promotedMap[p.toLowerCase()];
                boardDiv.appendChild(
                    createCell(piece, isBlack ? "black" : "white")
                );
            }
            // 通常駒
            else {
                const isBlack = c === c.toUpperCase();
                const piece = pieceMap[c.toLowerCase()] || "";
                boardDiv.appendChild(
                    createCell(piece, isBlack ? "black" : "white")
                );
            }
        }
    });

    drawHands(handPart);
}
fetch("problems.json")
    .then(res => res.json())
    .then(data => {
        drawBoardFromSFEN(data[0].sfen);
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
                    boardDiv.appendChild(createCell(""));
                }
            }
            // 成り駒
            else if (c === "+") {
                const p = rank[++i];  // 次の文字が本体
                const isBlack = p === p.toUpperCase();
                const piece = promotedMap[p.toLowerCase()];
                boardDiv.appendChild(
                    createCell(piece, isBlack ? "black" : "white")
                );
            }
            // 通常駒
            else {
                const isBlack = c === c.toUpperCase();
                const piece = pieceMap[c.toLowerCase()] || "";
                boardDiv.appendChild(
                    createCell(piece, isBlack ? "black" : "white")
                );
            }
        }
    });

    drawHands(handPart);
}


function createCell(text, colorClass = "") {
    const div = document.createElement("div");
    div.className = "cell " + colorClass;
    div.textContent = text;
    return div;
}

function isNumber(c) {
    return c >= "0" && c <= "9";
}
