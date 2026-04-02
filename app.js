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
  omrVisible: true,
  editingRoundId: null,
  roundName: "",
  userAnswers: {},
  answerKey: [],
  result: null,
  roundHistory: [],
  manualRounds: [],
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
  answerSheetPanel: document.querySelector(".answer-sheet-panel"),
  answeredCount: document.querySelector("#answeredCount"),
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
  manualRoundNameInput: document.querySelector("#manualRoundNameInput"),
  manualAreaForm: document.querySelector("#manualAreaForm"),
  manualRoundError: document.querySelector("#manualRoundError"),
  manualRoundList: document.querySelector("#manualRoundList"),
  manualRoundModal: document.querySelector("#manualRoundModal"),
  manualRoundModalTitle: document.querySelector("#manualRoundModalTitle"),
  saveManualRoundButton: document.querySelector("#saveManualRoundButton"),
  timerMinutes: document.querySelector("#timerMinutes"),
  timerSeconds: document.querySelector("#timerSeconds"),
  memoTabButton: document.querySelector("#memoTabButton"),
  drawTabButton: document.querySelector("#drawTabButton"),
  memoPanel: document.querySelector("#memoPanel"),
  drawPanel: document.querySelector("#drawPanel"),
  memoInput: document.querySelector("#memoInput"),
  drawCanvas: document.querySelector("#drawCanvas"),
  calculatorPanel: document.querySelector("#calculatorPanel"),
  calculatorDisplay: document.querySelector("#calculatorDisplay"),
  calculatorKeys: document.querySelector("#calculatorKeys"),
};

function createManualAreaForm() {
  const fragment = document.createDocumentFragment();

  AREA_GROUPS.forEach((area) => {
    const card = document.createElement("article");
    card.className = "manual-area-card";
    card.innerHTML = `
      <h4>${area.name}</h4>
      <p class="manual-area-range">${area.start}~${area.end}</p>
      <div class="manual-area-fields">
        <div>
          <label class="field-label" for="manual-solved-${area.start}">푼 문제</label>
          <input id="manual-solved-${area.start}" class="text-input" type="number" min="0" max="${area.end - area.start + 1}" data-area-start="${area.start}" data-field="solved" />
        </div>
        <div>
          <label class="field-label" for="manual-correct-${area.start}">맞은 문제</label>
          <input id="manual-correct-${area.start}" class="text-input" type="number" min="0" max="${area.end - area.start + 1}" data-area-start="${area.start}" data-field="correct" />
        </div>
        <div>
          <label class="field-label" for="manual-wrong-${area.start}">틀린 문제 번호</label>
          <input id="manual-wrong-${area.start}" class="text-input" type="text" placeholder="예: 2, 5, 7" data-area-start="${area.start}" data-field="wrongNumbers" />
        </div>
      </div>
    `;
    fragment.appendChild(card);
  });

  elements.manualAreaForm.appendChild(fragment);
}

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
  saveState();
}

function showGradingPanel(visible) {
  state.omrVisible = !visible;
  elements.gradingPanel.classList.toggle("hidden", !visible);
  elements.answerSheetPanel.classList.toggle("hidden", visible);
  elements.statusPanel.classList.toggle("hidden", visible);
  document.querySelector("#openGradingButton").textContent = visible ? "답안지 보기" : "채점하기";
  saveState();
}

function setMode(mode) {
  state.mode = mode;
  const solveLayout = mode === "solve";
  document.body.classList.toggle("solve-mode", solveLayout);
  document.body.classList.toggle("result-mode", !solveLayout);
  elements.workspace.classList.toggle("solve-layout", solveLayout);
  elements.workspace.classList.toggle("result-layout", !solveLayout);
  elements.resultPanel.classList.toggle("hidden", solveLayout);
  elements.solveModeButton.classList.toggle("active", solveLayout);
  elements.resultModeButton.classList.toggle("active", !solveLayout);
  if (solveLayout) {
    showGradingPanel(!state.omrVisible);
  }
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

    state.roundHistory.unshift({
      id: `${Date.now()}`,
      roundName: state.roundName || `채점 기록 ${state.roundHistory.length + 1}`,
      solved,
      correct,
      wrong,
      score: correct,
      accuracy,
      areaSummaries,
      source: "auto",
    });

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
      const detail = comparison.find((item) => item.question === question);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "wrong-chip";
      chip.textContent = `${question}번`;
      chip.title = `내 답 ${detail?.userAnswer ?? "-"} / 정답 ${detail?.correctAnswer ?? "-"}`;
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

function parseManualWrongNumbers(value, area) {
  if (!value.trim()) {
    return [];
  }

  const numbers = value
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((item) => Number(item));

  const hasInvalid = numbers.some(
    (item) => Number.isNaN(item) || item < area.start || item > area.end,
  );
  if (hasInvalid) {
    throw new Error(`${area.name} 틀린 문제 번호는 ${area.start}~${area.end} 범위만 입력할 수 있습니다.`);
  }

  return [...new Set(numbers)].sort((a, b) => a - b);
}

function clearManualRoundForm() {
  elements.manualRoundNameInput.value = "";
  elements.manualRoundError.textContent = "";
  elements.manualAreaForm.querySelectorAll("input").forEach((input) => {
    input.value = "";
  });
}

function setManualRoundModal(open) {
  elements.manualRoundModal.classList.toggle("hidden", !open);
}

function saveManualRound() {
  try {
    const roundName = elements.manualRoundNameInput.value.trim();
    if (!roundName) {
      throw new Error("수동 회차명은 비워둘 수 없습니다.");
    }

    const areaSummaries = AREA_GROUPS.map((area) => {
      const solvedInput = elements.manualAreaForm.querySelector(
        `input[data-area-start="${area.start}"][data-field="solved"]`,
      );
      const correctInput = elements.manualAreaForm.querySelector(
        `input[data-area-start="${area.start}"][data-field="correct"]`,
      );
      const wrongInput = elements.manualAreaForm.querySelector(
        `input[data-area-start="${area.start}"][data-field="wrongNumbers"]`,
      );

      const total = area.end - area.start + 1;
      const solved = solvedInput.value === "" ? 0 : Number(solvedInput.value);
      const correct = correctInput.value === "" ? 0 : Number(correctInput.value);
      const wrongNumbers = parseManualWrongNumbers(wrongInput.value, area);

      if (Number.isNaN(solved) || solved < 0 || solved > total) {
        throw new Error(`${area.name}의 푼 문제 수가 올바르지 않습니다.`);
      }
      if (Number.isNaN(correct) || correct < 0 || correct > solved) {
        throw new Error(`${area.name}의 맞은 문제 수는 푼 문제 수보다 클 수 없습니다.`);
      }

      return {
        ...area,
        total,
        solved,
        correct,
        wrongNumbers,
        score: correct,
        accuracy: solved > 0 ? Math.round((correct / solved) * 100) : 0,
      };
    });

    const solved = areaSummaries.reduce((sum, area) => sum + area.solved, 0);
    const correct = areaSummaries.reduce((sum, area) => sum + area.correct, 0);
    const wrong = areaSummaries.reduce((sum, area) => sum + area.wrongNumbers.length, 0);
    const score = correct;
    const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;

    const roundRecord = {
      id: `${Date.now()}`,
      roundName,
      solved,
      correct,
      wrong,
      score,
      accuracy,
      areaSummaries,
      source: "manual",
    };

    state.manualRounds.unshift(roundRecord);
    state.roundHistory.unshift(roundRecord);

    elements.manualRoundError.textContent = "";
    clearManualRoundForm();
    setManualRoundModal(false);
    renderManualRounds();
    saveState();
  } catch (error) {
    elements.manualRoundError.textContent = error.message;
  }
}

function renderManualRounds() {
  elements.manualRoundList.innerHTML = "";

  if (state.roundHistory.length === 0) {
    elements.manualRoundList.innerHTML = '<p class="history-empty">아직 저장된 회차가 없습니다.</p>';
    elements.manualRoundList.classList.add("empty-state");
    return;
  }

  elements.manualRoundList.classList.remove("empty-state");
  const rows = state.roundHistory
    .map((round) => {
      const summaryCells = round.areaSummaries
        .map((area) => `<td>${area.solved}</td><td>${area.correct}</td>`)
        .join("");
      const wrongCells = round.areaSummaries
        .map(
          (area) =>
            `<td colspan="2">${area.wrongNumbers.length ? area.wrongNumbers.join(" ") : ""}</td>`,
        )
        .join("");

      return `
        <tr>
          <td rowspan="2">${round.roundName}</td>
          ${summaryCells}
          <td rowspan="2">${round.score}</td>
          <td rowspan="2">${round.accuracy}%</td>
        </tr>
        <tr class="history-wrong-row">
          ${wrongCells}
        </tr>
      `;
    })
    .join("");

  elements.manualRoundList.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th rowspan="2">회차</th>
          <th colspan="2">언어이해 (1~20)</th>
          <th colspan="2">자료해석 (21~40)</th>
          <th colspan="2">창의수리 (41~60)</th>
          <th colspan="2">언어추리 (61~80)</th>
          <th colspan="2">수열추리 (81~100)</th>
          <th rowspan="2">총점</th>
          <th rowspan="2">정답률</th>
        </tr>
        <tr>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function populateManualRoundForm(round) {
  elements.manualRoundNameInput.value = round?.roundName ?? "";
  elements.manualRoundError.textContent = "";

  AREA_GROUPS.forEach((area) => {
    const current =
      round?.areaSummaries?.find((item) => item.start === area.start && item.end === area.end) ?? null;
    const solvedInput = elements.manualAreaForm.querySelector(
      `input[data-area-start="${area.start}"][data-field="solved"]`,
    );
    const correctInput = elements.manualAreaForm.querySelector(
      `input[data-area-start="${area.start}"][data-field="correct"]`,
    );
    const wrongInput = elements.manualAreaForm.querySelector(
      `input[data-area-start="${area.start}"][data-field="wrongNumbers"]`,
    );

    if (solvedInput) solvedInput.value = current?.solved ?? "";
    if (correctInput) correctInput.value = current?.correct ?? "";
    if (wrongInput) wrongInput.value = current?.wrongNumbers?.join(", ") ?? "";
  });
}

function openManualRoundModal(roundId = null) {
  state.editingRoundId = roundId;
  const targetRound = roundId ? state.roundHistory.find((round) => round.id === roundId) : null;
  populateManualRoundForm(targetRound ?? null);
  if (elements.manualRoundModalTitle) {
    elements.manualRoundModalTitle.textContent = roundId ? "회차 수정" : "수동 회차 추가";
  }
  if (elements.saveManualRoundButton) {
    elements.saveManualRoundButton.textContent = roundId ? "수정 저장" : "회차 저장";
  }
  setManualRoundModal(true);
}

function clearManualRoundForm() {
  state.editingRoundId = null;
  populateManualRoundForm(null);
  if (elements.manualRoundModalTitle) {
    elements.manualRoundModalTitle.textContent = "수동 회차 추가";
  }
  if (elements.saveManualRoundButton) {
    elements.saveManualRoundButton.textContent = "회차 저장";
  }
}

function setManualRoundModal(open) {
  elements.manualRoundModal.classList.toggle("hidden", !open);
  if (!open) {
    state.editingRoundId = null;
    if (elements.manualRoundModalTitle) {
      elements.manualRoundModalTitle.textContent = "수동 회차 추가";
    }
    if (elements.saveManualRoundButton) {
      elements.saveManualRoundButton.textContent = "회차 저장";
    }
  }
}

function buildManualRoundRecord(roundName, areaSummaries, existingRound = null) {
  const solved = areaSummaries.reduce((sum, area) => sum + area.solved, 0);
  const correct = areaSummaries.reduce((sum, area) => sum + area.correct, 0);
  const wrong = areaSummaries.reduce((sum, area) => sum + area.wrongNumbers.length, 0);
  const score = correct;
  const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;

  return {
    id: existingRound?.id ?? `${Date.now()}`,
    roundName,
    solved,
    correct,
    wrong,
    score,
    accuracy,
    areaSummaries,
    source: existingRound?.source ?? "manual",
  };
}

function saveManualRound() {
  try {
    const roundName = elements.manualRoundNameInput.value.trim();
    if (!roundName) {
      throw new Error("회차명은 비워둘 수 없습니다.");
    }

    const areaSummaries = AREA_GROUPS.map((area) => {
      const solvedInput = elements.manualAreaForm.querySelector(
        `input[data-area-start="${area.start}"][data-field="solved"]`,
      );
      const correctInput = elements.manualAreaForm.querySelector(
        `input[data-area-start="${area.start}"][data-field="correct"]`,
      );
      const wrongInput = elements.manualAreaForm.querySelector(
        `input[data-area-start="${area.start}"][data-field="wrongNumbers"]`,
      );

      const total = area.end - area.start + 1;
      const solved = solvedInput.value === "" ? 0 : Number(solvedInput.value);
      const correct = correctInput.value === "" ? 0 : Number(correctInput.value);
      const wrongNumbers = parseManualWrongNumbers(wrongInput.value, area);

      if (Number.isNaN(solved) || solved < 0 || solved > total) {
        throw new Error(`${area.name} 푼 문제 수가 올바르지 않습니다.`);
      }
      if (Number.isNaN(correct) || correct < 0 || correct > solved) {
        throw new Error(`${area.name} 맞은 문제 수는 푼 문제 수를 넘을 수 없습니다.`);
      }

      return {
        ...area,
        total,
        solved,
        correct,
        wrongNumbers,
        score: correct,
        accuracy: solved > 0 ? Math.round((correct / solved) * 100) : 0,
      };
    });

    const existingRound = state.editingRoundId
      ? state.roundHistory.find((round) => round.id === state.editingRoundId) ?? null
      : null;
    const roundRecord = buildManualRoundRecord(roundName, areaSummaries, existingRound);

    if (state.editingRoundId) {
      state.roundHistory = state.roundHistory.map((round) =>
        round.id === state.editingRoundId ? roundRecord : round,
      );
      state.manualRounds = state.manualRounds.map((round) =>
        round.id === state.editingRoundId ? roundRecord : round,
      );
    } else {
      state.manualRounds.unshift(roundRecord);
      state.roundHistory.unshift(roundRecord);
    }

    if (state.result && state.result.roundName === (existingRound?.roundName ?? null)) {
      state.result.roundName = roundRecord.roundName;
    }

    elements.manualRoundError.textContent = "";
    clearManualRoundForm();
    setManualRoundModal(false);
    renderManualRounds();
    saveState();
  } catch (error) {
    elements.manualRoundError.textContent = error.message;
  }
}

function renderManualRounds() {
  elements.manualRoundList.innerHTML = "";

  if (state.roundHistory.length === 0) {
    elements.manualRoundList.innerHTML = '<p class="history-empty">아직 저장된 회차가 없습니다.</p>';
    elements.manualRoundList.classList.add("empty-state");
    return;
  }

  elements.manualRoundList.classList.remove("empty-state");
  const rows = state.roundHistory
    .map((round) => {
      const summaryCells = round.areaSummaries
        .map((area) => `<td>${area.solved || ""}</td><td>${area.correct || ""}</td>`)
        .join("");
      const wrongCells = round.areaSummaries
        .map(
          (area) =>
            `<td colspan="2">${area.wrongNumbers.length ? area.wrongNumbers.join(" ") : ""}</td>`,
        )
        .join("");

      return `
        <tr>
          <td rowspan="2">
            <div class="history-round-name">${round.roundName}</div>
            <button class="ghost-button small-button history-edit-button" type="button" data-round-id="${round.id}">수정</button>
          </td>
          ${summaryCells}
          <td rowspan="2">${round.score}</td>
          <td rowspan="2">${round.accuracy}%</td>
        </tr>
        <tr class="history-wrong-row">
          ${wrongCells}
        </tr>
      `;
    })
    .join("");

  elements.manualRoundList.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th rowspan="2">회차</th>
          <th colspan="2">언어이해 (1~20)</th>
          <th colspan="2">자료해석 (21~40)</th>
          <th colspan="2">창의수리 (41~60)</th>
          <th colspan="2">언어추리 (61~80)</th>
          <th colspan="2">수열추리 (81~100)</th>
          <th rowspan="2">총점</th>
          <th rowspan="2">정답률</th>
        </tr>
        <tr>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function showGradingPanel(visible) {
  state.omrVisible = !visible;
  elements.gradingPanel.classList.toggle("hidden", !visible);
  elements.answerSheetPanel.classList.toggle("hidden", visible);
  document.querySelector("#openGradingButton").textContent = visible ? "답안지 보기" : "채점하기";
  saveState();
}

function renderResult() {
  if (!state.result) {
    return;
  }

  const { solved, correct, wrong, accuracy, comparison, score, areaSummaries, roundName } =
    state.result;

  elements.scoreValue.textContent = String(score);
  elements.solvedValue.textContent = String(solved);
  elements.correctValue.textContent = String(correct);
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.resultSummary.textContent = `${solved}문제 중 ${correct}문제 정답, ${wrong}문제 오답`;
  elements.roundNameDisplay.textContent = roundName || "회차명 미입력";

  renderAreaSummaries(areaSummaries);

  elements.wrongList.innerHTML = "";
  const wrongAreas = areaSummaries.filter((area) => area.wrongNumbers.length > 0);

  if (wrongAreas.length === 0) {
    const perfect = document.createElement("p");
    perfect.className = "empty-state";
    perfect.textContent = "전 문항 정답입니다.";
    elements.wrongList.appendChild(perfect);
  } else {
    wrongAreas.forEach((area) => {
      const group = document.createElement("section");
      group.className = "wrong-area-group";

      const title = document.createElement("h4");
      title.className = "wrong-area-title";
      title.textContent = `${area.name} (${area.start}~${area.end})`;
      group.appendChild(title);

      const chipRow = document.createElement("div");
      chipRow.className = "wrong-area-chips";

      area.wrongNumbers.forEach((question) => {
        const detail = comparison.find((item) => item.question === question);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "wrong-chip";
        chip.textContent = `${question}번`;
        chip.title = `내 답 ${detail?.userAnswer ?? "-"} / 정답 ${detail?.correctAnswer ?? "-"}`;
        chip.addEventListener("click", () => {
          setMode("solve");
          const row = document.querySelector(`.answer-row[data-question="${question}"]`);
          row?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        chipRow.appendChild(chip);
      });

      group.appendChild(chipRow);
      elements.wrongList.appendChild(group);
    });
  }

  renderComparisonGrid(comparison);
  renderManualRounds();
  saveState();
}

function renderManualRounds() {
  elements.manualRoundList.innerHTML = "";

  if (state.roundHistory.length === 0) {
    elements.manualRoundList.innerHTML = '<p class="history-empty">아직 저장된 회차가 없습니다.</p>';
    elements.manualRoundList.classList.add("empty-state");
    return;
  }

  elements.manualRoundList.classList.remove("empty-state");
  const rows = state.roundHistory
    .map((round) => {
      const summaryCells = round.areaSummaries
        .map((area) => `<td>${area.solved || ""}</td><td>${area.correct || ""}</td>`)
        .join("");
      const wrongCells = round.areaSummaries
        .map(
          (area) =>
            `<td colspan="2">${area.wrongNumbers.length ? area.wrongNumbers.join(" ") : ""}</td>`,
        )
        .join("");

      return `
        <tr>
          <td rowspan="2">${round.roundName}</td>
          ${summaryCells}
          <td rowspan="2">${round.score}</td>
          <td rowspan="2">${round.accuracy}%</td>
        </tr>
        <tr class="history-wrong-row">
          ${wrongCells}
        </tr>
      `;
    })
    .join("");

  elements.manualRoundList.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th rowspan="2">회차</th>
          <th colspan="2">언어이해 (1~20)</th>
          <th colspan="2">자료해석 (21~40)</th>
          <th colspan="2">창의수리 (41~60)</th>
          <th colspan="2">언어추리 (61~80)</th>
          <th colspan="2">수열추리 (81~100)</th>
          <th rowspan="2">총점</th>
          <th rowspan="2">정답률</th>
        </tr>
        <tr>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function resetAnswers() {
  state.omrVisible = true;
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
      omrVisible: state.omrVisible,
      roundName: state.roundName,
      userAnswers: state.userAnswers,
      answerKey: state.answerKey,
      roundHistory: state.roundHistory,
      manualRounds: state.manualRounds,
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
    state.omrVisible = saved.omrVisible ?? true;
    state.roundName = saved.roundName ?? "";
    state.userAnswers = saved.userAnswers ?? {};
    state.answerKey = saved.answerKey ?? [];
    state.roundHistory = saved.roundHistory ?? saved.manualRounds ?? [];
    state.manualRounds = saved.manualRounds ?? [];
    state.wrongOnlyFilter = Boolean(saved.wrongOnlyFilter);
    state.result = saved.result ?? null;
    state.timer.remaining =
      typeof saved.timerRemaining === "number" ? saved.timerRemaining : TIMER_SECONDS;

    elements.roundNameInput.value = saved.roundName ?? "";
    elements.answerKeyInput.value = saved.answerKeyInput ?? "";
    elements.memoInput.value = saved.memoInput ?? "";
    elements.roundNameDisplay.textContent = saved.roundName || "회차명 미입력";
    showGradingPanel(saved.gradingPanelOpen ?? !state.omrVisible);
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

function handleCalculatorKeydown(event) {
  const key = event.key;

  if (/^[0-9]$/.test(key) || ["+", "-", "*", "/", "%", ".", "(", ")"].includes(key)) {
    event.preventDefault();
    state.calculator.expression += key;
    state.calculator.display = state.calculator.expression;
    updateCalculatorDisplay();
    return;
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    evaluateExpression();
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    removeLastEntry();
    return;
  }

  if (key === "Delete" || key === "Escape") {
    event.preventDefault();
    state.calculator.expression = "";
    state.calculator.display = "0";
    updateCalculatorDisplay();
  }
}

function bindEvents() {
  elements.answerGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".choice-button");
    if (!button) {
      return;
    }

    const question = Number(button.dataset.question);
    const choice = Number(button.dataset.choice);
    if (state.userAnswers[question] === choice) {
      delete state.userAnswers[question];
    } else {
      state.userAnswers[question] = choice;
    }
    renderAnswerSelection();
  });

  document.querySelector("#openGradingButton").addEventListener("click", () => {
    showGradingPanel(state.omrVisible);
  });
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
  elements.resultModeButton.addEventListener("click", () => setMode("result"));

  document.querySelector("#startTimerButton").addEventListener("click", startTimer);
  document.querySelector("#pauseTimerButton").addEventListener("click", stopTimer);
  document.querySelector("#resetTimerButton").addEventListener("click", resetTimer);
  document.querySelector("#clearMemoButton").addEventListener("click", () => {
    elements.memoInput.value = "";
    saveState();
  });
  document.querySelector("#saveManualRoundButton").addEventListener("click", saveManualRound);
  document.querySelector("#clearManualRoundButton").addEventListener("click", () => {
    populateManualRoundForm(null);
    elements.manualRoundError.textContent = "";
  });
  document.querySelector("#openManualRoundModalButton").addEventListener("click", () => openManualRoundModal());
  document.querySelector("#closeManualRoundModalButton").addEventListener("click", () => setManualRoundModal(false));
  elements.roundNameInput.addEventListener("input", (event) => {
    state.roundName = event.target.value;
    saveState();
  });
  elements.answerKeyInput.addEventListener("input", saveState);
  elements.memoInput.addEventListener("input", saveState);

  elements.calculatorKeys.addEventListener("click", handleCalculatorInput);
  elements.calculatorPanel.addEventListener("click", () => {
    elements.calculatorPanel.focus();
  });
  elements.calculatorPanel.addEventListener("keydown", handleCalculatorKeydown);
  elements.manualRoundModal.addEventListener("click", (event) => {
    if (event.target === elements.manualRoundModal) {
      setManualRoundModal(false);
    }
  });
  elements.manualRoundList.addEventListener("click", (event) => {
    const button = event.target.closest(".history-edit-button");
    if (!button) {
      return;
    }
    openManualRoundModal(button.dataset.roundId);
  });
}

function init() {
  createAnswerSheet();
  createManualAreaForm();
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

  renderManualRounds();

  if (state.mode === "result") {
    setMode("result");
  } else {
    setMode("solve");
  }
}

init();

function renderManualRounds() {
  elements.manualRoundList.innerHTML = "";

  if (state.roundHistory.length === 0) {
    elements.manualRoundList.innerHTML = '<p class="history-empty">아직 저장된 회차가 없습니다.</p>';
    elements.manualRoundList.classList.add("empty-state");
    return;
  }

  elements.manualRoundList.classList.remove("empty-state");
  const rows = state.roundHistory
    .map((round) => {
      const summaryCells = round.areaSummaries
        .map((area) => `<td>${area.solved || ""}</td><td>${area.correct || ""}</td>`)
        .join("");
      const wrongCells = round.areaSummaries
        .map(
          (area) =>
            `<td colspan="2">${area.wrongNumbers.length ? area.wrongNumbers.join(" ") : ""}</td>`,
        )
        .join("");

      return `
        <tr>
          <td rowspan="2">
            <div class="history-round-name">${round.roundName}</div>
            <button class="ghost-button small-button history-edit-button" type="button" data-round-id="${round.id}">수정</button>
          </td>
          ${summaryCells}
          <td rowspan="2">${round.score}</td>
          <td rowspan="2">${round.accuracy}%</td>
        </tr>
        <tr class="history-wrong-row">
          ${wrongCells}
        </tr>
      `;
    })
    .join("");

  elements.manualRoundList.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th rowspan="2">회차</th>
          <th colspan="2">언어이해 (1~20)</th>
          <th colspan="2">자료해석 (21~40)</th>
          <th colspan="2">창의수리 (41~60)</th>
          <th colspan="2">언어추리 (61~80)</th>
          <th colspan="2">수열추리 (81~100)</th>
          <th rowspan="2">총점</th>
          <th rowspan="2">정답률</th>
        </tr>
        <tr>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
          <th>푼 문제</th>
          <th>맞은 문제</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
