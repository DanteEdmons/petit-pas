/* Petit Pas - Progress Tracking (localStorage) */

const Progress = {
  STORAGE_KEY: 'petitPas_progress',

  // Initialize or get existing progress
  getProgress() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return this.initProgress();
  },

  // Initialize empty progress structure
  initProgress() {
    const progress = {
      languages: {
        english: this.initLanguageProgress(),
        french: this.initLanguageProgress(),
        japanese: this.initLanguageProgress(),
        serbian: this.initLanguageProgress()
      },
      stats: {
        totalWordsLearned: 0,
        totalQuizzesTaken: 0,
        totalCorrectAnswers: 0,
        streak: 0,
        lastVisit: null
      },
      createdAt: new Date().toISOString()
    };
    this.saveProgress(progress);
    return progress;
  },

  initLanguageProgress() {
    return {
      beginner: { vocabulary: [], grammar: [], quizzes: [], exercises: [] },
      intermediate: { vocabulary: [], grammar: [], quizzes: [], exercises: [] },
      advanced: { vocabulary: [], grammar: [], quizzes: [], exercises: [] }
    };
  },

  // Save progress to localStorage
  saveProgress(progress) {
    progress.stats.lastVisit = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
  },

  // Mark vocabulary word as learned
  markWordLearned(language, level, wordId) {
    const progress = this.getProgress();
    const levelData = progress.languages[language][level];

    if (!levelData.vocabulary.includes(wordId)) {
      levelData.vocabulary.push(wordId);
      progress.stats.totalWordsLearned++;
      this.saveProgress(progress);
    }
  },

  // Mark grammar topic as viewed
  markGrammarViewed(language, level, topicId) {
    const progress = this.getProgress();
    const levelData = progress.languages[language][level];

    if (!levelData.grammar.includes(topicId)) {
      levelData.grammar.push(topicId);
      this.saveProgress(progress);
    }
  },

  // Save quiz result
  saveQuizResult(quizPath, score, total) {
    const progress = this.getProgress();

    // Parse path to get language and level
    const pathParts = quizPath.split('/').filter(Boolean);
    const language = pathParts[0];
    const level = pathParts[1];

    if (progress.languages[language] && progress.languages[language][level]) {
      const levelData = progress.languages[language][level];

      // Store quiz result
      levelData.quizzes.push({
        path: quizPath,
        score: score,
        total: total,
        percentage: Math.round((score / total) * 100),
        date: new Date().toISOString()
      });

      // Update stats
      progress.stats.totalQuizzesTaken++;
      progress.stats.totalCorrectAnswers += score;

      this.saveProgress(progress);
    }
  },

  // Save exercise result (fill-in-blank, conjugation, etc.)
  saveExerciseResult(language, level, exerciseType, score, total) {
    const progress = this.getProgress();
    const levelData = progress.languages[language][level];

    levelData.exercises.push({
      type: exerciseType,
      score: score,
      total: total,
      date: new Date().toISOString()
    });

    this.saveProgress(progress);
  },

  // Get vocabulary progress for a level
  getVocabularyProgress(language, level, totalWords) {
    const progress = this.getProgress();
    const learned = progress.languages[language][level].vocabulary.length;
    return {
      learned: learned,
      total: totalWords,
      percentage: Math.round((learned / totalWords) * 100)
    };
  },

  // Get grammar progress for a level
  getGrammarProgress(language, level, totalTopics) {
    const progress = this.getProgress();
    const viewed = progress.languages[language][level].grammar.length;
    return {
      viewed: viewed,
      total: totalTopics,
      percentage: Math.round((viewed / totalTopics) * 100)
    };
  },

  // Get best quiz score for a path
  getBestQuizScore(language, level) {
    const progress = this.getProgress();
    const quizzes = progress.languages[language][level].quizzes;

    if (quizzes.length === 0) return null;

    return quizzes.reduce((best, quiz) =>
      quiz.percentage > best.percentage ? quiz : best
    );
  },

  // Get overall stats
  getOverallStats() {
    const progress = this.getProgress();
    return progress.stats;
  },

  // Calculate streak (consecutive days)
  updateStreak() {
    const progress = this.getProgress();
    const lastVisit = progress.stats.lastVisit;

    if (!lastVisit) {
      progress.stats.streak = 1;
    } else {
      const last = new Date(lastVisit);
      const now = new Date();
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, streak unchanged
      } else if (diffDays === 1) {
        // Next day, increment streak
        progress.stats.streak++;
      } else {
        // Streak broken
        progress.stats.streak = 1;
      }
    }

    this.saveProgress(progress);
    return progress.stats.streak;
  },

  // Clear all progress
  clearProgress() {
    localStorage.removeItem(this.STORAGE_KEY);
    return this.initProgress();
  },

  // Export progress as JSON
  exportProgress() {
    return JSON.stringify(this.getProgress(), null, 2);
  },

  // Import progress from JSON
  importProgress(jsonString) {
    try {
      const progress = JSON.parse(jsonString);
      this.saveProgress(progress);
      return true;
    } catch (e) {
      console.error('Failed to import progress:', e);
      return false;
    }
  }
};

// Update streak on page load
document.addEventListener('DOMContentLoaded', () => {
  Progress.updateStreak();
});

// Render progress dashboard if container exists
function renderProgressDashboard(containerId, language, level) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const stats = Progress.getOverallStats();
  const vocabProgress = Progress.getVocabularyProgress(language, level, 120);
  const grammarProgress = Progress.getGrammarProgress(language, level, 10);
  const bestQuiz = Progress.getBestQuizScore(language, level);

  container.innerHTML = `
    <div class="progress-dashboard">
      <div class="progress-item">
        <div class="progress-item-label">Слов изучено</div>
        <div class="progress-item-value">${vocabProgress.learned}</div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${vocabProgress.percentage}%"></div>
        </div>
      </div>
      <div class="progress-item">
        <div class="progress-item-label">Грамматика</div>
        <div class="progress-item-value">${grammarProgress.viewed} / ${grammarProgress.total}</div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${grammarProgress.percentage}%"></div>
        </div>
      </div>
      <div class="progress-item">
        <div class="progress-item-label">Лучший тест</div>
        <div class="progress-item-value">${bestQuiz ? bestQuiz.percentage + '%' : '-'}</div>
      </div>
      <div class="progress-item">
        <div class="progress-item-label">Дней подряд</div>
        <div class="progress-item-value">${stats.streak}</div>
      </div>
    </div>
  `;
}
