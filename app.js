const drawBtn = document.querySelector("#drawBtn");
const clearBtn = document.querySelector("#clearBtn");
const drawsWrap = document.querySelector("#draws");
const historyList = document.querySelector("#history");
const timestampEl = document.querySelector("#timestamp");
const sortedToggle = document.querySelector("#sortedToggle");

const STORAGE_KEY = "lotto-history-v1";

const colorBands = [
  { max: 10, color: "#ffd166" },
  { max: 20, color: "#06d6a0" },
  { max: 30, color: "#118ab2" },
  { max: 40, color: "#f78c6b" },
  { max: 45, color: "#ef476f" },
];

const getBandColor = (num) => colorBands.find((band) => num <= band.max)?.color || "#fff";
const getTextColor = (hex) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "#1b1a1f" : "#f7f6fb";
};

const formatTime = (date) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const randomInt = (maxExclusive) => {
  const array = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  let value = 0;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);
  return value % maxExclusive;
};

const shuffle = (numbers) => {
  const arr = [...numbers];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const drawNumbers = () => {
  const pool = Array.from({ length: 45 }, (_, idx) => idx + 1);
  const pick = shuffle(pool).slice(0, 6);
  return sortedToggle.checked ? pick.sort((a, b) => a - b) : pick;
};

const renderDraws = (batch) => {
  drawsWrap.innerHTML = "";
  batch.forEach((numbers, rowIndex) => {
    const row = document.createElement("div");
    row.className = "draw-row";
    numbers.forEach((num, index) => {
      const ball = document.createElement("div");
      ball.className = "ball";
      ball.textContent = num;
      const bandColor = getBandColor(num);
      ball.style.borderColor = bandColor;
      ball.style.backgroundColor = bandColor;
      ball.style.color = getTextColor(bandColor);
      ball.style.boxShadow = `0 14px 24px ${bandColor}55`;
      ball.style.animation = `fadeUp 0.4s ease ${(rowIndex * 6 + index) * 0.04}s both`;
      row.appendChild(ball);
    });
    drawsWrap.appendChild(row);
  });
};

const renderHistory = (history) => {
  historyList.innerHTML = "";
  if (history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-item";
    empty.textContent = "아직 기록이 없습니다. 첫 추첨을 해볼까요?";
    historyList.appendChild(empty);
    return;
  }

  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const numbersWrap = document.createElement("div");
    numbersWrap.className = "history-balls";

    item.numbers.forEach((num) => {
      const ball = document.createElement("div");
      ball.className = "ball";
      ball.textContent = num;
      const bandColor = getBandColor(num);
      ball.style.borderColor = bandColor;
      ball.style.backgroundColor = bandColor;
      ball.style.color = getTextColor(bandColor);
      numbersWrap.appendChild(ball);
    });

    const time = document.createElement("span");
    time.textContent = item.time;

    li.appendChild(numbersWrap);
    li.appendChild(time);
    historyList.appendChild(li);
  });
};

const loadHistory = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const saveHistory = (history) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

let lastBatch = [];

const handleDraw = () => {
  const batch = Array.from({ length: 5 }, () => drawNumbers());
  lastBatch = batch;
  renderDraws(batch);

  const time = formatTime(new Date());
  timestampEl.textContent = time;

  const history = loadHistory();
  batch.forEach((numbers) => {
    history.unshift({ numbers, time });
  });
  const trimmed = history.slice(0, 10);
  saveHistory(trimmed);
  renderHistory(trimmed);
};

const handleClear = () => {
  localStorage.removeItem(STORAGE_KEY);
  timestampEl.textContent = "대기 중";
  drawsWrap.innerHTML = "";
  for (let row = 0; row < 5; row += 1) {
    const rowEl = document.createElement("div");
    rowEl.className = "draw-row";
    for (let i = 0; i < 6; i += 1) {
      const placeholder = document.createElement("div");
      placeholder.className = "ball placeholder";
      placeholder.textContent = "?";
      rowEl.appendChild(placeholder);
    }
    drawsWrap.appendChild(rowEl);
  }
  renderHistory([]);
};

const init = () => {
  renderHistory(loadHistory());
};

sortedToggle.addEventListener("change", () => {
  if (lastBatch.length > 0) {
    const batch = sortedToggle.checked
      ? lastBatch.map((nums) => [...nums].sort((a, b) => a - b))
      : lastBatch.map((nums) => [...nums]);
    lastBatch = batch;
    renderDraws(batch);
  }
});

drawBtn.addEventListener("click", handleDraw);
clearBtn.addEventListener("click", handleClear);

init();
