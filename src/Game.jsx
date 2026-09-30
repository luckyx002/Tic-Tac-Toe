import { useState } from "react";
import "./Game.css";

const getEmptyCells = (currentBoard) =>
  currentBoard
    .map((cell, index) => (cell === "" ? index : null))
    .filter((index) => index !== null);

const getRandomMove = (currentBoard) => {
  const emptyCells = getEmptyCells(currentBoard);
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

function Game() {
  const [board, setBoard] = useState(Array(9).fill(""));
  const [isXTurn, setIsXTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [mode, setMode] = useState("player");
  const [difficulty, setDifficulty] = useState(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const winningPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const checkWinner = (currentBoard) => {
    for (let pattern of winningPatterns) {
      const [a, b, c] = pattern;

      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return currentBoard[a];
      }
    }

    if (!currentBoard.includes("")) {
      return "Draw";
    }

    return null;
  };

  const getBestMove = (currentBoard) => {
    const minimax = (position, isAiTurn, depth) => {
      const result = checkWinner(position);

      if (result === "O") return 10 - depth;
      if (result === "X") return depth - 10;
      if (result === "Draw") return 0;

      const scores = [];

      position.forEach((cell, index) => {
        if (cell !== "") return;

        const nextPosition = [...position];
        nextPosition[index] = isAiTurn ? "O" : "X";
        scores.push(minimax(nextPosition, !isAiTurn, depth + 1));
      });

      return isAiTurn ? Math.max(...scores) : Math.min(...scores);
    };

    let bestMove = -1;
    let bestScore = -Infinity;

    currentBoard.forEach((cell, index) => {
      if (cell !== "") return;

      const nextPosition = [...currentBoard];
      nextPosition[index] = "O";
      const score = minimax(nextPosition, false, 0);

      if (score > bestScore) {
        bestScore = score;
        bestMove = index;
      }
    });

    return bestMove;
  };

  const getMediumMove = (currentBoard) => {
    const emptyCells = getEmptyCells(currentBoard);

    for (const mark of ["O", "X"]) {
      for (const index of emptyCells) {
        const testBoard = [...currentBoard];
        testBoard[index] = mark;

        if (checkWinner(testBoard) === mark) return index;
      }
    }

    if (currentBoard.filter(Boolean).length % 3 !== 0) {
      const bestMove = getBestMove(currentBoard);
      if (bestMove !== -1) return bestMove;
    }

    return getRandomMove(currentBoard);
  };

  const handleClick = (index) => {
    if (board[index] || gameOver || isAiThinking || (mode === "ai" && !isXTurn)) return;

    const newBoard = [...board];
    newBoard[index] = isXTurn ? "X" : "O";

    setBoard(newBoard);

    const winner = checkWinner(newBoard);

    if (winner) {
      setGameOver(true);
      return;
    }

    setIsXTurn(!isXTurn);

    // AI turn
    if (mode === "ai" && isXTurn) {
      computerMove(newBoard);
    }
  };

  const computerMove = async (currentBoard) => {
    setIsAiThinking(true);

    let move;
    if (difficulty === "easy") {
      move = getRandomMove(currentBoard);
    } else if (difficulty === "medium") {
      try {
        const response = await fetch("/api/ai-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board: currentBoard }),
        });

        if (!response.ok) throw new Error("AI move request failed");

        const { move: aiMove } = await response.json();
        move = getEmptyCells(currentBoard).includes(aiMove)
          ? aiMove
          : getMediumMove(currentBoard);
      } catch {
        move = getMediumMove(currentBoard);
      }
    } else {
      move = getBestMove(currentBoard);
    }

    if (move === undefined || move === -1) {
      setIsAiThinking(false);
      return;
    }

    const newBoard = [...currentBoard];
    newBoard[move] = "O";

    setBoard(newBoard);
    setIsAiThinking(false);

    const winner = checkWinner(newBoard);

    if (winner) {
      setGameOver(true);
    } else {
      setIsXTurn(true);
    }
  };

  const restartGame = () => {
    setBoard(Array(9).fill(""));
    setIsXTurn(true);
    setGameOver(false);
    setIsAiThinking(false);
  };

  const startAiGame = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setMode("ai");
    setShowDifficultyModal(false);
    restartGame();
  };

  const changeMode = (newMode) => {
    if (newMode === "ai") {
      setShowDifficultyModal(true);
      return;
    }

    setMode("player");
    setDifficulty(null);
    setShowDifficultyModal(false);
    restartGame();
  };

  const winner = checkWinner(board);

  return (
    <div className="game">
      <h1>🎮 Tic-Tac-Toe</h1>

      <div className="mode-buttons">
        <button
          className={mode === "ai" ? "active" : ""}
          onClick={() => changeMode("ai")}
        >
          🤖 Play vs AI
        </button>

        <button
          className={mode === "player" ? "active" : ""}
          onClick={() => changeMode("player")}
        >
          👥 2 Players
        </button>
      </div>

      {mode === "ai" && difficulty && (
        <p className="difficulty-label">
          Mode: vs AI <span>•</span> Difficulty: {difficulty}
        </p>
      )}

      <h2>
        {winner === "Draw"
          ? "🤝 It's a Draw!"
          : winner
            ? `🏆 ${winner} Wins!`
            : mode === "ai"
              ? isXTurn
                ? "Your Turn (X)"
                : isAiThinking
                  ? "AI Thinking... (O)"
                  : "AI Turn (O)"
              : `${isXTurn ? "Player X" : "Player O"}'s Turn`}
      </h2>

      <div className="board">
        {board.map((value, index) => (
          <button
            className={`square ${value}`}
            key={index}
            onClick={() => handleClick(index)}
          >
            {value}
          </button>
        ))}
      </div>

      <button className="restart" onClick={restartGame}>
        🔄 Restart Game
      </button>

      {showDifficultyModal && (
        <div className="difficulty-backdrop" role="presentation">
          <div
            className="difficulty-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="difficulty-title"
          >
            <h2 id="difficulty-title">Choose your difficulty</h2>
            <p>How challenging should your AI opponent be?</p>

            <div className="difficulty-options">
              <button onClick={() => startAiGame("easy")}>
                <span>🟢</span>
                <strong>Easy</strong>
                <small>Mostly random moves</small>
              </button>
              <button onClick={() => startAiGame("medium")}>
                <span>🟡</span>
                <strong>Medium</strong>
                <small>Smart, with occasional mistakes</small>
              </button>
              <button onClick={() => startAiGame("hard")}>
                <span>🔴</span>
                <strong>Hard</strong>
                <small>Unbeatable minimax strategy</small>
              </button>
            </div>

            <button
              className="cancel-difficulty"
              onClick={() => setShowDifficultyModal(false)}
            >
              Back / Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;