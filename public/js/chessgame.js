const socket = io();
const chess = new Chess();
const boardElement = document.getElementById("chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const whiteTimer = document.getElementById("white-timer");
const blackTimer = document.getElementById("black-timer");

let whiteTime = 5 * 60;
let blackTime = 5 * 60;
let currentPlayer = "w";
let timerInterval = null;
let gameStarted = false;

const beepAudio = new Audio("/sounds/beep.mp3");

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

const updateTimerUI = () => {
  whiteTimer.innerText = `White: ${formatTime(whiteTime)}`;
  blackTimer.innerText = `Black: ${formatTime(blackTime)}`;
};

const startTimer = () => {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (currentPlayer === "w") {
      whiteTime--;
    } else {
      blackTime--;
    }

    // Beep every second
    beepAudio.currentTime = 0;
    beepAudio.play();

    updateTimerUI();

    if (whiteTime <= 0 || blackTime <= 0) {
      clearInterval(timerInterval);
      alert(currentPlayer === "w" ? "White's time is up!" : "Black's time is up!");
    }
  }, 1000);
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const peiceElement = document.createElement("div");
        peiceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        peiceElement.innerText = getPieceUnicode(square);
        peiceElement.draggable = playerRole === square.color;

        peiceElement.addEventListener("dragstart", (e) => {
          if (peiceElement.draggable) {
            draggedPiece = peiceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        peiceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });
        squareElement.appendChild(peiceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSource);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟",
    r: "♖",
    n: "♘",
    b: "♗",
    q: "♕",
    k: "♔",
    P: "♙",
    R: "♜",
    N: "♞",
    B: "♝",
    Q: "♛",
    K: "♚",
  };
  return unicodePieces[piece.type] || "";
};

socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});

socket.on("boardUpdate", function (fen) {
  chess.load(fen);
  renderBoard();
});

socket.on("move", function (move) {
  chess.move(move);
  currentPlayer = currentPlayer === "w" ? "b" : "w";

  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  } else {
    startTimer(); 
  }

  renderBoard();
});

if (chess.isCheckmate()) {
  clearInterval(timerInterval);
  const winner = currentPlayer === "w" ? "Black" : "White";
  const winText = document.getElementById("win-text");
  const winMessage = document.getElementById("win-message");

  winText.innerText = `${winner} wins by checkmate!`;
  winMessage.classList.remove("hidden");
  winMessage.classList.add("show");
}
updateTimerUI();
renderBoard(); 
