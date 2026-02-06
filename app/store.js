/* Petit Pas — State Management, SRS & Gamification */

const STORAGE_KEY = 'petitPas_v2';

// Leitner SRS intervals (in days)
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

const XP_REWARDS = {
  wordReview: 5,
  wordNew: 10,
  quizCorrect: 10,
  quizPerfect: 50,
  exerciseCorrect: 8,
  sessionComplete: 30,
  streakBonus: 15, // per streak day
};

const LEVELS = [
  { name: 'Новичок', xp: 0 },
  { name: 'Ученик', xp: 100 },
  { name: 'Практикант', xp: 300 },
  { name: 'Знаток', xp: 600 },
  { name: 'Продвинутый', xp: 1000 },
  { name: 'Эксперт', xp: 1500 },
  { name: 'Мастер', xp: 2200 },
  { name: 'Грандмастер', xp: 3000 },
  { name: 'Легенда', xp: 4000 },
  { name: 'Полиглот', xp: 5500 },
];

const ACHIEVEMENTS = [
  { id: 'first_word', name: 'Первое слово', desc: 'Выучите первое слово', icon: '📖', check: s => s.stats.totalWordsLearned >= 1 },
  { id: 'words_50', name: 'Полтинник', desc: '50 слов изучено', icon: '📚', check: s => s.stats.totalWordsLearned >= 50 },
  { id: 'words_100', name: 'Сотня', desc: '100 слов изучено', icon: '🏆', check: s => s.stats.totalWordsLearned >= 100 },
  { id: 'words_300', name: 'Словарь', desc: '300 слов изучено', icon: '📕', check: s => s.stats.totalWordsLearned >= 300 },
  { id: 'streak_3', name: 'Три дня', desc: '3 дня подряд', icon: '🔥', check: s => s.stats.streak >= 3 },
  { id: 'streak_7', name: 'Неделя', desc: '7 дней подряд', icon: '💪', check: s => s.stats.streak >= 7 },
  { id: 'streak_30', name: 'Месяц!', desc: '30 дней подряд', icon: '⭐', check: s => s.stats.streak >= 30 },
  { id: 'quiz_perfect', name: 'Идеально', desc: 'Квиз без ошибок', icon: '💯', check: s => s.stats.perfectQuizzes >= 1 },
  { id: 'quiz_10', name: 'Тестировщик', desc: '10 квизов пройдено', icon: '🎯', check: s => s.stats.totalQuizzesTaken >= 10 },
  { id: 'level_5', name: 'Эксперт', desc: 'Достигните 5 уровня', icon: '🌟', check: s => Store.getLevel(s.stats.xp).index >= 4 },
  { id: 'session_first', name: 'Первая сессия', desc: 'Завершите дневную сессию', icon: '✅', check: s => s.stats.sessionsCompleted >= 1 },
  { id: 'review_50', name: 'Повторение — мать', desc: '50 повторений SRS', icon: '🧠', check: s => s.stats.totalReviews >= 50 },
];

const Store = {
  _state: null,

  getState() {
    if (this._state) return this._state;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      this._state = JSON.parse(stored);
      // Migrate if needed
      if (!this._state.stats.xp) this._state.stats.xp = 0;
      if (!this._state.stats.perfectQuizzes) this._state.stats.perfectQuizzes = 0;
      if (!this._state.stats.sessionsCompleted) this._state.stats.sessionsCompleted = 0;
      if (!this._state.stats.totalReviews) this._state.stats.totalReviews = 0;
      if (!this._state.achievements) this._state.achievements = [];
      if (!this._state.settings) this._state.settings = { dailyGoal: 20, selectedLanguage: null };
      return this._state;
    }
    return this._initState();
  },

  _initState() {
    const state = {
      settings: {
        selectedLanguage: null,
        dailyGoal: 20, // words per day
      },
      srs: {}, // { "english:beginner:nouns:time": { box: 0, nextReview: "2025-...", ... } }
      stats: {
        xp: 0,
        totalWordsLearned: 0,
        totalQuizzesTaken: 0,
        totalCorrectAnswers: 0,
        totalReviews: 0,
        perfectQuizzes: 0,
        sessionsCompleted: 0,
        streak: 0,
        lastVisit: null,
        todayWordsReviewed: 0,
        todayDate: null,
      },
      quizResults: [], // { path, score, total, date }
      achievements: [],
      createdAt: new Date().toISOString(),
    };
    this._state = state;
    this._save();
    return state;
  },

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  },

  // --- Language ---
  getSelectedLanguage() {
    return this.getState().settings.selectedLanguage;
  },

  setSelectedLanguage(lang) {
    this.getState().settings.selectedLanguage = lang;
    this._save();
  },

  // --- Daily Goal ---
  getDailyGoal() {
    return this.getState().settings.dailyGoal;
  },

  setDailyGoal(n) {
    this.getState().settings.dailyGoal = n;
    this._save();
  },

  getTodayProgress() {
    const state = this.getState();
    const today = new Date().toISOString().slice(0, 10);
    if (state.stats.todayDate !== today) {
      state.stats.todayDate = today;
      state.stats.todayWordsReviewed = 0;
      this._save();
    }
    return state.stats.todayWordsReviewed;
  },

  // --- SRS ---
  _wordKey(lang, level, category, word) {
    return `${lang}:${level}:${category}:${word}`;
  },

  getWordSRS(lang, level, category, word) {
    const key = this._wordKey(lang, level, category, word);
    const state = this.getState();
    if (!state.srs[key]) {
      state.srs[key] = {
        box: 0,
        nextReview: new Date().toISOString(),
        timesCorrect: 0,
        timesIncorrect: 0,
        lastReview: null,
      };
      this._save();
    }
    return state.srs[key];
  },

  reviewWord(lang, level, category, word, correct) {
    const key = this._wordKey(lang, level, category, word);
    const state = this.getState();
    if (!state.srs[key]) {
      state.srs[key] = { box: 0, nextReview: new Date().toISOString(), timesCorrect: 0, timesIncorrect: 0, lastReview: null };
    }

    const srs = state.srs[key];
    const now = new Date();
    srs.lastReview = now.toISOString();

    if (correct) {
      srs.timesCorrect++;
      srs.box = Math.min(srs.box + 1, SRS_INTERVALS.length - 1);
      const isNew = srs.timesCorrect === 1 && srs.timesIncorrect === 0;
      this.addXP(isNew ? XP_REWARDS.wordNew : XP_REWARDS.wordReview);
      if (isNew) state.stats.totalWordsLearned++;
    } else {
      srs.timesIncorrect++;
      srs.box = 0;
    }

    const daysUntilNext = SRS_INTERVALS[srs.box];
    const next = new Date(now);
    next.setDate(next.getDate() + daysUntilNext);
    srs.nextReview = next.toISOString();

    state.stats.totalReviews++;
    state.stats.todayWordsReviewed++;
    this._save();
    this.checkAchievements();
  },

  getDueWords(lang) {
    const state = this.getState();
    const now = new Date();
    const due = [];
    for (const [key, srs] of Object.entries(state.srs)) {
      if (key.startsWith(lang + ':') && new Date(srs.nextReview) <= now) {
        const [, level, category, ...wordParts] = key.split(':');
        due.push({ key, level, category, word: wordParts.join(':'), srs });
      }
    }
    // Sort: lower box first (harder words first)
    due.sort((a, b) => a.srs.box - b.srs.box);
    return due;
  },

  getWordStats(lang) {
    const state = this.getState();
    let total = 0, learning = 0, mastered = 0;
    for (const [key, srs] of Object.entries(state.srs)) {
      if (!key.startsWith(lang + ':')) continue;
      total++;
      if (srs.box >= SRS_INTERVALS.length - 1) mastered++;
      else if (srs.box > 0) learning++;
    }
    return { total, learning, mastered, newCount: total - learning - mastered };
  },

  // --- XP & Levels ---
  addXP(amount) {
    const state = this.getState();
    const oldLevel = this.getLevel(state.stats.xp);
    state.stats.xp += amount;
    const newLevel = this.getLevel(state.stats.xp);
    this._save();
    if (newLevel.index > oldLevel.index) {
      return newLevel; // level up!
    }
    return null;
  },

  getLevel(xp) {
    let lvl = LEVELS[0];
    let idx = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xp) {
        lvl = LEVELS[i];
        idx = i;
        break;
      }
    }
    const nextLevel = LEVELS[idx + 1] || null;
    return {
      index: idx,
      name: lvl.name,
      xp: xp,
      currentLevelXP: lvl.xp,
      nextLevelXP: nextLevel ? nextLevel.xp : lvl.xp,
      progress: nextLevel ? (xp - lvl.xp) / (nextLevel.xp - lvl.xp) : 1,
    };
  },

  // --- Streak ---
  updateStreak() {
    const state = this.getState();
    const lastVisit = state.stats.lastVisit;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (!lastVisit) {
      state.stats.streak = 1;
    } else {
      const lastDate = lastVisit.slice(0, 10);
      if (lastDate === today) {
        // same day
      } else {
        const last = new Date(lastDate);
        const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          state.stats.streak++;
          this.addXP(XP_REWARDS.streakBonus * Math.min(state.stats.streak, 10));
        } else if (diff > 1) {
          state.stats.streak = 1;
        }
      }
    }

    state.stats.lastVisit = now.toISOString();
    state.stats.todayDate = today;
    this._save();
    this.checkAchievements();
    return state.stats.streak;
  },

  // --- Quiz Results ---
  saveQuizResult(path, score, total) {
    const state = this.getState();
    state.quizResults.push({ path, score, total, percentage: Math.round((score / total) * 100), date: new Date().toISOString() });
    state.stats.totalQuizzesTaken++;
    state.stats.totalCorrectAnswers += score;
    if (score === total) state.stats.perfectQuizzes++;
    this.addXP(score * XP_REWARDS.quizCorrect + (score === total ? XP_REWARDS.quizPerfect : 0));
    this._save();
    this.checkAchievements();
  },

  // --- Achievements ---
  checkAchievements() {
    const state = this.getState();
    const newAchievements = [];
    for (const ach of ACHIEVEMENTS) {
      if (!state.achievements.includes(ach.id) && ach.check(state)) {
        state.achievements.push(ach.id);
        newAchievements.push(ach);
      }
    }
    if (newAchievements.length > 0) {
      this._save();
      // Dispatch event for UI notification
      for (const ach of newAchievements) {
        window.dispatchEvent(new CustomEvent('achievement', { detail: ach }));
      }
    }
    return newAchievements;
  },

  getAchievements() {
    const state = this.getState();
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: state.achievements.includes(a.id),
    }));
  },

  // --- Session ---
  completeSession() {
    const state = this.getState();
    state.stats.sessionsCompleted++;
    this.addXP(XP_REWARDS.sessionComplete);
    this._save();
    this.checkAchievements();
  },

  // --- Export / Import / Reset ---
  exportData() {
    return JSON.stringify(this.getState(), null, 2);
  },

  importData(json) {
    try {
      this._state = JSON.parse(json);
      this._save();
      return true;
    } catch { return false; }
  },

  resetData() {
    localStorage.removeItem(STORAGE_KEY);
    this._state = null;
    return this._initState();
  },
};

export { Store, ACHIEVEMENTS, LEVELS, XP_REWARDS, SRS_INTERVALS };
