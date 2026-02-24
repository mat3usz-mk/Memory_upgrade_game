const GRID_SIZE = 8;
const BASE_OBJECTS = ["LINE", "NUM", "WORD", "SHAPE", "SYM"];
const COLORS = ["#111827", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7"];
const AVAILABLE_NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const targetCanvas = document.getElementById("targetCanvas");
const playerCanvas = document.getElementById("playerCanvas");
const levelEl = document.getElementById("level");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");
const surrenderBtn = document.getElementById("surrenderBtn");
const eraseBtn = document.getElementById("eraseBtn");
const levelSelect = document.getElementById("levelSelect");
const typeChips = document.getElementById("typeChips");
const colorChips = document.getElementById("colorChips");
const numberChips = document.getElementById("numberChips");

const tCtx = targetCanvas.getContext("2d");
const pCtx = playerCanvas.getContext("2d");

let level = 1;
let maxUnlockedLevel = 1;
let targetBoard = createEmptyBoard();
let playerBoard = createEmptyBoard();
let selectedType = BASE_OBJECTS[0];
let selectedColor = COLORS[0];
let selectedNumber = "7";
let showingPattern = false;
let phaseTimer = null;

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

function clearPhaseTimer() {
  if (phaseTimer) {
    clearInterval(phaseTimer);
    phaseTimer = null;
  }
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
  if (level <= 1) return ["LINE", "NUM"];
  if (level <= 3) return ["LINE", "NUM", "SHAPE"];
  if (level <= 5) return ["LINE", "NUM", "SHAPE", "WORD"];
  return BASE_OBJECTS;
}

function activeColorsForLevel() {
  if (level <= 3) return [COLORS[0]];
  if (level <= 5) return COLORS.slice(0, 2);
  if (level <= 8) return COLORS.slice(0, 4);
  return COLORS;
}

function objectsCountForLevel() {
  return Math.min(3 + (level - 1), Math.floor((GRID_SIZE * GRID_SIZE) / 2));
}

function updateLevelSelector() {
  levelSelect.innerHTML = "";
  for (let i = 1; i <= maxUnlockedLevel; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Poziom ${i}`;
    levelSelect.appendChild(option);
  }
  levelSelect.value = String(level);
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
  renderChips(numberChips, AVAILABLE_NUMBERS, selectedNumber, (v) => {
    selectedNumber = v;
    setupControlState();
  });
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePattern() {
  const objects = activeObjectsForLevel();
  const colors = activeColorsForLevel();
  const count = objectsCountForLevel();
  targetBoard = createEmptyBoard();

  let placed = 0;
  while (placed < count) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    if (targetBoard[r][c]) continue;
    const type = randomChoice(objects);
    targetBoard[r][c] = {
      type,
      color: randomChoice(colors),
      value: type === "NUM" ? randomChoice(AVAILABLE_NUMBERS) : null,
    };
    placed += 1;
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
      ctx.fillText(obj.value ?? "0", centerX - 8, centerY + 8);
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

function beginReconstructionPhase() {
  showingPattern = false;
  renderBoard(tCtx, targetBoard, false);
  messageEl.textContent = "Odtwórz obraz na swojej planszy, potem zatwierdź.";
  submitBtn.disabled = false;
  surrenderBtn.disabled = false;
}

function startRound() {
  clearPhaseTimer();
  playerBoard = createEmptyBoard();
  generatePattern();
  showingPattern = true;
  submitBtn.disabled = true;
  surrenderBtn.disabled = true;
  messageEl.textContent = `Zapamiętaj układ (${objectsCountForLevel()} obiektów)!`;

  const previewSeconds = Math.max(2, 7 - Math.floor(level / 3));
  let timeLeft = previewSeconds;
  timerEl.textContent = String(timeLeft);

  renderBoard(tCtx, targetBoard, true);
  renderBoard(pCtx, playerBoard, true);

  phaseTimer = setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = String(Math.max(0, timeLeft));
    if (timeLeft <= 0) {
      clearPhaseTimer();
      beginReconstructionPhase();
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
      if (
        t &&
        p &&
        t.type === p.type &&
        t.color === p.color &&
        (t.type !== "NUM" || t.value === p.value)
      ) {
        matched += 1;
      }
    }
  }

  const score = total === 0 ? 100 : Math.round((matched / total) * 100);
  scoreEl.textContent = `${score}%`;
  submitBtn.disabled = true;
  surrenderBtn.disabled = true;

  if (score >= 90) {
    maxUnlockedLevel = Math.max(maxUnlockedLevel, level + 1);
    level += 1;
    levelEl.textContent = String(level);
    updateLevelSelector();
    messageEl.textContent = `Świetnie! ${score}% zgodności. Odblokowano poziom ${maxUnlockedLevel}.`;
    setupControlState();
  } else {
    messageEl.textContent = `Wynik: ${score}%. Potrzebujesz 90%, spróbuj ponownie na tym samym poziomie.`;
  }
}

function surrenderRound() {
  clearPhaseTimer();
  showingPattern = true;
  submitBtn.disabled = true;
  surrenderBtn.disabled = true;
  renderBoard(tCtx, targetBoard, true);

  let revealLeft = 7;
  timerEl.textContent = String(revealLeft);
  messageEl.textContent = `Poddanie: poprawna tablica widoczna jeszcze ${revealLeft}s.`;

  phaseTimer = setInterval(() => {
    revealLeft -= 1;
    timerEl.textContent = String(Math.max(0, revealLeft));
    if (revealLeft > 0) {
      messageEl.textContent = `Poddanie: poprawna tablica widoczna jeszcze ${revealLeft}s.`;
      return;
    }

    clearPhaseTimer();
    let restartLeft = 3;
    timerEl.textContent = String(restartLeft);
    messageEl.textContent = `Nowa runda za ${restartLeft}s...`;

    phaseTimer = setInterval(() => {
      restartLeft -= 1;
      timerEl.textContent = String(Math.max(0, restartLeft));
      if (restartLeft <= 0) {
        clearPhaseTimer();
        startRound();
      } else {
        messageEl.textContent = `Nowa runda za ${restartLeft}s...`;
      }
    }, 1000);
  }, 1000);
}

playerCanvas.addEventListener("click", (ev) => {
  if (showingPattern) return;
  const { row, col } = boardCellFromClick(ev, playerCanvas);
  playerBoard[row][col] = {
    type: selectedType,
    color: selectedColor,
    value: selectedType === "NUM" ? selectedNumber : null,
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
surrenderBtn.addEventListener("click", surrenderRound);
levelSelect.addEventListener("change", () => {
  clearPhaseTimer();
  level = Number(levelSelect.value);
  levelEl.textContent = String(level);
  setupControlState();
  targetBoard = createEmptyBoard();
  playerBoard = createEmptyBoard();
  renderBoard(tCtx, targetBoard, false);
  renderBoard(pCtx, playerBoard, true);
  submitBtn.disabled = true;
  surrenderBtn.disabled = true;
  timerEl.textContent = "0";
  messageEl.textContent = `Wybrano poziom ${level}. Naciśnij Start rundy.`;
});

updateLevelSelector();
setupControlState();
renderBoard(tCtx, targetBoard, false);
renderBoard(pCtx, playerBoard, true);
