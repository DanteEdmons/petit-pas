/* Dependency-free smoke tests for the SRS / gamification store. */
import { pathToFileURL } from 'node:url';

// Minimal browser shims
const mem = {};
globalThis.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(n, o) { this.type = n; Object.assign(this, o); } };

const { Store } = await import(pathToFileURL(`${process.cwd()}/app/store.js`).href);

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✓ ${msg}`); }
  else { console.log(`  ✗ ${msg}`); failures++; }
}

// Per-language streak + progress are tracked independently
Store.setSelectedLanguage('serbian');
Store.updateStreak('serbian');
Store.reviewWord('serbian', 'beginner', 'nouns', 'пас / pas', 'good');
Store.reviewWord('serbian', 'beginner', 'nouns', 'мачка / mačka', 'again');
Store.reviewWord('serbian', 'beginner', 'nouns', 'мачка / mačka', 'again');
Store.reviewWord('serbian', 'beginner', 'nouns', 'мачка / mačka', 'again');

Store.setSelectedLanguage('japanese');
Store.updateStreak('japanese');
Store.reviewWord('japanese', 'beginner', 'verbs', '食べる', 'easy');

assert(Store.getLangStreak('serbian') === 1, 'serbian streak initialized to 1');
assert(Store.getLangStreak('japanese') === 1, 'japanese streak tracked separately');
assert(Store.getTodayProgress('serbian') === 4, 'serbian daily progress = 4 reviews');
assert(Store.getTodayProgress('japanese') === 1, 'japanese daily progress = 1 review');
assert(Store.getLeechWords('serbian').some(l => l.word === 'мачка / mačka'),
  'repeatedly-wrong word flagged as a leech');
assert(Store.getLeechWords('serbian').length === 1, 'easy/good words are not leeches');
assert(Store.getState().stats.xp > 0, 'XP accrues from reviews');

// A "good" review schedules the word into the future (not immediately due)
const due = Store.getDueWords('serbian').map(d => d.word);
assert(!due.includes('пас / pas'), 'a known word is not due again immediately');

console.log(failures === 0 ? '\nstore.test: PASS' : `\nstore.test: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
