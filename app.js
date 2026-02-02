const drawBtn = document.querySelector("#drawBtn");
const clearBtn = document.querySelector("#clearBtn");
const drawsWrap = document.querySelector("#draws");
const historyList = document.querySelector("#history");
const timestampEl = document.querySelector("#timestamp");
const sortedToggle = document.querySelector("#sortedToggle");
const lookupBtn = document.querySelector("#lookupBtn");
const latestBtn = document.querySelector("#latestBtn");
const drawNoInput = document.querySelector("#drawNoInput");
const winningWrap = document.querySelector("#winning");
const winningMeta = document.querySelector("#winningMeta");

const STORAGE_KEY = "lotto-history-v1";
const LOTTO_RESULT_API = "https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

let lastWinning = null;

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

const formatNumber = (value) => new Intl.NumberFormat("ko-KR").format(value);

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

const getRankLabel = (matchCount, bonusMatch) => {
  if (matchCount === 6) return "1등";
  if (matchCount === 5 && bonusMatch) return "2등";
  if (matchCount === 5) return "3등";
  if (matchCount === 4) return "4등";
  if (matchCount === 3) return "5등";
  return "";
};

const getWinningMeta = (numbers) => {
  if (!lastWinning) return { matchCount: 0, bonusMatch: false, rank: "" };
  const set = new Set(lastWinning.numbers);
  const matchCount = numbers.filter((num) => set.has(num)).length;
  const bonusMatch = numbers.includes(lastWinning.bonus);
  const rank = matchCount >= 3 ? getRankLabel(matchCount, bonusMatch) : "";
  return { matchCount, bonusMatch, rank };
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
    const winningMetaInfo = getWinningMeta(item.numbers);
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
      if (winningMetaInfo.matchCount > 0 && lastWinning?.numbers.includes(num)) {
        ball.classList.add("match");
      }
      numbersWrap.appendChild(ball);
    });

    const time = document.createElement("span");
    time.textContent = item.time;

    li.appendChild(numbersWrap);
    if (winningMetaInfo.rank) {
      const rank = document.createElement("span");
      rank.className = "rank-pill";
      rank.textContent = `이번 회차 ${winningMetaInfo.rank}`;
      li.appendChild(rank);
    }
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

const setWinningMessage = (message, tone = "idle") => {
  winningWrap.innerHTML = "";
  const paragraph = document.createElement("p");
  paragraph.className = "winning-empty";
  if (tone === "error") {
    paragraph.style.color = "#ffb3b3";
  }
  paragraph.textContent = message;
  winningWrap.appendChild(paragraph);
};

const createBall = (num) => {
  const ball = document.createElement("div");
  ball.className = "ball";
  ball.textContent = num;
  const bandColor = getBandColor(num);
  ball.style.borderColor = bandColor;
  ball.style.backgroundColor = bandColor;
  ball.style.color = getTextColor(bandColor);
  return ball;
};

const renderWinning = (data) => {
  winningWrap.innerHTML = "";
  lastWinning = {
    drawNo: data.drwNo,
    date: data.drwNoDate,
    numbers: [
      Number(data.drwtNo1),
      Number(data.drwtNo2),
      Number(data.drwtNo3),
      Number(data.drwtNo4),
      Number(data.drwtNo5),
      Number(data.drwtNo6),
    ],
    bonus: Number(data.bnusNo),
  };

  const card = document.createElement("div");
  card.className = "winning-card";

  const header = document.createElement("div");
  header.className = "winning-header";

  const title = document.createElement("h3");
  title.textContent = `${data.drwNo}회 당첨번호`;

  const meta = document.createElement("span");
  meta.className = "winning-meta";
  meta.textContent = `추첨일 ${data.drwNoDate}`;

  header.appendChild(title);
  header.appendChild(meta);

  const balls = document.createElement("div");
  balls.className = "winning-balls";
  const mainNumbers = [
    data.drwtNo1,
    data.drwtNo2,
    data.drwtNo3,
    data.drwtNo4,
    data.drwtNo5,
    data.drwtNo6,
  ];
  mainNumbers.forEach((num) => {
    balls.appendChild(createBall(Number(num)));
  });

  const plus = document.createElement("span");
  plus.className = "bonus-plus";
  plus.textContent = "+";

  const bonusBall = createBall(Number(data.bnusNo));

  balls.appendChild(plus);
  balls.appendChild(bonusBall);

  const detail = document.createElement("p");
  detail.className = "winning-meta";
  if (data.firstAccumamnt) {
    detail.textContent = `1등 총상금 ${formatNumber(Number(data.firstAccumamnt))}원`;
  } else {
    detail.textContent = "당첨금 정보는 공식 페이지에서 확인하세요.";
  }

  card.appendChild(header);
  card.appendChild(balls);
  card.appendChild(detail);
  winningWrap.appendChild(card);
  renderHistory(loadHistory());
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("network");
  }
  return response.json();
};

const buildUrl = (baseUrl, params) => {
  const url = new URL(baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

const formatYmd = (yyyymmdd) => {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
};

const normalizeResultData = (item) => ({
  drwNo: item.ltEpsd,
  drwNoDate: formatYmd(item.ltRflYmd),
  drwtNo1: item.tm1WnNo,
  drwtNo2: item.tm2WnNo,
  drwtNo3: item.tm3WnNo,
  drwtNo4: item.tm4WnNo,
  drwtNo5: item.tm5WnNo,
  drwtNo6: item.tm6WnNo,
  bnusNo: item.bnsWnNo,
  firstAccumamnt: item.rnk1SumWnAmt ?? item.rnk1WnAmt,
});

const fetchLotto = async (drawNo) => {
  const targetUrl = buildUrl(LOTTO_RESULT_API, drawNo ? { srchLtEpsd: drawNo } : null);
  try {
    return await fetchJson(targetUrl);
  } catch (err) {
    return fetchJson(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
  }
};

const lookupDraw = async (drawNo) => {
  if (!drawNo || Number(drawNo) < 1) {
    setWinningMessage("회차 번호를 입력해 주세요.", "error");
    return;
  }

  winningMeta.textContent = "조회 중...";
  setWinningMessage("당첨번호를 가져오는 중입니다...");

  try {
    const data = await fetchLotto(drawNo);
    const list = data?.data?.list;
    if (!Array.isArray(list) || list.length === 0) {
      winningMeta.textContent = "조회 실패";
      setWinningMessage("해당 회차를 찾지 못했습니다. 번호를 다시 확인해 주세요.", "error");
      return;
    }

    const normalized = normalizeResultData(list[0]);
    renderWinning(normalized);
    winningMeta.textContent = `${normalized.drwNo}회 데이터`;
  } catch (err) {
    winningMeta.textContent = "연동 실패";
    setWinningMessage(
      "브라우저 보안 정책으로 조회가 막힐 수 있어요. 추첨결과 페이지에서 확인해 주세요.",
      "error"
    );
  }
};

const fetchLatestDraw = async () => {
  winningMeta.textContent = "최신 회차 확인 중...";
  setWinningMessage("최근 회차를 찾는 중입니다...");

  try {
    const data = await fetchLotto();
    const list = data?.data?.list;
    if (!Array.isArray(list) || list.length === 0) {
      winningMeta.textContent = "조회 실패";
      setWinningMessage("최신 회차를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
      return;
    }
    const normalized = normalizeResultData(list[0]);
    renderWinning(normalized);
    winningMeta.textContent = `최신 ${normalized.drwNo}회`;
    drawNoInput.value = normalized.drwNo;
  } catch (err) {
    winningMeta.textContent = "연동 실패";
    setWinningMessage(
      "브라우저 보안 정책으로 조회가 막힐 수 있어요. 추첨결과 페이지에서 확인해 주세요.",
      "error"
    );
  }
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
lookupBtn.addEventListener("click", () => lookupDraw(drawNoInput.value));
latestBtn.addEventListener("click", fetchLatestDraw);
drawNoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    lookupDraw(drawNoInput.value);
  }
});

init();
