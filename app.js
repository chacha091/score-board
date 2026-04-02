const QUESTION_COUNT = 100;
const CHOICES = [1, 2, 3, 4, 5];
const TIMER_SECONDS = 15 * 60;
const STORAGE_KEY = "skct-board-state-v1";
const AREA_GROUPS = [
  { name: "언어이해", start: 1, end: 20 },
  { name: "자료해석", start: 21, end: 40 },
  { name: "창의수리", start: 41, end: 60 },
  { name: "언어추리", start: 61, end: 80 },
  { name: "수열추리", start: 81, end: 100 },
];

const state = {
  mode: "solve",
  roundName: "",
  userAnswers: {},
  answerKey: [],
  result: null,
  wrongOnlyFilter: false,
  timer: {
    remaining: TIMER_SECONDS,
    running: false,
    intervalId: null,
  },
  calculator: {
    expression: "",
    display: "0",
  },
};

const elements = {
  workspace: document.querySelector("#workspace"),
  answerGrid: document.querySelector("#answerGrid"),
  answeredCount: document.querySelector("#answeredCount"),
  footerAnsweredCount: document.querySelector("#footerAnsweredCount"),
  gradingPanel: document.querySelector("#gradingPanel"),
  roundNameInput: document.querySelector("#roundNameInput"),
  answerKeyInput: document.querySelector("#answerKeyInput"),
  inputError: document.querySelector("#inputError"),
  resultPanel: document.querySelector("#resultPanel"),
  solveModeButton: document.querySelector("#solveModeButton"),
  resultModeButton: document.querySelector("#resultModeButton"),
  totalValue: document.querySelector("#totalValue"),
  correctValue: document.querySelector("#correctValue"),
  wrongValue: document.querySelector("#wrongValue"),
  scoreValue: document.querySelector("#scoreValue"),
  solvedValue: document.querySelector("#solvedValue"),
  accuracyValue: document.querySelector("#accuracyValue"),
  resultSummary: document.querySelector("#resultSummary"),
  roundNameDisplay: document.querySelector("#roundNameDisplay"),
  wrongList: document.querySelector("#wrongList"),
  comparisonGrid: document.querySelector("#comparisonGrid"),
  areaSummaryList: document.querySelector("#areaSummaryList"),
  timerMinutes: document.querySelector("#timerMinutes"),
  timerSeconds: document.querySelector("#timerSeconds"),
  memoTabButton: document.querySelector("#memoTabButton"),
  drawTabButton: document.querySelector("#drawTabButton"),
  memoPanel: document.querySelector("#memoPanel"),
  drawPanel: document.querySelector("#drawPanel"),
  memoInput: document.querySelector("#memoInput"),
  drawCanvas: document.querySelector("#drawCanvas"),
  calculatorDisplay: document.querySelector("#calculatorDisplay"),
  calculatorKeys: document.querySelector("#calculatorKeys"),
};

function createAnswerSheet() {
  const fragment = document.createDocumentFragment();

  for (let question = 1; question <= QUESTION_COUNT; question += 1) {
    const row = document.createElement("div");
    row.className = "answer-row";
    row.dataset.question = String(question);

    const index = document.createElement("div");
    index.className = "question-index";
    index.textContent = question;
    row.appendChild(index);

    CHOICES.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.dataset.question = String(question);
      button.dataset.choice = String(choice);
      button.textContent = choice;
      row.appendChild(button);
    });

    fragment.appendChild(row);
  }

  elements.answerGrid.appendChild(fragment);
}

function renderAnswerSelection() {
  document.querySelectorAll(".choice-button").forEach((button) => {
    const question = Number(button.dataset.question);
    const choice = Number(button.dataset.choice);
    button.classList.toggle("selected", state.userAnswers[question] === choice);
  });

  const answered = Object.keys(state.userAnswers).length;
  elements.answeredCount.textContent = String(answered);
  elements.footerAnsweredCount.textContent = String(answered);
  saveState();
}

function showGradingPanel(visible) {
  elements.gradingPanel.classList.toggle("hidden", !visible);
  saveState();
}

function setMode(mode) {
  state.mode = mode;
  const solveLayout = mode === "solve";
  elements.workspace.classList.toggle("solve-layout", solveLayout);
  elements.workspace.classList.toggle("result-layout", !solveLayout);
  elements.resultPanel.classList.toggle("hidden", solveLayout);
  elements.solveModeButton.classList.toggle("active", solveLayout);
  elements.resultModeButton.classList.toggle("active", !solveLayout);
  saveState();
}

function parseAnswerKey(value) {
  const tokens = value
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((item) => Number(item));

  if (tokens.length === 0) {
    throw new Error("정답을 1개 이상 입력해야 채점할 수 있습니다.");
  }

  if (tokens.length > QUESTION_COUNT) {
    throw new Error(`정답은 최대 ${QUESTION_COUNT}개까지만 입력할 수 있습니다. 현재 ${tokens.length}개입니다.`);
  }

  if (tokens.some((item) => Number.isNaN(item) || item < 1 || item > 5)) {
    throw new Error("정답 값은 1부터 5 사이 숫자만 허용됩니다.");
  }

  return tokens;
}

function gradeExam() {
  try {
    const answerKey = parseAnswerKey(elements.answerKeyInput.value);
    state.roundName = elements.roundNameInput.value.trim();
    state.answerKey = answerKey;
    elements.inputError.textContent = "";

    let correct = 0;
    const wrongList = [];
    const comparison = [];

    const gradingCount = answerKey.length;

    for (let index = 0; index < gradingCount; index += 1) {
      const question = index + 1;
      const userAnswer = state.userAnswers[question] ?? null;
      const correctAnswer = answerKey[index];
      const isCorrect = userAnswer === correctAnswer;

      if (isCorrect) {
        correct += 1;
      } else {
        wrongList.push(question);
      }

      comparison.push({
        question,
        userAnswer,
        correctAnswer,
        isCorrect,
      });
    }

    const wrong = gradingCount - correct;
    const accuracy = Math.round((correct / gradingCount) * 100);
    const solved = comparison.filter((item) => item.userAnswer !== null).length;
    const areaSummaries = AREA_GROUPS.map((area) => {
      const areaQuestions = comparison.filter(
        (item) => item.question >= area.start && item.question <= area.end,
      );
      const solvedCount = areaQuestions.filter((item) => item.userAnswer !== null).length;
      const correctCount = areaQuestions.filter((item) => item.isCorrect).length;
      const wrongNumbers = areaQuestions.filter((item) => !item.isCorrect).map((item) => item.question);
      const areaTotal = areaQuestions.length;
      const areaAccuracy = areaTotal > 0 ? Math.round((correctCount / areaTotal) * 100) : 0;

      return {
        ...area,
        total: areaTotal,
        solved: solvedCount,
        correct: correctCount,
        wrongNumbers,
        score: correctCount,
        accuracy: areaAccuracy,
      };
    });

    state.result = {
      total: gradingCount,
      solved,
      correct,
      wrong,
      accuracy,
      wrongList,
      comparison,
      score: correct,
      areaSummaries,
      roundName: state.roundName,
    };

    renderResult();
    setMode("result");
    saveState();
  } catch (error) {
    elements.inputError.textContent = error.message;
  }
}

function renderResult() {
  if (!state.result) {
    return;
  }

  const { solved, correct, wrong, accuracy, wrongList, comparison, score, areaSummaries, roundName } =
    state.result;

  elements.scoreValue.textContent = String(score);
  elements.solvedValue.textContent = String(solved);
  elements.correctValue.textContent = String(correct);
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.resultSummary.textContent = `${solved}문항 풀이, ${correct}문항 정답, ${wrong}문항 오답`;
  elements.roundNameDisplay.textContent = roundName || "회차명 미입력";

  renderAreaSummaries(areaSummaries);

  elements.wrongList.innerHTML = "";
  if (wrongList.length === 0) {
    const perfect = document.createElement("p");
    perfect.className = "empty-state";
    perfect.textContent = "전 문항 정답입니다.";
    elements.wrongList.appendChild(perfect);
  } else {
    wrongList.forEach((question) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "wrong-chip";
      chip.textContent = `${question}번`;
      chip.addEventListener("click", () => {
        setMode("solve");
        const row = document.querySelector(`.answer-row[data-question="${question}"]`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      elements.wrongList.appendChild(chip);
    });
  }

  renderComparisonGrid(comparison);
  saveState();
}

function renderAreaSummaries(areaSummaries) {
  elements.areaSummaryList.innerHTML = "";

  const fragment = document.createDocumentFragment();

  areaSummaries.forEach((area) => {
    const card = document.createElement("article");
    card.className = "area-summary-card";

    const top = document.createElement("div");
    top.className = "area-summary-top";

    const title = document.createElement("h4");
    title.textContent = `${area.name} (${area.start}~${area.end})`;
    top.appendChild(title);

    const accuracy = document.createElement("p");
    accuracy.textContent = `정답률 ${area.accuracy}%`;
    top.appendChild(accuracy);

    card.appendChild(top);

    const meta = document.createElement("div");
    meta.className = "area-summary-meta";
    meta.innerHTML = `
      <span>문제 수 ${area.total}</span>
      <span>푼 문제 ${area.solved}</span>
      <span>맞은 문제 ${area.correct}</span>
      <span>총점 ${area.score}</span>
    `;
    card.appendChild(meta);

    const wrong = document.createElement("p");
    wrong.className = "area-summary-wrong";
    wrong.textContent =
      area.wrongNumbers.length > 0
        ? `틀린 문제 번호: ${area.wrongNumbers.join(", ")}`
        : "틀린 문제 번호: 없음";
    card.appendChild(wrong);

    fragment.appendChild(card);
  });

  elements.areaSummaryList.appendChild(fragment);
}

function renderComparisonGrid(comparison) {
  elements.comparisonGrid.innerHTML = "";
  const retryWrongButton = document.querySelector("#retryWrongButton");

  const filtered = state.wrongOnlyFilter ? comparison.filter((item) => !item.isCorrect) : comparison;
  retryWrongButton.textContent = state.wrongOnlyFilter ? "전체 문항 보기" : "오답만 다시 보기";

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "표시할 문항이 없습니다.";
    elements.comparisonGrid.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = `comparison-card ${item.isCorrect ? "correct" : "wrong"}`;

    const title = document.createElement("h4");
    title.textContent = `${item.question}번`;
    card.appendChild(title);

    const myAnswer = document.createElement("p");
    myAnswer.textContent = `내 답: ${item.userAnswer ?? "-"}`;
    card.appendChild(myAnswer);

    const correctAnswer = document.createElement("p");
    correctAnswer.textContent = `정답: ${item.correctAnswer}`;
    card.appendChild(correctAnswer);

    const status = document.createElement("p");
    status.textContent = item.isCorrect ? "정답" : "오답";
    card.appendChild(status);

    fragment.appendChild(card);
  });

  elements.comparisonGrid.appendChild(fragment);
}

function resetAnswers() {
  state.roundName = "";
  state.userAnswers = {};
  state.result = null;
  state.wrongOnlyFilter = false;
  showGradingPanel(false);
  elements.inputError.textContent = "";
  elements.roundNameInput.value = "";
  elements.roundNameDisplay.textContent = "회차명 미입력";
  renderAnswerSelection();
  elements.resultPanel.classList.add("hidden");
  elements.resultModeButton.classList.remove("active");
  elements.solveModeButton.classList.add("active");
  setMode("solve");
  saveState();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  elements.timerMinutes.textContent = String(minutes).padStart(2, "0");
  elements.timerSeconds.textContent = String(remainSeconds).padStart(2, "0");
}

function stopTimer() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  state.timer.running = false;
}

function startTimer() {
  if (state.timer.running) {
    return;
  }

  state.timer.running = true;
  state.timer.intervalId = window.setInterval(() => {
    if (state.timer.remaining <= 0) {
      stopTimer();
      window.alert("15분 타이머가 종료되었습니다.");
      return;
    }

    state.timer.remaining -= 1;
    formatTime(state.timer.remaining);
  }, 1000);
}

function resetTimer() {
  stopTimer();
  state.timer.remaining = TIMER_SECONDS;
  formatTime(state.timer.remaining);
  saveState();
}

function saveState() {
  try {
    const payload = {
      mode: state.mode,
      roundName: state.roundName,
      userAnswers: state.userAnswers,
      answerKey: state.answerKey,
      answerKeyInput: elements.answerKeyInput.value,
      memoInput: elements.memoInput.value,
      gradingPanelOpen: !elements.gradingPanel.classList.contains("hidden"),
      wrongOnlyFilter: state.wrongOnlyFilter,
      result: state.result,
      timerRemaining: state.timer.remaining,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function hydrateState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const saved = JSON.parse(raw);
    state.mode = saved.mode ?? "solve";
    state.roundName = saved.roundName ?? "";
    state.userAnswers = saved.userAnswers ?? {};
    state.answerKey = saved.answerKey ?? [];
    state.wrongOnlyFilter = Boolean(saved.wrongOnlyFilter);
    state.result = saved.result ?? null;
    state.timer.remaining =
      typeof saved.timerRemaining === "number" ? saved.timerRemaining : TIMER_SECONDS;

    elements.roundNameInput.value = saved.roundName ?? "";
    elements.answerKeyInput.value = saved.answerKeyInput ?? "";
    elements.memoInput.value = saved.memoInput ?? "";
    elements.roundNameDisplay.textContent = saved.roundName || "회차명 미입력";
    showGradingPanel(Boolean(saved.gradingPanelOpen));
  } catch {
    // Ignore invalid persisted state.
  }
}

function setupTabs() {
  function activateTab(tab) {
    const memoActive = tab === "memo";
    elements.memoTabButton.classList.toggle("active", memoActive);
    elements.drawTabButton.classList.toggle("active", !memoActive);
    elements.memoPanel.classList.toggle("active", memoActive);
    elements.drawPanel.classList.toggle("active", !memoActive);
  }

  elements.memoTabButton.addEventListener("click", () => activateTab("memo"));
  elements.drawTabButton.addEventListener("click", () => activateTab("draw"));
}

function setupCanvas() {
  const canvas = elements.drawCanvas;
  const context = canvas.getContext("2d");
  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  context.lineWidth = 2.5;
  context.lineCap = "round";
  context.strokeStyle = "#1f2f46";

  function getPosition(event) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function drawLine(event) {
    if (!drawing) {
      return;
    }

    const position = getPosition(event);
    context.beginPath();
    context.moveTo(lastX, lastY);
    context.lineTo(position.x, position.y);
    context.stroke();
    lastX = position.x;
    lastY = position.y;
  }

  function startDrawing(event) {
    drawing = true;
    const position = getPosition(event);
    lastX = position.x;
    lastY = position.y;
  }

  function endDrawing() {
    drawing = false;
  }

  ["mousedown", "touchstart"].forEach((name) =>
    canvas.addEventListener(name, (event) => {
      event.preventDefault();
      startDrawing(event);
    }),
  );
  ["mousemove", "touchmove"].forEach((name) =>
    canvas.addEventListener(name, (event) => {
      event.preventDefault();
      drawLine(event);
    }),
  );
  ["mouseup", "mouseleave", "touchend"].forEach((name) => canvas.addEventListener(name, endDrawing));

  document.querySelector("#clearCanvasButton").addEventListener("click", () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function setupCalculator() {
  const keys = [
    { label: "(", type: "value" },
    { label: ")", type: "value" },
    { label: "%", type: "operator" },
    { label: "C", type: "clear-entry" },
    { label: "AC", type: "all-clear" },
    { label: "+/-", type: "negate" },
    { label: "÷", value: "/", type: "operator" },
    { label: "×", value: "*", type: "operator" },
    { label: "7", type: "value" },
    { label: "8", type: "value" },
    { label: "9", type: "value" },
    { label: "-", type: "operator" },
    { label: "4", type: "value" },
    { label: "5", type: "value" },
    { label: "6", type: "value" },
    { label: "+", type: "operator" },
    { label: "1", type: "value" },
    { label: "2", type: "value" },
    { label: "3", type: "value" },
    { label: "=", type: "equals" },
    { label: "0", type: "value", wide: true },
    { label: ".", type: "value" },
  ];

  const fragment = document.createDocumentFragment();

  keys.forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calc-key ${key.type === "operator" || key.type === "equals" ? "operator" : ""} ${key.wide ? "wide" : ""}`.trim();
    button.textContent = key.label;
    button.dataset.type = key.type;
    button.dataset.value = key.value ?? key.label;
    fragment.appendChild(button);
  });

  elements.calculatorKeys.appendChild(fragment);
  updateCalculatorDisplay();
}

function sanitizeExpression(expression) {
  return expression.replace(/[^0-9+\-*/().%]/g, "");
}

function updateCalculatorDisplay(value = state.calculator.display) {
  elements.calculatorDisplay.textContent = value;
}

function evaluateExpression() {
  try {
    const sanitized = sanitizeExpression(state.calculator.expression);
    if (!sanitized) {
      updateCalculatorDisplay("0");
      return;
    }

    const result = Function(`"use strict"; return (${sanitized})`)();
    const rendered = Number.isFinite(result) ? String(result) : "Error";
    state.calculator.expression = rendered === "Error" ? "" : rendered;
    state.calculator.display = rendered;
    updateCalculatorDisplay(rendered);
  } catch {
    state.calculator.expression = "";
    state.calculator.display = "Error";
    updateCalculatorDisplay("Error");
  }
}

function removeLastEntry() {
  state.calculator.expression = state.calculator.expression.slice(0, -1);
  state.calculator.display = state.calculator.expression || "0";
  updateCalculatorDisplay();
}

function toggleSign() {
  const expression = state.calculator.expression;
  if (!expression) {
    state.calculator.expression = "-";
    state.calculator.display = "-";
    updateCalculatorDisplay();
    return;
  }

  if (/^-/.test(expression)) {
    state.calculator.expression = expression.slice(1);
  } else {
    state.calculator.expression = `-${expression}`;
  }
  state.calculator.display = state.calculator.expression;
  updateCalculatorDisplay();
}

function handleCalculatorInput(event) {
  const button = event.target.closest(".calc-key");
  if (!button) {
    return;
  }

  const { type, value } = button.dataset;

  if (type === "all-clear") {
    state.calculator.expression = "";
    state.calculator.display = "0";
    updateCalculatorDisplay();
    return;
  }

  if (type === "clear-entry") {
    removeLastEntry();
    return;
  }

  if (type === "negate") {
    toggleSign();
    return;
  }

  if (type === "equals") {
    evaluateExpression();
    return;
  }

  state.calculator.expression += value;
  state.calculator.display = state.calculator.expression;
  updateCalculatorDisplay();
}

function bindEvents() {
  elements.answerGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".choice-button");
    if (!button) {
      return;
    }

    const question = Number(button.dataset.question);
    const choice = Number(button.dataset.choice);
    state.userAnswers[question] = choice;
    renderAnswerSelection();
  });

  document.querySelector("#openGradingButton").addEventListener("click", () => showGradingPanel(true));
  document.querySelector("#closeGradingButton").addEventListener("click", () => showGradingPanel(false));
  document.querySelector("#resetAnswersButton").addEventListener("click", resetAnswers);
  document.querySelector("#gradeExamButton").addEventListener("click", gradeExam);
  document.querySelector("#clearInputButton").addEventListener("click", () => {
    elements.answerKeyInput.value = "";
    elements.inputError.textContent = "";
    saveState();
  });
  document.querySelector("#backToSolveButton").addEventListener("click", () => setMode("solve"));
  document.querySelector("#retryWrongButton").addEventListener("click", () => {
    if (!state.result) {
      return;
    }
    state.wrongOnlyFilter = !state.wrongOnlyFilter;
    renderComparisonGrid(state.result.comparison);
    saveState();
  });

  elements.solveModeButton.addEventListener("click", () => setMode("solve"));
  elements.resultModeButton.addEventListener("click", () => {
    if (state.result) {
      setMode("result");
    }
  });

  document.querySelector("#startTimerButton").addEventListener("click", startTimer);
  document.querySelector("#pauseTimerButton").addEventListener("click", stopTimer);
  document.querySelector("#resetTimerButton").addEventListener("click", resetTimer);
  document.querySelector("#helpTimerButton").addEventListener("click", () => {
    window.alert("OMR 풀이 중 15분 집중 시간을 재는 타이머입니다.");
  });
  document.querySelector("#clearMemoButton").addEventListener("click", () => {
    elements.memoInput.value = "";
    saveState();
  });
  elements.roundNameInput.addEventListener("input", (event) => {
    state.roundName = event.target.value;
    saveState();
  });
  elements.answerKeyInput.addEventListener("input", saveState);
  elements.memoInput.addEventListener("input", saveState);

  elements.calculatorKeys.addEventListener("click", handleCalculatorInput);
}

function init() {
  createAnswerSheet();
  hydrateState();
  renderAnswerSelection();
  formatTime(state.timer.remaining);
  setupTabs();
  setupCanvas();
  setupCalculator();
  bindEvents();

  if (state.result) {
    renderResult();
  }

  if (state.mode === "result" && state.result) {
    setMode("result");
  } else {
    setMode("solve");
  }
}

init();
