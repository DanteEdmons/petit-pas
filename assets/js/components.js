/* Petit Pas - Reusable Components */

// ============================================
// ACCORDION COMPONENT
// ============================================
function initAccordion() {
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');

    // Ensure aria-expanded is set initially
    if (!header.hasAttribute('aria-expanded')) {
      header.setAttribute('aria-expanded', 'false');
    }

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all items
      accordionItems.forEach(i => {
        i.classList.remove('active');
        i.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
      });

      // Open clicked item if it wasn't active
      if (!isActive) {
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
      }
    });

    // Keyboard accessibility
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });
  });
}

// ============================================
// TABS COMPONENT
// ============================================
function initTabs() {
  document.querySelectorAll('.tabs').forEach(tabContainer => {
    const buttons = tabContainer.querySelectorAll('.tab-btn');
    const panels = tabContainer.querySelectorAll('.tab-panel');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;

        buttons.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const panel = tabContainer.querySelector('.tab-panel[data-tab="' + target + '"]');
        if (panel) panel.classList.add('active');
      });
    });
  });
}

// ============================================
// FLASHCARD COMPONENT
// ============================================
class Flashcard {
  constructor(containerId, words, options = {}) {
    this.container = document.getElementById(containerId);
    this.words = words;
    this.currentIndex = 0;
    this.isFlipped = false;
    this.options = {
      showProgress: true,
      enableKeyboard: true,
      onComplete: null,
      ...options
    };

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    if (this.options.enableKeyboard) {
      this.bindKeyboard();
    }
  }

  render() {
    const word = this.words[this.currentIndex];

    this.container.innerHTML = `
      <div class="flashcard-container">
        <div class="flashcard ${this.isFlipped ? 'flipped' : ''}" id="flashcard">
          <div class="flashcard-front">
            <div class="flashcard-word">${word.front}</div>
            ${word.frontHint ? `<div class="flashcard-hint">${word.frontHint}</div>` : ''}
          </div>
          <div class="flashcard-back">
            <div class="flashcard-word">${word.back}</div>
            ${word.backHint ? `<div class="flashcard-hint">${word.backHint}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="flashcard-controls">
        <button class="flashcard-btn" id="prevBtn" ${this.currentIndex === 0 ? 'disabled' : ''}>
          ← Назад
        </button>
        <button class="flashcard-btn" id="shuffleBtn">Перемешать</button>
        <button class="flashcard-btn" id="nextBtn" ${this.currentIndex === this.words.length - 1 ? 'disabled' : ''}>
          Вперёд →
        </button>
      </div>
      ${this.options.showProgress ? `
        <div class="flashcard-progress">
          ${this.currentIndex + 1} / ${this.words.length}
        </div>
      ` : ''}
    `;
  }

  bindEvents() {
    const flashcard = this.container.querySelector('#flashcard');
    const prevBtn = this.container.querySelector('#prevBtn');
    const nextBtn = this.container.querySelector('#nextBtn');
    const shuffleBtn = this.container.querySelector('#shuffleBtn');

    flashcard.addEventListener('click', () => this.flip());
    prevBtn.addEventListener('click', () => this.prev());
    nextBtn.addEventListener('click', () => this.next());
    shuffleBtn.addEventListener('click', () => this.shuffle());
  }

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.flip();
      }
    });
  }

  flip() {
    this.isFlipped = !this.isFlipped;
    const flashcard = this.container.querySelector('#flashcard');
    flashcard.classList.toggle('flipped', this.isFlipped);
  }

  next() {
    if (this.currentIndex < this.words.length - 1) {
      this.currentIndex++;
      this.isFlipped = false;
      this.render();
      this.bindEvents();
    } else if (this.options.onComplete) {
      this.options.onComplete();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.isFlipped = false;
      this.render();
      this.bindEvents();
    }
  }

  shuffle() {
    const arr = [...this.words];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    this.words = arr;
    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
    this.bindEvents();
  }
}

// ============================================
// QUIZ COMPONENT
// ============================================
class Quiz {
  constructor(containerId, questions, options = {}) {
    this.container = document.getElementById(containerId);
    this.questions = questions;
    this.currentIndex = 0;
    this.score = 0;
    this.answered = false;
    this.options = {
      showFeedback: true,
      onComplete: null,
      ...options
    };

    this.init();
  }

  init() {
    this.render();
  }

  render() {
    if (this.currentIndex >= this.questions.length) {
      this.showResults();
      return;
    }

    const question = this.questions[this.currentIndex];
    const progress = ((this.currentIndex) / this.questions.length) * 100;

    this.container.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-progress">
          <span>Вопрос ${this.currentIndex + 1} из ${this.questions.length}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${progress}%"></div>
          </div>
          <span>Счёт: ${this.score}</span>
        </div>
        <div class="quiz-question">${question.question}</div>
        <div class="quiz-options">
          ${question.options.map((opt, i) => `
            <button class="quiz-option" data-index="${i}">${opt}</button>
          `).join('')}
        </div>
        <div class="quiz-feedback" id="feedback" style="display: none;"></div>
        <button class="quiz-next-btn" id="nextBtn" style="display: none;">
          ${this.currentIndex === this.questions.length - 1 ? 'Результаты' : 'Далее →'}
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const options = this.container.querySelectorAll('.quiz-option');
    const nextBtn = this.container.querySelector('#nextBtn');

    options.forEach(opt => {
      opt.addEventListener('click', () => this.checkAnswer(parseInt(opt.dataset.index)));
    });

    nextBtn.addEventListener('click', () => {
      this.currentIndex++;
      this.answered = false;
      this.render();
    });
  }

  checkAnswer(selectedIndex) {
    if (this.answered) return;
    this.answered = true;

    const question = this.questions[this.currentIndex];
    const isCorrect = selectedIndex === question.correct;

    if (isCorrect) this.score++;

    // Update UI
    const options = this.container.querySelectorAll('.quiz-option');
    options.forEach((opt, i) => {
      opt.disabled = true;
      if (i === question.correct) {
        opt.classList.add('correct');
      } else if (i === selectedIndex && !isCorrect) {
        opt.classList.add('incorrect');
      }
    });

    // Show feedback
    if (this.options.showFeedback) {
      const feedback = this.container.querySelector('#feedback');
      feedback.style.display = 'block';
      feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
      feedback.textContent = isCorrect
        ? 'Правильно!'
        : `Неправильно. ${question.explanation || ''}`;
    }

    // Show next button
    this.container.querySelector('#nextBtn').style.display = 'block';
  }

  showResults() {
    const percentage = Math.round((this.score / this.questions.length) * 100);
    let message = '';

    if (percentage >= 90) message = 'Отлично! Превосходный результат!';
    else if (percentage >= 70) message = 'Хорошо! Продолжайте в том же духе!';
    else if (percentage >= 50) message = 'Неплохо, но есть над чем поработать.';
    else message = 'Рекомендуем повторить материал.';

    this.container.innerHTML = `
      <div class="quiz-results">
        <div class="quiz-score">${this.score} / ${this.questions.length}</div>
        <div class="quiz-message">${message}</div>
        <button class="btn btn-primary" id="restartBtn">Пройти ещё раз</button>
      </div>
    `;

    this.container.querySelector('#restartBtn').addEventListener('click', () => {
      this.currentIndex = 0;
      this.score = 0;
      this.answered = false;
      this.render();
    });

    // Save to progress
    if (typeof Progress !== 'undefined') {
      Progress.saveQuizResult(window.location.pathname, this.score, this.questions.length);
    }

    if (this.options.onComplete) {
      this.options.onComplete(this.score, this.questions.length);
    }
  }
}

// ============================================
// FILL-IN-BLANK COMPONENT
// ============================================
class FillBlank {
  constructor(containerId, exercises, options = {}) {
    this.container = document.getElementById(containerId);
    this.exercises = exercises;
    this.currentIndex = 0;
    this.score = 0;
    this.options = {
      showHint: true,
      caseSensitive: false,
      ...options
    };

    this.init();
  }

  init() {
    this.render();
  }

  render() {
    if (this.currentIndex >= this.exercises.length) {
      this.showResults();
      return;
    }

    const exercise = this.exercises[this.currentIndex];
    const sentenceWithInput = exercise.sentence.replace(
      '_____',
      `<input type="text" class="fill-blank-input" id="answerInput" autocomplete="off">`
    );

    this.container.innerHTML = `
      <div class="fill-blank-container">
        <div class="quiz-progress">
          <span>${this.currentIndex + 1} / ${this.exercises.length}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${(this.currentIndex / this.exercises.length) * 100}%"></div>
          </div>
          <span>Счёт: ${this.score}</span>
        </div>
        <div class="fill-blank-sentence">${sentenceWithInput}</div>
        ${this.options.showHint && exercise.hint ? `
          <div class="fill-blank-hint">Подсказка: ${exercise.hint}</div>
        ` : ''}
        <div class="fill-blank-controls">
          <button class="btn btn-primary" id="checkBtn">Проверить</button>
          <button class="btn btn-secondary" id="skipBtn">Пропустить</button>
        </div>
        <div class="quiz-feedback" id="feedback" style="display: none;"></div>
      </div>
    `;

    this.bindEvents();
    this.container.querySelector('#answerInput').focus();
  }

  bindEvents() {
    const input = this.container.querySelector('#answerInput');
    const checkBtn = this.container.querySelector('#checkBtn');
    const skipBtn = this.container.querySelector('#skipBtn');

    checkBtn.addEventListener('click', () => this.checkAnswer());
    skipBtn.addEventListener('click', () => this.skip());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.checkAnswer();
    });
  }

  checkAnswer() {
    const input = this.container.querySelector('#answerInput');
    const exercise = this.exercises[this.currentIndex];
    const userAnswer = input.value.trim();

    const correctAnswers = Array.isArray(exercise.answer)
      ? exercise.answer
      : [exercise.answer];

    const isCorrect = correctAnswers.some(ans =>
      this.options.caseSensitive
        ? userAnswer === ans
        : userAnswer.toLowerCase() === ans.toLowerCase()
    );

    if (isCorrect) {
      this.score++;
      input.classList.add('correct');
    } else {
      input.classList.add('incorrect');
    }

    // Show feedback
    const feedback = this.container.querySelector('#feedback');
    feedback.style.display = 'block';
    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = isCorrect
      ? 'Правильно!'
      : `Правильный ответ: <strong>${correctAnswers[0]}</strong>`;

    // Disable input
    input.disabled = true;

    // Replace buttons with next
    const controls = this.container.querySelector('.fill-blank-controls');
    controls.innerHTML = `<button class="btn btn-primary" id="nextBtn">Далее →</button>`;
    controls.querySelector('#nextBtn').addEventListener('click', () => {
      this.currentIndex++;
      this.render();
    });
  }

  skip() {
    this.currentIndex++;
    this.render();
  }

  showResults() {
    const percentage = Math.round((this.score / this.exercises.length) * 100);

    this.container.innerHTML = `
      <div class="quiz-results">
        <div class="quiz-score">${this.score} / ${this.exercises.length}</div>
        <div class="quiz-message">${percentage}% правильных ответов</div>
        <button class="btn btn-primary" id="restartBtn">Пройти ещё раз</button>
      </div>
    `;

    this.container.querySelector('#restartBtn').addEventListener('click', () => {
      this.currentIndex = 0;
      this.score = 0;
      this.render();
    });
  }
}

// ============================================
// CONJUGATION TRAINER COMPONENT
// ============================================
class ConjugationTrainer {
  constructor(containerId, verbs, options = {}) {
    this.container = document.getElementById(containerId);
    this.verbs = verbs;
    this.currentVerb = null;
    this.currentPronoun = null;
    this.correct = 0;
    this.incorrect = 0;
    this.options = {
      pronouns: ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'],
      ...options
    };

    this.init();
  }

  init() {
    this.nextQuestion();
  }

  nextQuestion() {
    // Pick random verb and pronoun
    this.currentVerb = this.verbs[Math.floor(Math.random() * this.verbs.length)];
    const pronounIndex = Math.floor(Math.random() * this.options.pronouns.length);
    this.currentPronoun = this.options.pronouns[pronounIndex];

    this.render(pronounIndex);
  }

  render(pronounIndex) {
    this.container.innerHTML = `
      <div class="conjugation-container">
        <div class="conjugation-prompt">
          <div class="conjugation-verb">${this.currentVerb.infinitive}</div>
          <div class="conjugation-pronoun">${this.currentPronoun}</div>
        </div>
        <input type="text" class="conjugation-input" id="conjugationInput" autocomplete="off" placeholder="...">
        <div class="conjugation-stats">
          <span class="correct">Правильно: ${this.correct}</span>
          <span class="incorrect">Ошибок: ${this.incorrect}</span>
        </div>
        <div class="quiz-feedback" id="feedback" style="display: none;"></div>
      </div>
    `;

    const input = this.container.querySelector('#conjugationInput');
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.checkAnswer(pronounIndex);
    });
  }

  checkAnswer(pronounIndex) {
    const input = this.container.querySelector('#conjugationInput');
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = this.currentVerb.conjugations[pronounIndex].toLowerCase();
    const isCorrect = userAnswer === correctAnswer;

    if (isCorrect) {
      this.correct++;
    } else {
      this.incorrect++;
    }

    // Show feedback
    const feedback = this.container.querySelector('#feedback');
    feedback.style.display = 'block';
    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = isCorrect
      ? 'Правильно!'
      : `Правильный ответ: <strong>${this.currentVerb.conjugations[pronounIndex]}</strong>`;

    input.disabled = true;
    input.classList.add(isCorrect ? 'correct' : 'incorrect');

    // Auto-advance after delay
    setTimeout(() => this.nextQuestion(), 1500);
  }
}

// ============================================
// AUTO-INIT ON DOM LOAD
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.accordion')) {
    initAccordion();
  }
  if (document.querySelector('.tabs')) {
    initTabs();
  }
});
