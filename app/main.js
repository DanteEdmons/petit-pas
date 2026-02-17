/* Petit Pas v2 — Main Application (SPA) */
import { Store, ACHIEVEMENTS, SRS_INTERVALS } from './store.js';
import { speak, isSpeechSupported } from './audio.js';

// ============ HTML ESCAPING (XSS protection) ============
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============ EVENT LISTENER CLEANUP ============
const globalListeners = [];

function addGlobalListener(target, event, handler) {
  target.addEventListener(event, handler);
  globalListeners.push({ target, event, handler });
}

function cleanupGlobalListeners() {
  while (globalListeners.length > 0) {
    const { target, event, handler } = globalListeners.pop();
    target.removeEventListener(event, handler);
  }
}

// ============ DATA CACHE ============
const dataCache = {};

const VALID_LANGUAGES = ['english', 'french', 'japanese', 'serbian'];

async function loadLanguageData(lang) {
  if (!VALID_LANGUAGES.includes(lang)) return null;
  if (dataCache[lang]) return dataCache[lang];
  try {
    const resp = await fetch(`data/${lang}.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data || typeof data !== 'object' || !data.levels) {
      throw new Error('Invalid data format');
    }
    dataCache[lang] = data;
    return dataCache[lang];
  } catch (e) {
    console.error(`Failed to load data for ${lang}:`, e);
    return null;
  }
}

// ============ ROUTER ============
const Router = {
  currentRoute: '',

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  navigate(hash) {
    window.location.hash = hash;
  },

  handleRoute() {
    cleanupGlobalListeners();
    const hash = window.location.hash.slice(1) || '/';
    this.currentRoute = hash;
    const parts = hash.split('/').filter(Boolean);

    // Route matching
    if (hash === '/' || hash === '') {
      renderHome();
    } else if (parts[0] === 'dashboard') {
      renderDashboard();
    } else if (parts[0] === 'levels') {
      renderLevels();
    } else if (parts[0] === 'topics' && parts[1]) {
      renderTopics(parts[1]); // level
    } else if (parts[0] === 'vocab' && parts[1] && parts[2]) {
      renderVocab(parts[1], parts[2]); // level, category
    } else if (parts[0] === 'grammar' && parts[1]) {
      renderGrammar(parts[1]); // level
    } else if (parts[0] === 'quiz' && parts[1]) {
      renderQuiz(parts[1]); // level
    } else if (parts[0] === 'exercises' && parts[1]) {
      renderExercises(parts[1]); // level
    } else if (parts[0] === 'reading' && parts[1]) {
      renderReading(parts[1]); // level
    } else if (parts[0] === 'conjugation' && parts[1]) {
      renderConjugation(parts[1]); // level
    } else if (parts[0] === 'declension' && parts[1]) {
      renderDeclension(parts[1]); // level
    } else if (parts[0] === 'review') {
      renderReview();
    } else if (parts[0] === 'session') {
      renderDailySession();
    } else if (parts[0] === 'achievements') {
      renderAchievements();
    } else if (parts[0] === 'settings') {
      renderSettings();
    } else if (parts[0] === 'practice-mode' && parts[1] && parts[2]) {
      renderPracticeMode(parts[1], parts[2], parts[3] || 'flashcard'); // level, category, mode
    } else {
      renderHome();
    }
  },
};

// ============ APP SHELL ============
const app = document.getElementById('app');

function renderShell(content, { showHeader = true, backRoute = null, title = '' } = {}) {
  const state = Store.getState();
  const lang = Store.getSelectedLanguage();
  const level = lang ? Store.getLevel(state.stats.xp) : null;

  let headerHTML = '';
  if (showHeader && lang) {
    headerHTML = `
      <header class="app-header">
        <div class="app-header-left">
          ${backRoute ? `<button class="app-back-btn" data-nav="${escapeHTML(backRoute)}" aria-label="Назад">&#8592;</button>` : ''}
          <span class="app-logo" data-nav="#/dashboard">Petit Pas</span>
        </div>
        <div class="app-header-right">
          <div class="header-stat header-streak">
            <span class="icon">&#128293;</span>
            <span>${parseInt(state.stats.streak) || 0}</span>
          </div>
          <div class="header-stat header-xp">
            <span class="icon">&#9733;</span>
            <span>${parseInt(state.stats.xp) || 0} XP</span>
          </div>
        </div>
      </header>
    `;
  }

  app.innerHTML = `
    ${headerHTML}
    <main class="app-content">
      <div class="page">
        ${content}
      </div>
    </main>
  `;

  // Bind navigation
  app.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(el.dataset.nav);
    });
  });
}

// ============ TOAST NOTIFICATIONS ============
function showToast(icon, title, message, duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.innerHTML = icon; // icon is always a trusted HTML entity

  const textDiv = document.createElement('div');
  textDiv.className = 'toast-text';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'toast-title';
  titleDiv.textContent = title;

  const msgDiv = document.createElement('div');
  msgDiv.textContent = message;

  textDiv.appendChild(titleDiv);
  textDiv.appendChild(msgDiv);
  toast.appendChild(iconSpan);
  toast.appendChild(textDiv);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Achievement listener
window.addEventListener('achievement', (e) => {
  const ach = e.detail;
  showToast(ach.icon, ach.name, ach.desc, 4000);
});

// ============ VIEWS ============

// --- HOME ---
function renderHome() {
  const savedLang = Store.getSelectedLanguage();
  if (savedLang) {
    Router.navigate('#/dashboard');
    return;
  }

  const languages = [
    { code: 'english', name: 'Английский', flag: '&#127468;&#127463;' },
    { code: 'french', name: 'Французский', flag: '&#127467;&#127479;' },
    { code: 'japanese', name: 'Японский', flag: '&#127471;&#127477;' },
    { code: 'serbian', name: 'Сербский', flag: '&#127479;&#127480;' },
  ];

  const content = `
    <div class="home-container">
      <h1 class="home-title">Petit Pas</h1>
      <p class="home-subtitle">
        Ваш тренажёр для изучения иностранных языков.
        Интервальное повторение, ежедневные сессии, геймификация — всё для того,
        чтобы слова оставались в памяти.
      </p>
      <div class="language-grid">
        ${languages.map(l => `
          <div class="language-card" data-lang="${l.code}" tabindex="0">
            <span class="flag">${l.flag}</span>
            <span>${l.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  renderShell(content, { showHeader: false });

  // Bind language selection
  app.querySelectorAll('.language-card').forEach(card => {
    const handler = () => {
      Store.setSelectedLanguage(card.dataset.lang);
      Store.updateStreak();
      Router.navigate('#/dashboard');
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(); });
  });
}

// --- DASHBOARD ---
async function renderDashboard() {
  const lang = Store.getSelectedLanguage();
  if (!lang) { Router.navigate('#/'); return; }

  const data = await loadLanguageData(lang);
  if (!data) {
    renderShell(`<div class="empty-state"><div class="empty-icon">&#128533;</div><p>Не удалось загрузить данные для этого языка.</p></div>`);
    return;
  }

  const state = Store.getState();
  const streak = state.stats.streak;
  const level = Store.getLevel(state.stats.xp);
  const wordStats = Store.getWordStats(lang);
  const dueWords = Store.getDueWords(lang);
  const todayProgress = Store.getTodayProgress();
  const dailyGoal = Store.getDailyGoal();
  const goalPercent = Math.min((todayProgress / dailyGoal) * 100, 100);
  const goalComplete = todayProgress >= dailyGoal;

  // Count total words available in data
  let totalAvailableWords = 0;
  for (const lvl of Object.values(data.levels)) {
    if (lvl.vocabulary) {
      for (const cat of Object.values(lvl.vocabulary)) {
        totalAvailableWords += cat.length;
      }
    }
  }

  const content = `
    <div class="dashboard">
      <div class="dash-hero">
        <div class="dash-greeting">
          <h1>${data.flag} ${data.name}</h1>
          <div class="streak-badge">
            <span class="streak-fire">&#128293;</span>
            <span>${streak} ${pluralize(streak, 'день', 'дня', 'дней')}</span>
          </div>
        </div>

        <div class="level-bar">
          <span class="level-name">Ур. ${level.index + 1}: ${level.name}</span>
          <div class="level-progress-bar">
            <div class="level-progress-fill" style="width: ${Math.round(level.progress * 100)}%"></div>
          </div>
          <span class="level-xp-text">${state.stats.xp} / ${level.nextLevelXP} XP</span>
        </div>

        <div class="daily-goal">
          <div class="daily-goal-header">
            <span class="daily-goal-title">${goalComplete ? '&#9989; Цель достигнута!' : 'Дневная цель'}</span>
            <span class="daily-goal-count">${todayProgress} / ${dailyGoal} слов</span>
          </div>
          <div class="daily-goal-bar">
            <div class="daily-goal-fill ${goalComplete ? 'complete' : ''}" style="width: ${goalPercent}%"></div>
          </div>
        </div>

        <div class="dash-stats">
          <div class="stat-card">
            <div class="stat-value">${wordStats.total}</div>
            <div class="stat-label">Слов изучается</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${wordStats.mastered}</div>
            <div class="stat-label">Освоено</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${dueWords.length}</div>
            <div class="stat-label">На повторение</div>
          </div>
          <div class="stat-card">
            <div class="stat-value xp-value">${state.stats.xp}</div>
            <div class="stat-label">Опыт (XP)</div>
          </div>
        </div>
      </div>

      <div class="dash-actions">
        ${dueWords.length > 0 ? `
          <div class="action-card action-card-primary" data-nav="#/review">
            <div class="action-title">&#128257; Повторение <span class="action-badge">${dueWords.length}</span></div>
            <div class="action-desc">Слова, которые пора повторить по системе интервального повторения</div>
          </div>
        ` : ''}
        <div class="action-card action-card-primary" data-nav="#/session">
          <div class="action-title">&#9889; Дневная сессия</div>
          <div class="action-desc">Микс из новых слов и повторений — оптимальная тренировка на сегодня</div>
        </div>
        <div class="action-card" data-nav="#/levels">
          <div class="action-title">&#128218; Учить по уровням</div>
          <div class="action-desc">Словарь, грамматика и практика по уровням сложности</div>
        </div>
        <div class="action-card" data-nav="#/achievements">
          <div class="action-title">&#127942; Достижения</div>
          <div class="action-desc">${state.achievements.length} / ${ACHIEVEMENTS.length} открыто</div>
        </div>
      </div>

      <div class="btn-group mt-2">
        <button class="btn btn-secondary btn-sm" data-nav="#/">&#127760; Сменить язык</button>
        <button class="btn btn-secondary btn-sm" data-nav="#/settings">&#9881; Настройки</button>
      </div>
    </div>
  `;

  renderShell(content, { showHeader: true });
  // Make "сменить язык" also clear selection
  app.querySelector('[data-nav="#/"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    Store.setSelectedLanguage(null);
    Router.navigate('#/');
  });
}

// --- LEVEL SELECTOR ---
async function renderLevels() {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data) return;

  const levelNames = { beginner: 'Начальный', intermediate: 'Средний', advanced: 'Продвинутый' };
  const levelDescs = {
    beginner: 'Основы произношения, базовый словарь и простая грамматика',
    intermediate: 'Расширение словаря, уверенное общение и понимание',
    advanced: 'Нюансы языка, стилистика и культурный контекст',
  };

  const content = `
    <h1 class="page-title">${data.flag} Уровни</h1>
    <p class="page-subtitle">Выберите уровень сложности</p>
    <div class="card-grid">
      ${Object.keys(data.levels).map(lvl => {
        const levelData = data.levels[lvl];
        let wordCount = 0;
        if (levelData.vocabulary) {
          for (const cat of Object.values(levelData.vocabulary)) wordCount += cat.length;
        }
        return `
          <div class="nav-card" data-nav="#/topics/${lvl}">
            <strong>${levelNames[lvl] || lvl}</strong>
            <span class="desc">${levelDescs[lvl] || ''}</span>
            ${wordCount ? `<span class="text-dim" style="font-size:0.8rem">${wordCount} слов</span>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  renderShell(content, { backRoute: '#/dashboard' });
}

// --- TOPIC SELECTOR ---
async function renderTopics(level) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level]) return;

  const lvl = data.levels[level];
  const levelNames = { beginner: 'Начальный', intermediate: 'Средний', advanced: 'Продвинутый' };

  const sections = [];

  const hasVocab = lvl.vocabulary && Object.values(lvl.vocabulary).some(arr => arr.length > 0);
  if (hasVocab) {
    sections.push({ title: 'Словарный запас', icon: '&#128214;', route: 'vocab', items: Object.keys(lvl.vocabulary) });
  }
  if (lvl.grammar && lvl.grammar.length > 0) {
    sections.push({ title: 'Грамматика', icon: '&#128221;', route: 'grammar' });
  }
  if (lvl.quiz && lvl.quiz.length > 0) {
    sections.push({ title: 'Квиз', icon: '&#127919;', route: 'quiz' });
  }
  if (lvl.exercises && lvl.exercises.length > 0) {
    sections.push({ title: 'Упражнения', icon: '&#9999;', route: 'exercises' });
  }
  if (lvl.reading && lvl.reading.length > 0) {
    sections.push({ title: 'Чтение', icon: '&#128214;', route: 'reading' });
  }
  if (lvl.conjugation && lvl.conjugation.length > 0) {
    sections.push({ title: 'Спряжение', icon: '&#128260;', route: 'conjugation' });
  }
  if (lvl.declension && lvl.declension.length > 0) {
    sections.push({ title: 'Падежи', icon: '&#128218;', route: 'declension' });
  }

  const catNames = { nouns: 'Существительные', verbs: 'Глаголы', adjectives: 'Прилагательные', others: 'Другие' };

  let vocabHTML = '';
  if (hasVocab) {
    vocabHTML = `
      <div class="section-title">&#128214; Словарный запас</div>
      <div class="card-grid mb-2">
        ${Object.entries(lvl.vocabulary).filter(([_, words]) => words.length > 0).map(([cat, words]) => `
          <div class="nav-card" data-nav="#/practice-mode/${level}/${cat}/flashcard">
            <strong>${catNames[cat] || cat}</strong>
            <span class="desc">${words.length} слов</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  let practiceHTML = '';
  const practiceItems = sections.filter(s => !['vocab'].includes(s.route));
  if (practiceItems.length > 0) {
    practiceHTML = `
      <div class="section-title">&#127919; Практика и теория</div>
      <div class="card-grid">
        ${practiceItems.map(s => `
          <div class="nav-card" data-nav="#/${s.route}/${level}">
            <strong>${s.title}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  const content = `
    <h1 class="page-title">${levelNames[level]}</h1>
    <p class="page-subtitle">Выберите, чем хотите заняться</p>
    ${vocabHTML}
    ${practiceHTML}
  `;

  renderShell(content, { backRoute: '#/levels' });
}

// --- PRACTICE MODE SELECTOR + FLASHCARD ---
async function renderPracticeMode(level, category, mode) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level] || !data.levels[level].vocabulary[category]) return;

  const words = data.levels[level].vocabulary[category];
  const catNames = { nouns: 'Существительные', verbs: 'Глаголы', adjectives: 'Прилагательные', others: 'Другие' };

  const modes = [
    { id: 'flashcard', name: 'Карточки' },
    { id: 'type', name: 'Напиши' },
    { id: 'choose', name: 'Выбери' },
    { id: 'scramble', name: 'Собери' },
  ];

  const modeSelector = `
    <div class="mode-selector">
      ${modes.map(m => `
        <button class="mode-btn ${mode === m.id ? 'active' : ''}" data-nav="#/practice-mode/${level}/${category}/${m.id}">${m.name}</button>
      `).join('')}
    </div>
  `;

  let modeContent = '';
  if (mode === 'flashcard') {
    modeContent = `<div id="flashcard-root"></div>`;
  } else if (mode === 'type') {
    modeContent = `<div id="type-root"></div>`;
  } else if (mode === 'choose') {
    modeContent = `<div id="choose-root"></div>`;
  } else if (mode === 'scramble') {
    modeContent = `<div id="scramble-root"></div>`;
  }

  const content = `
    <h1 class="page-title">${catNames[category] || category}</h1>
    ${modeSelector}
    ${modeContent}
  `;

  renderShell(content, { backRoute: `#/topics/${level}` });

  // Initialize the selected mode
  if (mode === 'flashcard') {
    initFlashcardSRS('flashcard-root', words, lang, level, category);
  } else if (mode === 'type') {
    initTypeMode('type-root', words, lang, level, category);
  } else if (mode === 'choose') {
    initChooseMode('choose-root', words, lang, level, category);
  } else if (mode === 'scramble') {
    initScrambleMode('scramble-root', words, lang, level, category);
  }
}

// --- VOCAB (browse, not used directly now, practice-mode replaces it) ---
async function renderVocab(level, category) {
  Router.navigate(`#/practice-mode/${level}/${category}/flashcard`);
}

// --- GRAMMAR ---
async function renderGrammar(level) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level] || !data.levels[level].grammar) return;

  const topics = data.levels[level].grammar;

  const content = `
    <h1 class="page-title">Грамматика</h1>
    <div class="accordion">
      ${topics.map((topic, i) => `
        <div class="accordion-item">
          <button class="accordion-header" aria-expanded="false">
            <span>${topic.title}</span>
            <span class="accordion-icon">&#9660;</span>
          </button>
          <div class="accordion-content">${topic.content}</div>
        </div>
      `).join('')}
    </div>
  `;

  renderShell(content, { backRoute: `#/topics/${level}` });
  initAccordion();
}

// --- QUIZ ---
async function renderQuiz(level) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level] || !data.levels[level].quiz) return;

  const content = `
    <h1 class="page-title">Квиз</h1>
    <div id="quiz-root"></div>
  `;

  renderShell(content, { backRoute: `#/topics/${level}` });
  initQuiz('quiz-root', data.levels[level].quiz, `${lang}/${level}/quiz`);
}

// --- EXERCISES ---
async function renderExercises(level) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level] || !data.levels[level].exercises) return;

  const content = `
    <h1 class="page-title">Упражнения</h1>
    <div id="exercises-root"></div>
  `;

  renderShell(content, { backRoute: `#/topics/${level}` });
  initFillBlank('exercises-root', data.levels[level].exercises);
}

// --- READING ---
async function renderReading(level) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level] || !data.levels[level].reading) return;

  const stories = data.levels[level].reading;

  const content = `
    <h1 class="page-title">Чтение</h1>
    <div class="reading-grid">
      ${stories.map((story, i) => `
        <div class="reading-card" data-story="${i}">
          <h3>${story.title}</h3>
          <div class="reading-meta">
            ${story.readingTime ? `<span>${story.readingTime}</span>` : ''}
            ${story.difficulty ? `<span>${story.difficulty}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  renderShell(content, { backRoute: `#/topics/${level}` });

  app.querySelectorAll('.reading-card').forEach(card => {
    card.addEventListener('click', () => {
      const story = stories[parseInt(card.dataset.story)];
      showReadingModal(story, lang);
    });
  });
}

function showReadingModal(story, lang) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close">&times;</button>
      <h2>${escapeHTML(story.title)}</h2>
      ${isSpeechSupported() ? `<button class="btn btn-secondary btn-sm audio-read-btn">&#128264; Прослушать</button>` : ''}
      <div class="reading-text">${escapeHTML(story.text)}</div>
      <button class="btn btn-secondary btn-sm toggle-translation">Показать перевод</button>
      <div class="reading-translation hidden">${escapeHTML(story.translation)}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const toggleBtn = overlay.querySelector('.toggle-translation');
  const translationDiv = overlay.querySelector('.reading-translation');
  toggleBtn.addEventListener('click', () => {
    translationDiv.classList.toggle('hidden');
    toggleBtn.textContent = translationDiv.classList.contains('hidden') ? 'Показать перевод' : 'Скрыть перевод';
  });

  const audioBtn = overlay.querySelector('.audio-read-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => speak(story.text, lang, 0.85));
  }
}

// --- CONJUGATION ---
async function renderConjugation(level) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level] || !data.levels[level].conjugation) return;

  const content = `
    <h1 class="page-title">Спряжение</h1>
    <div id="conjugation-root"></div>
  `;

  renderShell(content, { backRoute: `#/topics/${level}` });
  const pronouns = data.conjugationPronouns || ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
  initConjugation('conjugation-root', data.levels[level].conjugation, pronouns);
}

// --- DECLENSION TRAINER ---
async function renderDeclension(level) {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data || !data.levels[level] || !data.levels[level].declension) return;

  const content = `
    <h1 class="page-title">Тренажёр падежей</h1>
    <div id="declension-root"></div>
  `;

  renderShell(content, { backRoute: `#/topics/${level}` });
  initDeclensionTrainer('declension-root', data.levels[level].declension);
}

function initDeclensionTrainer(containerId, items) {
  const container = document.getElementById(containerId);
  let correct = 0, incorrect = 0;

  function next() {
    const item = items[Math.floor(Math.random() * items.length)];
    const caseIndex = Math.floor(Math.random() * item.forms.length);
    const caseInfo = item.forms[caseIndex];

    container.innerHTML = `
      <div class="conjugation-container">
        <div class="conjugation-prompt">
          <div class="conjugation-verb">${escapeHTML(item.word)}</div>
          <div class="conjugation-pronoun">${escapeHTML(caseInfo.caseName)}</div>
          ${caseInfo.hint ? `<div class="fill-blank-hint">${escapeHTML(caseInfo.hint)}</div>` : ''}
        </div>
        <input type="text" class="conjugation-input" id="decl-input" autocomplete="off" placeholder="...">
        <div class="conjugation-stats">
          <span class="correct">Правильно: ${correct}</span>
          <span class="incorrect">Ошибок: ${incorrect}</span>
        </div>
        <div class="quiz-feedback hidden" id="feedback"></div>
      </div>
    `;

    const input = container.querySelector('#decl-input');
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const answer = input.value.trim().toLowerCase();
      const correctAnswers = Array.isArray(caseInfo.answer) ? caseInfo.answer : [caseInfo.answer];
      const isCorrect = correctAnswers.some(a => answer === a.toLowerCase());

      if (isCorrect) correct++;
      else incorrect++;

      const feedback = container.querySelector('#feedback');
      feedback.classList.remove('hidden');
      feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
      feedback.innerHTML = isCorrect ? 'Правильно!' : `Правильный ответ: <strong>${escapeHTML(correctAnswers[0])}</strong>`;
      input.disabled = true;
      input.classList.add(isCorrect ? 'correct' : 'incorrect');

      setTimeout(next, 1500);
    });
  }
  next();
}

// --- REVIEW (SRS) ---
async function renderReview() {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data) return;

  const dueWords = Store.getDueWords(lang);

  if (dueWords.length === 0) {
    const content = `
      <div class="empty-state">
        <div class="empty-icon">&#9989;</div>
        <p>Все слова повторены! Отличная работа.</p>
        <button class="btn btn-primary mt-2" data-nav="#/dashboard">На главную</button>
      </div>
    `;
    renderShell(content, { backRoute: '#/dashboard' });
    return;
  }

  // Build review list with full word data
  const reviewWords = [];
  for (const due of dueWords) {
    const levelData = data.levels[due.level];
    if (!levelData || !levelData.vocabulary || !levelData.vocabulary[due.category]) continue;
    const wordObj = levelData.vocabulary[due.category].find(w => w.front === due.word);
    if (wordObj) {
      reviewWords.push({ ...wordObj, level: due.level, category: due.category, srs: due.srs });
    }
  }

  if (reviewWords.length === 0) {
    renderShell(`<div class="empty-state"><p>Нет слов для повторения</p></div>`, { backRoute: '#/dashboard' });
    return;
  }

  const content = `
    <h1 class="page-title">&#128257; Повторение</h1>
    <p class="page-subtitle">${reviewWords.length} ${pluralize(reviewWords.length, 'слово', 'слова', 'слов')} на сегодня</p>
    <div id="review-root"></div>
  `;

  renderShell(content, { backRoute: '#/dashboard' });
  initReviewSession('review-root', reviewWords, lang);
}

// --- DAILY SESSION ---
async function renderDailySession() {
  const lang = Store.getSelectedLanguage();
  const data = await loadLanguageData(lang);
  if (!data) return;

  // Build session: due words + new words
  const dueWords = Store.getDueWords(lang);
  const sessionItems = [];

  // Add due review words (up to 10)
  for (const due of dueWords.slice(0, 10)) {
    const levelData = data.levels[due.level];
    if (!levelData?.vocabulary?.[due.category]) continue;
    const wordObj = levelData.vocabulary[due.category].find(w => w.front === due.word);
    if (wordObj) {
      sessionItems.push({ type: 'review', word: wordObj, level: due.level, category: due.category });
    }
  }

  // Add new words (from first available level/category that has unlearned words)
  const newWordsNeeded = Math.max(5, 15 - sessionItems.length);
  outer:
  for (const [lvlName, lvlData] of Object.entries(data.levels)) {
    if (!lvlData.vocabulary) continue;
    for (const [catName, words] of Object.entries(lvlData.vocabulary)) {
      for (const word of words) {
        const srs = Store.getWordSRS(lang, lvlName, catName, word.front);
        if (srs.timesCorrect === 0 && srs.timesIncorrect === 0 && srs.lastReview === null) {
          sessionItems.push({ type: 'new', word, level: lvlName, category: catName });
          if (sessionItems.length >= 15) break outer;
        }
      }
    }
  }

  if (sessionItems.length === 0) {
    const content = `
      <div class="empty-state">
        <div class="empty-icon">&#127881;</div>
        <p>Все слова на сегодня изучены! Возвращайтесь завтра.</p>
        <button class="btn btn-primary mt-2" data-nav="#/dashboard">На главную</button>
      </div>
    `;
    renderShell(content, { backRoute: '#/dashboard' });
    return;
  }

  // Shuffle
  shuffleArray(sessionItems);

  const content = `
    <h1 class="page-title">&#9889; Дневная сессия</h1>
    <p class="page-subtitle">${sessionItems.length} слов: повторение + новые</p>
    <div id="session-root"></div>
  `;

  renderShell(content, { backRoute: '#/dashboard' });
  initReviewSession('session-root', sessionItems.map(i => ({
    ...i.word, level: i.level, category: i.category, isNew: i.type === 'new'
  })), lang, true);
}

// --- ACHIEVEMENTS ---
function renderAchievements() {
  const achievements = Store.getAchievements();

  const content = `
    <h1 class="page-title">&#127942; Достижения</h1>
    <p class="page-subtitle">${achievements.filter(a => a.unlocked).length} из ${achievements.length} открыто</p>
    <div class="achievements-grid">
      ${achievements.map(a => `
        <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${a.icon}</div>
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
      `).join('')}
    </div>
  `;

  renderShell(content, { backRoute: '#/dashboard' });
}

// --- SETTINGS ---
function renderSettings() {
  const state = Store.getState();

  const content = `
    <h1 class="page-title">&#9881; Настройки</h1>

    <div class="settings-section">
      <h3>Обучение</h3>
      <div class="settings-row">
        <label>Дневная цель (слов)</label>
        <input type="number" id="daily-goal-input" value="${state.settings.dailyGoal}" min="5" max="100" step="5">
      </div>
    </div>

    <div class="settings-section">
      <h3>Данные</h3>
      <div class="btn-group">
        <button class="btn btn-secondary btn-sm" id="export-btn">Экспорт прогресса</button>
        <button class="btn btn-secondary btn-sm" id="import-btn">Импорт прогресса</button>
      </div>
      <div class="mt-2 btn-group">
        <button class="btn btn-danger btn-sm" id="reset-btn">Сбросить весь прогресс</button>
      </div>
    </div>

    <div class="settings-section">
      <h3>Статистика</h3>
      <div class="settings-row"><label>Всего XP</label><span>${state.stats.xp}</span></div>
      <div class="settings-row"><label>Слов изучено</label><span>${state.stats.totalWordsLearned}</span></div>
      <div class="settings-row"><label>Квизов пройдено</label><span>${state.stats.totalQuizzesTaken}</span></div>
      <div class="settings-row"><label>Повторений SRS</label><span>${state.stats.totalReviews}</span></div>
      <div class="settings-row"><label>Текущий streak</label><span>${state.stats.streak} дней</span></div>
    </div>
  `;

  renderShell(content, { backRoute: '#/dashboard' });

  // Daily goal
  document.getElementById('daily-goal-input')?.addEventListener('change', (e) => {
    Store.setDailyGoal(parseInt(e.target.value) || 20);
    showToast('&#9989;', 'Сохранено', 'Дневная цель обновлена');
  });

  // Export
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const blob = new Blob([Store.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'petit-pas-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  document.getElementById('import-btn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (Store.importData(reader.result)) {
          showToast('&#9989;', 'Импорт', 'Прогресс успешно импортирован');
          Router.navigate('#/dashboard');
        } else {
          showToast('&#10060;', 'Ошибка', 'Не удалось импортировать файл');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });

  // Reset
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (confirm('Вы уверены? Весь прогресс будет удалён навсегда.')) {
      Store.resetData();
      showToast('&#128465;', 'Сброс', 'Прогресс сброшен');
      Router.navigate('#/');
    }
  });
}

// ============ INTERACTIVE COMPONENTS ============

// --- ACCORDION ---
function initAccordion() {
  const items = app.querySelectorAll('.accordion-item');
  items.forEach(item => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      items.forEach(i => {
        i.classList.remove('active');
        i.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
      });
      if (!isActive) {
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// --- FLASHCARD WITH SRS ---
function initFlashcardSRS(containerId, words, lang, level, category) {
  const container = document.getElementById(containerId);
  let currentIndex = 0;
  let isFlipped = false;
  let shuffledWords = [...words];

  function renderCard() {
    if (currentIndex >= shuffledWords.length) {
      container.innerHTML = `
        <div class="session-complete">
          <div class="session-complete-icon">&#127881;</div>
          <h2>Набор пройден!</h2>
          <p class="text-muted">Вы прошли все ${shuffledWords.length} слов</p>
          <div class="btn-group">
            <button class="btn btn-primary" id="restart-btn">Ещё раз</button>
            <button class="btn btn-secondary" data-nav="#/topics/${level}">Назад</button>
          </div>
        </div>
      `;
      container.querySelector('#restart-btn')?.addEventListener('click', () => {
        currentIndex = 0;
        isFlipped = false;
        renderCard();
      });
      app.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => Router.navigate(el.dataset.nav));
      });
      return;
    }

    const word = shuffledWords[currentIndex];
    const srs = Store.getWordSRS(lang, level, category, word.front);
    isFlipped = false;

    container.innerHTML = `
      <div class="flashcard-wrapper">
        <div class="flashcard-progress-text">${currentIndex + 1} / ${shuffledWords.length}</div>
        <div class="srs-info">
          <div class="srs-boxes">
            ${SRS_INTERVALS.map((_, i) => `<div class="srs-box ${i < srs.box ? 'filled' : ''} ${i === srs.box ? 'current' : ''}"></div>`).join('')}
          </div>
          <span>Уровень ${srs.box + 1}</span>
        </div>
        <div class="flashcard-container" id="fc-flip">
          <div class="flashcard">
            <div class="flashcard-front">
              <div class="flashcard-word">${escapeHTML(word.front)}</div>
              ${word.frontHint ? `<div class="flashcard-hint">${escapeHTML(word.frontHint)}</div>` : ''}
              ${isSpeechSupported() ? `<button class="audio-btn" id="audio-front" title="Прослушать">&#128264;</button>` : ''}
            </div>
            <div class="flashcard-back">
              <div class="flashcard-word">${escapeHTML(word.back)}</div>
              ${word.backHint ? `<div class="flashcard-hint">${escapeHTML(word.backHint)}</div>` : ''}
              ${word.example ? `<div class="flashcard-example">${escapeHTML(word.example)}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="srs-buttons" id="srs-btns" style="display:none">
          <button class="srs-btn srs-btn-again" id="srs-again">&#10060; Снова</button>
          <button class="srs-btn srs-btn-hard" id="srs-hard">&#128528; Трудно</button>
          <button class="srs-btn srs-btn-good" id="srs-good">&#9989; Хорошо</button>
          <button class="srs-btn srs-btn-easy" id="srs-easy">&#128171; Легко</button>
        </div>
        <div class="flashcard-controls">
          <button class="flashcard-btn" id="fc-prev" ${currentIndex === 0 ? 'disabled' : ''}>&#8592; Назад</button>
          <button class="flashcard-btn" id="fc-shuffle">&#128256; Перемешать</button>
          <button class="flashcard-btn" id="fc-skip">Пропустить &#8594;</button>
        </div>
      </div>
    `;

    const flipArea = container.querySelector('#fc-flip');
    const flashcardEl = flipArea.querySelector('.flashcard');
    const srsBtns = container.querySelector('#srs-btns');

    const doFlip = (e) => {
      if (e && e.target.closest('.audio-btn')) return;
      isFlipped = !isFlipped;
      flashcardEl.classList.toggle('flipped', isFlipped);
      if (isFlipped) srsBtns.style.display = 'flex';
    };

    flipArea.addEventListener('click', doFlip);

    container.querySelector('#audio-front')?.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(word.front, lang);
    });

    ['again', 'hard', 'good', 'easy'].forEach(quality => {
      container.querySelector(`#srs-${quality}`)?.addEventListener('click', () => {
        Store.reviewWord(lang, level, category, word.front, quality);
        currentIndex++;
        renderCard();
      });
    });

    container.querySelector('#fc-prev')?.addEventListener('click', () => {
      if (currentIndex > 0) { currentIndex--; renderCard(); }
    });

    container.querySelector('#fc-shuffle')?.addEventListener('click', () => {
      shuffleArray(shuffledWords);
      currentIndex = 0;
      renderCard();
    });

    container.querySelector('#fc-skip')?.addEventListener('click', () => {
      currentIndex++;
      renderCard();
    });

    // Keyboard (uses global listener cleanup)
    // 1=Again, 2=Hard, 3=Good, 4=Easy, Space/Enter=Flip, Arrow keys=nav
    const keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doFlip(); }
      if (isFlipped && ['1','2','3','4'].includes(e.key)) {
        const qualities = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
        Store.reviewWord(lang, level, category, shuffledWords[currentIndex].front, qualities[e.key]);
        currentIndex++;
        renderCard();
      }
      if (e.key === 'ArrowRight') {
        if (isFlipped) {
          Store.reviewWord(lang, level, category, shuffledWords[currentIndex].front, 'good');
          currentIndex++;
          renderCard();
        } else { currentIndex++; renderCard(); }
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) { currentIndex--; renderCard(); }
    };
    addGlobalListener(document, 'keydown', keyHandler);
  }

  renderCard();
}

// --- TYPE MODE ---
function initTypeMode(containerId, words, lang, level, category) {
  const container = document.getElementById(containerId);
  let index = 0;
  let score = 0;
  const shuffled = shuffleArray([...words]);

  function render() {
    if (index >= shuffled.length) {
      container.innerHTML = `
        <div class="session-complete">
          <div class="session-complete-icon">&#127881;</div>
          <h2>${score} / ${shuffled.length}</h2>
          <p class="text-muted">${Math.round(score / shuffled.length * 100)}% правильно</p>
          <button class="btn btn-primary" id="restart-btn">Ещё раз</button>
        </div>
      `;
      container.querySelector('#restart-btn').addEventListener('click', () => {
        index = 0; score = 0;
        shuffleArray(shuffled);
        render();
      });
      return;
    }

    const word = shuffled[index];
    container.innerHTML = `
      <div class="type-answer">
        <div class="flashcard-progress-text">${index + 1} / ${shuffled.length} | Счёт: ${score}</div>
        <div class="type-prompt">${escapeHTML(word.back)}</div>
        <p class="text-dim" style="font-size:0.85rem">Напишите перевод на изучаемом языке</p>
        <input type="text" class="type-input" id="type-input" autocomplete="off" autofocus>
        <div class="quiz-feedback hidden" id="feedback"></div>
        <div class="btn-group">
          <button class="btn btn-primary" id="check-btn">Проверить</button>
          <button class="btn btn-secondary" id="skip-btn">Пропустить</button>
        </div>
      </div>
    `;

    const input = container.querySelector('#type-input');
    const feedback = container.querySelector('#feedback');
    const checkBtn = container.querySelector('#check-btn');
    let answered = false;

    function check() {
      if (answered) { index++; render(); return; }
      const answer = input.value.trim().toLowerCase();
      const correct = word.front.toLowerCase();

      answered = true;
      feedback.classList.remove('hidden');

      if (answer === correct) {
        score++;
        input.classList.add('correct');
        feedback.className = 'quiz-feedback correct';
        feedback.textContent = 'Правильно!';
        Store.reviewWord(lang, level, category, word.front, true);
      } else {
        input.classList.add('incorrect');
        feedback.className = 'quiz-feedback incorrect';
        feedback.innerHTML = `Правильный ответ: <strong>${escapeHTML(word.front)}</strong>`;
        Store.reviewWord(lang, level, category, word.front, false);
      }
      checkBtn.textContent = 'Далее →';
    }

    checkBtn.addEventListener('click', check);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    container.querySelector('#skip-btn').addEventListener('click', () => { index++; render(); });
    input.focus();
  }
  render();
}

// --- CHOOSE MODE (Multiple Choice) ---
function initChooseMode(containerId, words, lang, level, category) {
  const container = document.getElementById(containerId);
  let index = 0;
  let score = 0;
  const shuffled = shuffleArray([...words]);

  function render() {
    if (index >= shuffled.length) {
      container.innerHTML = `
        <div class="session-complete">
          <div class="session-complete-icon">&#127881;</div>
          <h2>${score} / ${shuffled.length}</h2>
          <p class="text-muted">${Math.round(score / shuffled.length * 100)}% правильно</p>
          <button class="btn btn-primary" id="restart-btn">Ещё раз</button>
        </div>
      `;
      container.querySelector('#restart-btn').addEventListener('click', () => {
        index = 0; score = 0;
        shuffleArray(shuffled);
        render();
      });
      return;
    }

    const word = shuffled[index];
    // Generate 3 wrong options
    const otherWords = words.filter(w => w.front !== word.front);
    const wrongOptions = shuffleArray([...otherWords]).slice(0, 3).map(w => w.front);
    const options = shuffleArray([word.front, ...wrongOptions]);

    container.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-progress">
          <span>${index + 1} / ${shuffled.length}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${(index / shuffled.length) * 100}%"></div>
          </div>
          <span>Счёт: ${score}</span>
        </div>
        <div class="quiz-question">Выберите перевод: <strong>${escapeHTML(word.back)}</strong></div>
        <div class="quiz-options">
          ${options.map(opt => `<button class="quiz-option" data-answer="${escapeHTML(opt)}">${escapeHTML(opt)}</button>`).join('')}
        </div>
        <div class="quiz-feedback hidden" id="feedback"></div>
      </div>
    `;

    const feedback = container.querySelector('#feedback');
    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.dataset.answer;
        const isCorrect = selected === word.front;

        container.querySelectorAll('.quiz-option').forEach(b => {
          b.disabled = true;
          if (b.dataset.answer === word.front) b.classList.add('correct');
          else if (b === btn && !isCorrect) b.classList.add('incorrect');
        });

        feedback.classList.remove('hidden');
        if (isCorrect) {
          score++;
          feedback.className = 'quiz-feedback correct';
          feedback.textContent = 'Правильно!';
          Store.reviewWord(lang, level, category, word.front, true);
        } else {
          feedback.className = 'quiz-feedback incorrect';
          feedback.innerHTML = `Правильный ответ: <strong>${escapeHTML(word.front)}</strong>`;
          Store.reviewWord(lang, level, category, word.front, false);
        }

        setTimeout(() => { index++; render(); }, 1200);
      });
    });
  }
  render();
}

// --- SCRAMBLE MODE ---
function initScrambleMode(containerId, words, lang, level, category) {
  const container = document.getElementById(containerId);
  let index = 0;
  let score = 0;
  const shuffled = shuffleArray([...words]);

  function render() {
    if (index >= shuffled.length) {
      container.innerHTML = `
        <div class="session-complete">
          <div class="session-complete-icon">&#127881;</div>
          <h2>${score} / ${shuffled.length}</h2>
          <p class="text-muted">${Math.round(score / shuffled.length * 100)}% правильно</p>
          <button class="btn btn-primary" id="restart-btn">Ещё раз</button>
        </div>
      `;
      container.querySelector('#restart-btn').addEventListener('click', () => {
        index = 0; score = 0;
        shuffleArray(shuffled);
        render();
      });
      return;
    }

    const word = shuffled[index];
    const letters = shuffleArray(word.front.split(''));
    let selected = [];
    let available = letters.map((l, i) => ({ letter: l, id: i, used: false }));

    function renderScramble() {
      container.innerHTML = `
        <div class="type-answer">
          <div class="flashcard-progress-text">${index + 1} / ${shuffled.length} | Счёт: ${score}</div>
          <div class="type-prompt">${escapeHTML(word.back)}</div>
          <p class="text-dim" style="font-size:0.85rem">Соберите слово из букв</p>
          <div class="scramble-answer" id="answer-area">
            ${selected.map((s, i) => `<span class="scramble-answer-tile" data-idx="${i}">${escapeHTML(s.letter)}</span>`).join('')}
            ${selected.length === 0 ? '<span class="text-dim" style="padding:0.5rem">нажмите на буквы ниже</span>' : ''}
          </div>
          <div class="scramble-tiles">
            ${available.map(a => `<span class="scramble-tile ${a.used ? 'used' : ''}" data-id="${a.id}">${escapeHTML(a.letter)}</span>`).join('')}
          </div>
          <div class="quiz-feedback hidden" id="feedback"></div>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" id="clear-btn">Очистить</button>
            <button class="btn btn-secondary btn-sm" id="skip-btn">Пропустить</button>
          </div>
        </div>
      `;

      // Click available tile
      container.querySelectorAll('.scramble-tile:not(.used)').forEach(tile => {
        tile.addEventListener('click', () => {
          const id = parseInt(tile.dataset.id);
          const item = available.find(a => a.id === id);
          if (item) {
            item.used = true;
            selected.push(item);
            renderScramble();

            // Check if complete
            if (selected.length === available.length) {
              const answer = selected.map(s => s.letter).join('');
              const feedback = container.querySelector('#feedback');
              feedback.classList.remove('hidden');

              if (answer.toLowerCase() === word.front.toLowerCase()) {
                score++;
                feedback.className = 'quiz-feedback correct';
                feedback.textContent = 'Правильно!';
                Store.reviewWord(lang, level, category, word.front, true);
              } else {
                feedback.className = 'quiz-feedback incorrect';
                feedback.innerHTML = `Правильный ответ: <strong>${escapeHTML(word.front)}</strong>`;
                Store.reviewWord(lang, level, category, word.front, false);
              }
              setTimeout(() => { index++; render(); }, 1500);
            }
          }
        });
      });

      // Click answer tile to remove
      container.querySelectorAll('.scramble-answer-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          const idx = parseInt(tile.dataset.idx);
          const item = selected[idx];
          if (item) {
            item.used = false;
            selected.splice(idx, 1);
            renderScramble();
          }
        });
      });

      container.querySelector('#clear-btn')?.addEventListener('click', () => {
        selected = [];
        available.forEach(a => a.used = false);
        renderScramble();
      });

      container.querySelector('#skip-btn')?.addEventListener('click', () => {
        index++;
        render();
      });
    }

    renderScramble();
  }
  render();
}

// --- QUIZ COMPONENT ---
function initQuiz(containerId, questions, path) {
  const container = document.getElementById(containerId);
  let index = 0;
  let score = 0;
  let answered = false;

  function render() {
    if (index >= questions.length) {
      const percentage = Math.round((score / questions.length) * 100);
      let message = '';
      if (percentage >= 90) message = 'Отлично! Превосходный результат!';
      else if (percentage >= 70) message = 'Хорошо! Продолжайте в том же духе!';
      else if (percentage >= 50) message = 'Неплохо, но есть над чем поработать.';
      else message = 'Рекомендуем повторить материал.';

      Store.saveQuizResult(path, score, questions.length);
      const xpEarned = score * 10 + (score === questions.length ? 50 : 0);

      container.innerHTML = `
        <div class="quiz-results">
          <div class="quiz-score">${score} / ${questions.length}</div>
          <div class="quiz-message">${message}</div>
          <div class="xp-earned">+${xpEarned} XP</div>
          <button class="btn btn-primary" id="restart-btn">Пройти ещё раз</button>
        </div>
      `;
      container.querySelector('#restart-btn').addEventListener('click', () => {
        index = 0; score = 0; answered = false; render();
      });
      return;
    }

    const q = questions[index];
    answered = false;

    container.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-progress">
          <span>Вопрос ${index + 1} из ${questions.length}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${(index / questions.length) * 100}%"></div>
          </div>
          <span>Счёт: ${score}</span>
        </div>
        <div class="quiz-question">${escapeHTML(q.question)}</div>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `<button class="quiz-option" data-index="${i}">${escapeHTML(opt)}</button>`).join('')}
        </div>
        <div class="quiz-feedback hidden" id="feedback"></div>
        <button class="quiz-next-btn hidden" id="next-btn">${index === questions.length - 1 ? 'Результаты' : 'Далее →'}</button>
      </div>
    `;

    const feedback = container.querySelector('#feedback');
    const nextBtn = container.querySelector('#next-btn');

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const selected = parseInt(btn.dataset.index);
        const isCorrect = selected === q.correct;
        if (isCorrect) score++;

        container.querySelectorAll('.quiz-option').forEach((b, i) => {
          b.disabled = true;
          if (i === q.correct) b.classList.add('correct');
          else if (i === selected && !isCorrect) b.classList.add('incorrect');
        });

        feedback.classList.remove('hidden');
        feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.textContent = isCorrect ? 'Правильно!' : `Неправильно. ${q.explanation || ''}`;  // textContent is safe
        nextBtn.classList.remove('hidden');
      });
    });

    nextBtn.addEventListener('click', () => { index++; render(); });
  }
  render();
}

// --- FILL-IN-BLANK ---
function initFillBlank(containerId, exercises) {
  const container = document.getElementById(containerId);
  let index = 0;
  let score = 0;

  function render() {
    if (index >= exercises.length) {
      container.innerHTML = `
        <div class="quiz-results">
          <div class="quiz-score">${score} / ${exercises.length}</div>
          <div class="quiz-message">${Math.round(score / exercises.length * 100)}% правильных ответов</div>
          <button class="btn btn-primary" id="restart-btn">Пройти ещё раз</button>
        </div>
      `;
      container.querySelector('#restart-btn').addEventListener('click', () => {
        index = 0; score = 0; render();
      });
      return;
    }

    const ex = exercises[index];
    const sentenceHTML = ex.sentence.replace('_____',
      '<input type="text" class="fill-blank-input" id="answer-input" autocomplete="off">');

    container.innerHTML = `
      <div class="fill-blank-container">
        <div class="quiz-progress">
          <span>${index + 1} / ${exercises.length}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${(index / exercises.length) * 100}%"></div>
          </div>
          <span>Счёт: ${score}</span>
        </div>
        <div class="fill-blank-sentence">${sentenceHTML}</div>
        ${ex.hint ? `<div class="fill-blank-hint">Подсказка: ${ex.hint}</div>` : ''}
        <div class="fill-blank-controls">
          <button class="btn btn-primary" id="check-btn">Проверить</button>
          <button class="btn btn-secondary" id="skip-btn">Пропустить</button>
        </div>
        <div class="quiz-feedback hidden" id="feedback"></div>
      </div>
    `;

    const input = container.querySelector('#answer-input');
    const feedback = container.querySelector('#feedback');
    let answered = false;

    function check() {
      if (answered) { index++; render(); return; }
      answered = true;
      const val = input.value.trim();
      const correctAnswers = Array.isArray(ex.answer) ? ex.answer : [ex.answer];
      const isCorrect = correctAnswers.some(a => val.toLowerCase() === a.toLowerCase());

      if (isCorrect) {
        score++;
        input.classList.add('correct');
        feedback.className = 'quiz-feedback correct';
        feedback.textContent = 'Правильно!';
      } else {
        input.classList.add('incorrect');
        feedback.className = 'quiz-feedback incorrect';
        feedback.innerHTML = `Правильный ответ: <strong>${escapeHTML(correctAnswers[0])}</strong>`;
      }
      feedback.classList.remove('hidden');
      input.disabled = true;

      const controls = container.querySelector('.fill-blank-controls');
      controls.innerHTML = '<button class="btn btn-primary" id="next-btn">Далее →</button>';
      controls.querySelector('#next-btn').addEventListener('click', () => { index++; render(); });
    }

    container.querySelector('#check-btn').addEventListener('click', check);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    container.querySelector('#skip-btn').addEventListener('click', () => { index++; render(); });
    input.focus();
  }
  render();
}

// --- CONJUGATION ---
function initConjugation(containerId, verbs, pronouns) {
  const container = document.getElementById(containerId);
  pronouns = pronouns || ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
  let correct = 0, incorrect = 0;

  function next() {
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const pronounIndex = Math.floor(Math.random() * pronouns.length);
    const pronoun = pronouns[pronounIndex];

    container.innerHTML = `
      <div class="conjugation-container">
        <div class="conjugation-prompt">
          <div class="conjugation-verb">${escapeHTML(verb.infinitive)}</div>
          <div class="conjugation-pronoun">${escapeHTML(pronoun)}</div>
        </div>
        <input type="text" class="conjugation-input" id="conj-input" autocomplete="off" placeholder="...">
        <div class="conjugation-stats">
          <span class="correct">Правильно: ${correct}</span>
          <span class="incorrect">Ошибок: ${incorrect}</span>
        </div>
        <div class="quiz-feedback hidden" id="feedback"></div>
      </div>
    `;

    const input = container.querySelector('#conj-input');
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const answer = input.value.trim().toLowerCase();
      const correctAnswer = verb.conjugations[pronounIndex].toLowerCase();
      const isCorrect = answer === correctAnswer;

      if (isCorrect) correct++;
      else incorrect++;

      const feedback = container.querySelector('#feedback');
      feedback.classList.remove('hidden');
      feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
      feedback.innerHTML = isCorrect ? 'Правильно!' : `Правильный ответ: <strong>${escapeHTML(verb.conjugations[pronounIndex])}</strong>`;
      input.disabled = true;
      input.classList.add(isCorrect ? 'correct' : 'incorrect');

      setTimeout(next, 1500);
    });
  }
  next();
}

// --- REVIEW SESSION ---
function initReviewSession(containerId, words, lang, isSession = false) {
  const container = document.getElementById(containerId);
  let index = 0;
  let correctCount = 0;
  let isFlipped = false;

  function render() {
    if (index >= words.length) {
      if (isSession) Store.completeSession();

      container.innerHTML = `
        <div class="session-complete">
          <div class="session-complete-icon">&#127881;</div>
          <h2>Сессия завершена!</h2>
          <div class="session-stats-grid">
            <div class="stat-card">
              <div class="stat-value">${words.length}</div>
              <div class="stat-label">Слов</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${correctCount}</div>
              <div class="stat-label">Знал</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${words.length - correctCount}</div>
              <div class="stat-label">Учить</div>
            </div>
          </div>
          <div class="xp-earned">+${correctCount * 5 + (isSession ? 30 : 0)} XP</div>
          <button class="btn btn-primary" data-nav="#/dashboard">На главную</button>
        </div>
      `;
      app.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => Router.navigate(el.dataset.nav));
      });
      return;
    }

    const word = words[index];
    isFlipped = false;

    container.innerHTML = `
      <div class="flashcard-wrapper">
        <div class="session-progress">
          <span class="session-progress-text">${index + 1} / ${words.length}</span>
          <div class="session-bar">
            <div class="session-bar-fill" style="width: ${(index / words.length) * 100}%"></div>
          </div>
          ${word.isNew ? '<span class="action-badge">новое</span>' : ''}
        </div>
        <div class="flashcard-container" id="fc-flip">
          <div class="flashcard">
            <div class="flashcard-front">
              <div class="flashcard-word">${escapeHTML(word.front)}</div>
              ${word.frontHint ? `<div class="flashcard-hint">${escapeHTML(word.frontHint)}</div>` : ''}
              ${isSpeechSupported() ? '<button class="audio-btn" id="audio-btn" title="Прослушать">&#128264;</button>' : ''}
            </div>
            <div class="flashcard-back">
              <div class="flashcard-word">${escapeHTML(word.back)}</div>
              ${word.example ? `<div class="flashcard-example">${escapeHTML(word.example)}</div>` : ''}
            </div>
          </div>
        </div>
        <p class="text-dim text-center" style="font-size:0.85rem" id="flip-hint">Нажмите на карточку, чтобы увидеть ответ</p>
        <div class="srs-buttons hidden" id="srs-btns">
          <button class="srs-btn srs-btn-again" id="srs-again">&#10060; Снова</button>
          <button class="srs-btn srs-btn-hard" id="srs-hard">&#128528; Трудно</button>
          <button class="srs-btn srs-btn-good" id="srs-good">&#9989; Хорошо</button>
          <button class="srs-btn srs-btn-easy" id="srs-easy">&#128171; Легко</button>
        </div>
      </div>
    `;

    const flipArea = container.querySelector('#fc-flip');
    const flashcardEl = flipArea.querySelector('.flashcard');
    const srsBtns = container.querySelector('#srs-btns');
    const flipHint = container.querySelector('#flip-hint');

    const doFlip = (e) => {
      if (e && e.target.closest('.audio-btn')) return;
      isFlipped = !isFlipped;
      flashcardEl.classList.toggle('flipped', isFlipped);
      if (isFlipped) {
        srsBtns.classList.remove('hidden');
        flipHint.classList.add('hidden');
      } else {
        srsBtns.classList.add('hidden');
        flipHint.classList.remove('hidden');
      }
    };

    flipArea.addEventListener('click', doFlip);

    container.querySelector('#audio-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(word.front, lang);
    });

    ['again', 'hard', 'good', 'easy'].forEach(quality => {
      container.querySelector(`#srs-${quality}`)?.addEventListener('click', () => {
        if (quality !== 'again') correctCount++;
        Store.reviewWord(lang, word.level, word.category, word.front, quality);
        index++;
        render();
      });
    });

    // Keyboard: Space/Enter=flip, 1=Again, 2=Hard, 3=Good, 4=Easy
    const keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doFlip(); }
      if (isFlipped && ['1','2','3','4'].includes(e.key)) {
        const qualities = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
        const q = qualities[e.key];
        if (q !== 'again') correctCount++;
        Store.reviewWord(lang, word.level, word.category, word.front, q);
        index++; render();
      }
    };
    addGlobalListener(document, 'keydown', keyHandler);
  }
  render();
}

// ============ UTILITIES ============

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pluralize(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}

// ============ INIT ============
Store.updateStreak();
Router.init();
