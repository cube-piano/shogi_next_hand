// SFEN → 駒文字マップ
const pieceMap = {
    p: "歩", l: "香", n: "桂", s: "銀",
    g: "金", b: "角", r: "飛", k: "玉"
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

    const boardPart = sfen.split(" ")[0];
    const ranks = boardPart.split("/");

    ranks.forEach(rank => {
        for (let c of rank) {
            if (isNumber(c)) {
                for (let i = 0; i < Number(c); i++) {
                    boardDiv.appendChild(createCell(""));
                }
            } else {
                const isBlack = c === c.toUpperCase(); // SFEN仕様
                const piece = pieceMap[c.toLowerCase()] || "";
                boardDiv.appendChild(
                    createCell(piece, isBlack ? "black" : "white")
                );
            }
        }
    });
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
