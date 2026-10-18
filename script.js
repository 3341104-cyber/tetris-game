const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const startBtn = document.getElementById('start-btn');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const EMPTY = 0;

const COLORS = {
  I: '#38bdf8',
  O: '#facc15',
  T: '#c084fc',
  S: '#4ade80',
  Z: '#f87171',
  J: '#60a5fa',
  L: '#fb923c',
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

let board = createBoard();
let currentPiece = null;
let dropInterval = 700;
let lastTime = 0;
let dropTimer = 0;
let score = 0;
let linesCleared = 0;
let gameRunning = false;
let animationId = null;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  const matrix = SHAPES[type].map((row) => [...row]);

  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: 0,
  };
}

function resetGame() {
  board = createBoard();
  score = 0;
  linesCleared = 0;
  scoreEl.textContent = score;
  linesEl.textContent = linesCleared;
  currentPiece = randomPiece();
  dropTimer = 0;
}

function collides(piece, offsetX = 0, offsetY = 0, testMatrix = piece.matrix) {
  for (let y = 0; y < testMatrix.length; y += 1) {
    for (let x = 0; x < testMatrix[y].length; x += 1) {
      if (!testMatrix[y][x]) continue;

      const nextX = piece.x + x + offsetX;
      const nextY = piece.y + y + offsetY;

      if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
        return true;
      }

      if (nextY >= 0 && board[nextY][nextX]) {
        return true;
      }
    }
  }

  return false;
}

function mergePiece() {
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const boardY = currentPiece.y + y;
      const boardX = currentPiece.x + x;
      if (boardY >= 0) {
        board[boardY][boardX] = currentPiece.type;
      }
    });
  });
}

function clearLines() {
  let rowsRemoved = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell !== EMPTY)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(EMPTY));
      rowsRemoved += 1;
      y += 1;
    }
  }

  if (rowsRemoved > 0) {
    linesCleared += rowsRemoved;
    score += [0, 100, 300, 500, 800][rowsRemoved] || 0;
    linesEl.textContent = linesCleared;
    scoreEl.textContent = score;
  }
}

function spawnNextPiece() {
  currentPiece = randomPiece();
  if (collides(currentPiece)) {
    endGame();
  }
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animationId);
  startBtn.textContent = 'התחל מחדש';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '18px Arial';
  ctx.fillText('ניקוד: ' + score, canvas.width / 2, canvas.height / 2 + 30);
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function rotatePiece() {
  if (!currentPiece || !gameRunning) return;

  const rotated = rotateMatrix(currentPiece.matrix);
  const kickOffsets = [0, -1, 1, -2, 2];

  for (const offset of kickOffsets) {
    const testPiece = { ...currentPiece, x: currentPiece.x + offset, matrix: rotated };
    if (!collides(testPiece, 0, 0, rotated)) {
      currentPiece.matrix = rotated;
      currentPiece.x += offset;
      return;
    }
  }
}

function movePiece(dir) {
  if (!currentPiece || !gameRunning) return;
  if (!collides(currentPiece, dir, 0)) {
    currentPiece.x += dir;
  }
}

function dropPiece() {
  if (!currentPiece || !gameRunning) return;

  if (!collides(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    return;
  }

  mergePiece();
  clearLines();
  spawnNextPiece();
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell !== EMPTY) {
        drawCell(x, y, COLORS[cell]);
      }
    }
  }

  if (currentPiece) {
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const drawX = currentPiece.x + x;
        const drawY = currentPiece.y + y;
        if (drawY >= 0) {
          drawCell(drawX, drawY, COLORS[currentPiece.type]);
        }
      });
    });
  }
}

function update(time = 0) {
  if (!gameRunning) return;

  const delta = time - lastTime;
  lastTime = time;
  dropTimer += delta;

  if (dropTimer >= dropInterval) {
    dropPiece();
    dropTimer = 0;
  }

  drawBoard();
  animationId = requestAnimationFrame(update);
}

function startGame() {
  resetGame();
  gameRunning = true;
  startBtn.textContent = 'התחל מחדש';
  lastTime = 0;
  dropTimer = 0;
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(update);
}

window.addEventListener('keydown', (event) => {
  if (!gameRunning) return;

  if (event.key === 'ArrowLeft') {
    movePiece(-1);
  } else if (event.key === 'ArrowRight') {
    movePiece(1);
  } else if (event.key === 'ArrowDown') {
    dropPiece();
  } else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'x') {
    rotatePiece();
  } else if (event.key === ' ') {
    event.preventDefault();
    while (!collides(currentPiece, 0, 1)) {
      currentPiece.y += 1;
      score += 2;
      scoreEl.textContent = score;
    }
    dropPiece();
  }
  drawBoard();
});

startBtn.addEventListener('click', startGame);

resetGame();
drawBoard();
