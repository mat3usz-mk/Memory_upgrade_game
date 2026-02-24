const GRID_SIZE = 8;
const BASE_OBJECTS = ["LINE", "NUM", "WORD", "SHAPE", "SYM"];
const COLORS = ["#111827", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7"];

const targetCanvas = document.getElementById("targetCanvas");
const playerCanvas = document.getElementById("playerCanvas");
const levelEl = document.getElementById("level");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");
const eraseBtn = document.getElementById("eraseBtn");
const typeChips = document.getElementById("typeChips");
const colorChips = document.getElementById("colorChips");

const tCtx = targetCanvas.getContext("2d");
const pCtx = playerCanvas.getContext("2d");

let level = 1;
let targetBoard = createEmptyBoard();
let playerBoard = createEmptyBoard();
let selectedType = BASE_OBJECTS[0];
let selectedColor = COLORS[0];
let showingPattern = false;

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

function renderChips(container, values, selected, onPick) {
  container.innerHTML = "";
  values.forEach((value) => {
    const chip = document.createElement("button");
    chip.className = `chip ${selected === value ? "active" : ""}`;
    chip.textContent = value;
    if (value.startsWith("#")) {
      chip.style.background = value;
      chip.style.color = "#fff";
    }
    chip.addEventListener("click", () => onPick(value));
    container.appendChild(chip);
  });
}

function activeObjectsForLevel() {
  return BASE_OBJECTS.slice(0, Math.min(BASE_OBJECTS.length, 2 + Math.floor(level / 2)));
}

function activeColorsForLevel() {
  if (level < 4) return [COLORS[0]];
  return COLORS.slice(0, Math.min(COLORS.length, 1 + Math.floor(level / 2)));
}

function setupControlState() {
  const objs = activeObjectsForLevel();
  const cols = activeColorsForLevel();
  if (!objs.includes(selectedType)) selectedType = objs[0];
  if (!cols.includes(selectedColor)) selectedColor = cols[0];

  renderChips(typeChips, objs, selectedType, (v) => {
    selectedType = v;
    setupControlState();
  });
  renderChips(colorChips, cols, selectedColor, (v) => {
    selectedColor = v;
    setupControlState();
  });
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePattern() {
  const objects = activeObjectsForLevel();
  const colors = activeColorsForLevel();
  const count = Math.min(8 + level * 2, GRID_SIZE * GRID_SIZE / 2);
  targetBoard = createEmptyBoard();

  for (let i = 0; i < count; i += 1) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    targetBoard[r][c] = {
      type: randomChoice(objects),
      color: randomChoice(colors),
    };
  }
}

function drawGrid(ctx) {
  const cell = targetCanvas.width / GRID_SIZE;
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, targetCanvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(targetCanvas.width, i * cell);
    ctx.stroke();
  }
}

function drawObject(ctx, row, col, obj) {
  if (!obj) return;
  const cell = targetCanvas.width / GRID_SIZE;
  const x = col * cell;
  const y = row * cell;
  const centerX = x + cell / 2;
  const centerY = y + cell / 2;

  ctx.fillStyle = obj.color;
  ctx.strokeStyle = obj.color;
  ctx.lineWidth = 3;

  switch (obj.type) {
    case "LINE":
      ctx.beginPath();
      ctx.moveTo(x + 8, y + cell - 8);
      ctx.lineTo(x + cell - 8, y + 8);
      ctx.stroke();
      break;
    case "NUM":
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(String((row + col) % 10), centerX - 8, centerY + 8);
      break;
    case "WORD":
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("MEM", x + 8, centerY + 4);
      break;
    case "SHAPE":
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "SYM":
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("★", centerX - 11, centerY + 9);
      break;
    default:
      break;
  }
}

function renderBoard(ctx, board, reveal = true) {
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  if (reveal) {
    board.forEach((row, r) => row.forEach((cell, c) => drawObject(ctx, r, c, cell)));
  }
  drawGrid(ctx);
}

function startRound() {
  playerBoard = createEmptyBoard();
  generatePattern();
  showingPattern = true;
  submitBtn.disabled = true;
  messageEl.textContent = "Zapamiętaj układ!";

  const previewSeconds = Math.max(2, 6 - Math.floor(level / 2));
  let timeLeft = previewSeconds;
  timerEl.textContent = String(timeLeft);

  renderBoard(tCtx, targetBoard, true);
  renderBoard(pCtx, playerBoard, true);

  const interval = setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = String(Math.max(0, timeLeft));
    if (timeLeft <= 0) {
      clearInterval(interval);
      showingPattern = false;
      renderBoard(tCtx, targetBoard, false);
      messageEl.textContent = "Odtwórz obraz na swojej planszy, potem zatwierdź.";
      submitBtn.disabled = false;
    }
  }, 1000);
}

function boardCellFromClick(ev, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
  const cell = canvas.width / GRID_SIZE;
  return {
    col: Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(x / cell))),
    row: Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(y / cell))),
  };
}

function compareBoards() {
  let total = 0;
  let matched = 0;

  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      const t = targetBoard[r][c];
      const p = playerBoard[r][c];
      if (t || p) total += 1;
      if (t && p && t.type === p.type && t.color === p.color) matched += 1;
    }
  }

  const score = total === 0 ? 100 : Math.round((matched / total) * 100);
  scoreEl.textContent = `${score}%`;

  if (score >= 90) {
    level += 1;
    levelEl.textContent = String(level);
    messageEl.textContent = `Świetnie! ${score}% zgodności. Awans na poziom ${level}.`;
    setupControlState();
  } else {
    messageEl.textContent = `Wynik: ${score}%. Potrzebujesz 90%, spróbuj ponownie na tym samym poziomie.`;
  }
}

playerCanvas.addEventListener("click", (ev) => {
  if (showingPattern) return;
  const { row, col } = boardCellFromClick(ev, playerCanvas);
  playerBoard[row][col] = {
    type: selectedType,
    color: selectedColor,
  };
  renderBoard(pCtx, playerBoard, true);
});

eraseBtn.addEventListener("click", () => {
  messageEl.textContent = "Tryb gumki: kliknij pole na swojej planszy, aby usunąć obiekt.";
  const onClick = (ev) => {
    const { row, col } = boardCellFromClick(ev, playerCanvas);
    playerBoard[row][col] = null;
    renderBoard(pCtx, playerBoard, true);
    messageEl.textContent = "Obiekt usunięty.";
    playerCanvas.removeEventListener("click", onClick);
  };
  playerCanvas.addEventListener("click", onClick);
});

startBtn.addEventListener("click", startRound);
submitBtn.addEventListener("click", compareBoards);

setupControlState();
renderBoard(tCtx, targetBoard, false);
renderBoard(pCtx, playerBoard, true);
