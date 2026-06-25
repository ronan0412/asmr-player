const sampleVideos = window.ASMR_VIDEOS || [];
let userVideos = JSON.parse(localStorage.getItem("asmrUserVideos") || "[]");
let videos = [...sampleVideos, ...userVideos];

const moods = [
  { label: "すべて", tags: [] },
  { label: "寝たい", tags: ["睡眠導入", "Sleep"] },
  { label: "囁き", tags: ["囁き", "Whisper"] },
  { label: "耳かき", tags: ["耳かき"] },
  { label: "BGMなし", tags: ["BGMなし", "No BGM"] },
  { label: "ロールプレイ", tags: ["ロールプレイ"] }
];

const state = {
  query: "",
  status: "all",
  language: "all",
  moodIndex: 0,
  queue: JSON.parse(localStorage.getItem("asmrQueue") || "[]"),
  favorites: JSON.parse(localStorage.getItem("asmrFavorites") || "[]"),
  currentIndex: -1,
  filtered: [...videos],
  timerId: null,
  stopAfterCurrent: false,
  playerReady: false,
  pendingIndex: null
};

const els = {
  search: document.querySelector("#searchInput"),
  status: document.querySelector("#statusFilter"),
  language: document.querySelector("#languageFilter"),
  cards: document.querySelector("#videoCards"),
  template: document.querySelector("#cardTemplate"),
  resultCount: document.querySelector("#resultCount"),
  queueList: document.querySelector("#queueList"),
  nowTitle: document.querySelector("#nowTitle"),
  nowMeta: document.querySelector("#nowMeta"),
  playerStatus: document.querySelector("#playerStatus"),
  moodButtons: document.querySelector("#moodButtons"),
  playQueue: document.querySelector("#playQueueButton"),
  prev: document.querySelector("#prevButton"),
  next: document.querySelector("#nextButton"),
  autoNext: document.querySelector("#autoNextToggle"),
  shuffle: document.querySelector("#shuffleToggle"),
  infinite: document.querySelector("#infiniteToggle"),
  clearQueue: document.querySelector("#clearQueueButton"),
  buildNightQueue: document.querySelector("#buildNightQueueButton"),
  timer: document.querySelector("#timerSelect"),
  timerStatus: document.querySelector("#timerStatus"),
  volume: document.querySelector("#volumeRange"),
  sleepMode: document.querySelector("#sleepModeButton"),
  addForm: document.querySelector("#addVideoForm"),
  videoUrl: document.querySelector("#videoUrlInput"),
  videoTitle: document.querySelector("#videoTitleInput"),
  videoMember: document.querySelector("#videoMemberInput"),
  videoStatus: document.querySelector("#videoStatusInput"),
  addStatus: document.querySelector("#addVideoStatus")
};

let player;

function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "360",
    width: "640",
    playerVars: {
      playsinline: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: () => {
        state.playerReady = true;
        player.setVolume(Number(els.volume.value));
        setPlayerStatus("プレイヤー準備完了");
        if (state.pendingIndex !== null) {
          state.currentIndex = state.pendingIndex;
          state.pendingIndex = null;
          playCurrent();
        }
      },
      onStateChange: handlePlayerState,
      onError: () => setPlayerStatus("この動画は埋め込み再生できない可能性があります。YouTubeで開いてください。")
    }
  });
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function handlePlayerState(event) {
  if (event.data !== YT.PlayerState.ENDED) return;
  if (state.stopAfterCurrent) {
    state.stopAfterCurrent = false;
    els.timerStatus.textContent = "この動画で停止しました";
    return;
  }
  if (els.autoNext.checked) playNext();
}

function setPlayerStatus(message) {
  els.playerStatus.textContent = message;
}

function persist() {
  localStorage.setItem("asmrQueue", JSON.stringify(state.queue));
  localStorage.setItem("asmrFavorites", JSON.stringify(state.favorites));
  localStorage.setItem("asmrUserVideos", JSON.stringify(userVideos));
}

function videoById(id) {
  return videos.find((video) => video.id === id);
}

function playableVideos(source = videos) {
  return source.filter((video) => Boolean(video.youtubeId));
}

function getFilteredVideos() {
  const query = state.query.trim().toLowerCase();
  const moodTags = moods[state.moodIndex].tags;

  return videos.filter((video) => {
    const haystack = [
      video.title,
      video.member,
      video.branch,
      video.generation,
      ...video.tags,
      ...video.equipment
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = state.status === "all" || video.status === state.status;
    const matchesLanguage = state.language === "all" || video.language.includes(state.language);
    const matchesMood =
      moodTags.length === 0 || moodTags.some((tag) => video.tags.includes(tag));

    return matchesQuery && matchesStatus && matchesLanguage && matchesMood;
  });
}

function renderMoods() {
  els.moodButtons.innerHTML = "";
  moods.forEach((mood, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = mood.label;
    button.classList.toggle("active", index === state.moodIndex);
    button.addEventListener("click", () => {
      state.moodIndex = index;
      applyFilters();
    });
    els.moodButtons.append(button);
  });
}

function renderCards() {
  els.cards.innerHTML = "";
  els.resultCount.textContent = `${state.filtered.length}件`;

  state.filtered.forEach((video) => {
    const node = els.template.content.cloneNode(true);
    const card = node.querySelector(".video-card");
    const image = node.querySelector("img");
    const favorite = node.querySelector(".favorite");
    const status = node.querySelector(".status");
    const duration = node.querySelector(".duration");
    const title = node.querySelector("h3");
    const member = node.querySelector(".member");
    const tags = node.querySelector(".tags");
    const add = node.querySelector(".add");
    const play = node.querySelector(".play");
    const link = node.querySelector("a");

    card.dataset.id = video.id;
    image.src = video.youtubeId
      ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`
      : placeholderThumbnail(video);
    image.alt = `${video.title} thumbnail`;
    favorite.textContent = state.favorites.includes(video.id) ? "★" : "☆";
    favorite.classList.toggle("active", state.favorites.includes(video.id));
    status.textContent = video.status === "active" ? "現役" : "卒業生";
    status.classList.add(video.status);
    duration.textContent = video.duration;
    title.textContent = video.title;
    member.textContent = `${video.member} / ${video.branch} / ${video.generation}`;

    if (video.youtubeId) {
      link.href = `https://www.youtube.com/watch?v=${video.youtubeId}`;
    } else {
      link.removeAttribute("href");
      link.textContent = "サンプル";
      link.classList.add("disabled-link");
    }

    video.tags.slice(0, 5).forEach((tag) => {
      const pill = document.createElement("span");
      pill.textContent = tag;
      tags.append(pill);
    });

    favorite.addEventListener("click", () => toggleFavorite(video.id));
    add.addEventListener("click", () => addToQueue(video.id));
    play.addEventListener("click", () => playNow(video.id));

    els.cards.append(node);
  });
}

function renderQueue() {
  els.queueList.innerHTML = "";

  if (state.queue.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "まだ何も入っていません。";
    els.queueList.append(empty);
    return;
  }

  state.queue.forEach((id, index) => {
    const video = videoById(id);
    if (!video) return;

    const item = document.createElement("li");
    item.classList.toggle("active", index === state.currentIndex);
    item.innerHTML = `<strong>${index + 1}. ${video.title}</strong><span>${video.member} / ${video.duration}</span>`;
    item.addEventListener("click", () => playQueueIndex(index));
    els.queueList.append(item);
  });
}

function applyFilters() {
  state.filtered = getFilteredVideos();
  renderMoods();
  renderCards();
}

function addToQueue(id) {
  const video = videoById(id);
  if (!video?.youtubeId) {
    setPlayerStatus("サンプルデータは再生できません。公式URLを追加してください。");
    return;
  }
  state.queue.push(id);
  persist();
  renderQueue();
}

function buildNightQueue() {
  const source = playableVideos(state.filtered.length > 0 ? state.filtered : videos);
  if (source.length === 0) {
    setPlayerStatus("再生できる公式URLがまだありません。");
    return;
  }
  const ids = source.map((video) => video.id);
  state.queue = els.shuffle.checked ? shuffle(ids) : ids;
  state.currentIndex = -1;
  persist();
  renderQueue();
}

function toggleFavorite(id) {
  state.favorites = state.favorites.includes(id)
    ? state.favorites.filter((favoriteId) => favoriteId !== id)
    : [...state.favorites, id];
  persist();
  renderCards();
}

function playNow(id) {
  const video = videoById(id);
  if (!video?.youtubeId) {
    setPlayerStatus("サンプルデータは再生できません。上のフォームから公式URLを追加できます。");
    return;
  }

  const index = state.queue.indexOf(id);
  if (index === -1) {
    state.queue.unshift(id);
    state.currentIndex = 0;
  } else {
    state.currentIndex = index;
  }
  persist();
  renderQueue();
  playCurrent();
}

function playQueueIndex(index) {
  state.currentIndex = index;
  playCurrent();
}

function playQueue() {
  if (state.queue.length === 0) buildNightQueue();
  if (state.queue.length === 0) return;
  if (state.currentIndex < 0) state.currentIndex = 0;
  playCurrent();
}

function playCurrent() {
  const video = videoById(state.queue[state.currentIndex]);
  if (!video?.youtubeId) {
    setPlayerStatus("再生できる公式URLがありません。");
    return;
  }

  if (!state.playerReady) {
    state.pendingIndex = state.currentIndex;
    setPlayerStatus("プレイヤー準備中です。読み込み後に再生します。");
    return;
  }

  player.loadVideoById(video.youtubeId);
  player.setVolume(Number(els.volume.value));
  els.nowTitle.textContent = video.title;
  els.nowMeta.textContent = `${video.member} / ${video.duration} / ${video.tags.join("、")}`;
  setPlayerStatus("再生中");
  renderQueue();
  scheduleTimer();
}

function playNext() {
  if (state.queue.length === 0) return;

  if (els.shuffle.checked) {
    state.currentIndex = Math.floor(Math.random() * state.queue.length);
  } else {
    state.currentIndex += 1;
  }

  if (state.currentIndex >= state.queue.length) {
    if (els.infinite.checked) {
      refillQueue();
    } else {
      state.currentIndex = state.queue.length - 1;
      return;
    }
  }

  playCurrent();
}

function playPrev() {
  if (state.queue.length === 0) return;
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  playCurrent();
}

function refillQueue() {
  const candidates = playableVideos(state.filtered.length > 0 ? state.filtered : videos);
  const nextIds = shuffle(candidates.map((video) => video.id));
  state.queue.push(...nextIds);
  persist();
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function scheduleTimer() {
  clearTimeout(state.timerId);
  state.stopAfterCurrent = false;
  const value = els.timer.value;

  if (value === "video") {
    state.stopAfterCurrent = true;
    els.timerStatus.textContent = "この動画で停止します";
    return;
  }

  const minutes = Number(value);
  if (!minutes) {
    els.timerStatus.textContent = "タイマー未設定";
    return;
  }

  state.timerId = setTimeout(() => {
    if (state.playerReady) player.pauseVideo();
    els.timerStatus.textContent = `${minutes}分で停止しました`;
  }, minutes * 60 * 1000);
  els.timerStatus.textContent = `${minutes}分後に停止します`;
}

function placeholderThumbnail(video) {
  const label = encodeURIComponent(`${video.member} sample`);
  return `https://placehold.co/640x360/171717/f3eee6?text=${label}`;
}

function extractYouTubeId(value) {
  try {
    const url = new URL(value.trim());
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const embedMatch = url.pathname.match(/\/embed\/([^/]+)/);
      if (embedMatch) return embedMatch[1];
    }
  } catch (error) {
    return "";
  }
  return "";
}

function addUserVideo(event) {
  event.preventDefault();
  const youtubeId = extractYouTubeId(els.videoUrl.value);
  const title = els.videoTitle.value.trim();
  const member = els.videoMember.value.trim();

  if (!youtubeId || !title || !member) {
    els.addStatus.textContent = "URL、タイトル、メンバーを入力してください。";
    return;
  }

  const video = {
    id: `user-${youtubeId}`,
    youtubeId,
    title,
    member,
    status: els.videoStatus.value,
    branch: "manual",
    generation: "manual",
    date: new Date().toISOString().slice(0, 10),
    duration: "未取得",
    language: ["ja"],
    tags: ["手動追加"],
    equipment: [],
    note: "ブラウザに保存された手動追加データです。"
  };

  userVideos = [video, ...userVideos.filter((item) => item.id !== video.id)];
  videos = [...sampleVideos, ...userVideos];
  state.filtered = getFilteredVideos();
  persist();
  els.addForm.reset();
  els.addStatus.textContent = "追加しました。カードから再生できます。";
  applyFilters();
}

function bindEvents() {
  els.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    applyFilters();
  });
  els.status.addEventListener("change", (event) => {
    state.status = event.target.value;
    applyFilters();
  });
  els.language.addEventListener("change", (event) => {
    state.language = event.target.value;
    applyFilters();
  });
  els.playQueue.addEventListener("click", playQueue);
  els.prev.addEventListener("click", playPrev);
  els.next.addEventListener("click", playNext);
  els.clearQueue.addEventListener("click", () => {
    state.queue = [];
    state.currentIndex = -1;
    persist();
    renderQueue();
  });
  els.buildNightQueue.addEventListener("click", buildNightQueue);
  els.timer.addEventListener("change", scheduleTimer);
  els.volume.addEventListener("input", (event) => {
    if (state.playerReady) player.setVolume(Number(event.target.value));
  });
  els.sleepMode.addEventListener("click", () => {
    document.body.classList.toggle("sleep-mode");
  });
  els.addForm.addEventListener("submit", addUserVideo);
}

bindEvents();
applyFilters();
renderQueue();
