/* Integration test: render every route in jsdom and assert nothing throws and
   no placeholder leaks ("undefined undefined", NaN, [object Object]).
   Requires the devDependency `jsdom`. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost/#/', pretendToBeVisual: true,
});
const { window } = dom;
for (const k of ['document', 'HTMLElement', 'CustomEvent', 'Event', 'localStorage']) {
  try { globalThis[k] = window[k]; } catch { /* read-only globals */ }
}
globalThis.window = window;
globalThis.fetch = async (url) => {
  const p = `${ROOT}/${String(url).replace(/^\.?\//, '')}`;
  try {
    const body = readFileSync(p, 'utf-8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  } catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const tick = () => new Promise(r => setTimeout(r, 0));
let failures = 0;

async function go(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  await tick(); await tick(); await tick();
  const html = document.getElementById('app').innerHTML;
  if (/undefined undefined|>NaN<|\[object Object\]/.test(html)) {
    console.log(`  ✗ ${hash} — placeholder leak in output`); failures++;
  } else if (html.length < 50) {
    console.log(`  ✗ ${hash} — suspiciously empty (${html.length} chars)`); failures++;
  } else {
    console.log(`  ✓ ${hash}`);
  }
  return html;
}

const store = await import(pathToFileURL(`${ROOT}/app/store.js`).href);
store.Store.setSelectedLanguage('serbian');
await import(pathToFileURL(`${ROOT}/app/main.js`).href);
await tick(); await tick();

const routes = [
  '#/dashboard', '#/overview', '#/levels', '#/topics/beginner',
  '#/grammar/beginner', '#/grammar/beginner/0', '#/quiz/beginner',
  '#/exercises/beginner', '#/reading/beginner', '#/conjugation/beginner',
  '#/declension/beginner', '#/matching/beginner', '#/dictation/beginner',
  '#/cloze/beginner', '#/reorder/beginner',
  '#/practice-mode/beginner/nouns/flashcard', '#/mistakes', '#/review',
  '#/session', '#/achievements', '#/settings',
];
console.log('— serbian —');
for (const r of routes) await go(r);

console.log('— japanese (formerly empty beginner) —');
store.Store.setSelectedLanguage('japanese');
for (const r of ['#/topics/beginner', '#/grammar/beginner', '#/matching/beginner',
  '#/dictation/beginner', '#/cloze/beginner', '#/practice-mode/beginner/nouns/flashcard'])
  await go(r);

console.log('— french (expanded to parity) —');
store.Store.setSelectedLanguage('french');
for (const r of ['#/topics/advanced', '#/grammar/advanced', '#/grammar/advanced/0',
  '#/conjugation/beginner', '#/conjugation/advanced', '#/exercises/advanced',
  '#/reorder/beginner', '#/reorder/advanced', '#/matching/advanced'])
  await go(r);

console.log('— english (meta-wrapper normalization) —');
store.Store.setSelectedLanguage('english');
const eh = await go('#/dashboard');
if (!/Английский/.test(eh)) { console.log('  ✗ english header missing name'); failures++; }
else console.log('  ✓ english header shows name (no "undefined")');

console.log(failures === 0 ? '\nrender.test: PASS' : `\nrender.test: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
