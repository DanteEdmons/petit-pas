/* Petit Pas — Web Speech API Audio */

const LANG_VOICE_MAP = {
  english: 'en-US',
  french: 'fr-FR',
  japanese: 'ja-JP',
  serbian: 'sr-RS',
};

const VOICE_PREF_KEY = 'petitPas_voices';

let voices = [];

function loadVoices() {
  if (typeof speechSynthesis !== 'undefined') voices = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

// --- User voice preferences (persisted, per language) ---
function getVoicePrefs() {
  try { return JSON.parse(localStorage.getItem(VOICE_PREF_KEY)) || {}; }
  catch { return {}; }
}

export function getPreferredVoiceURI(language) {
  return getVoicePrefs()[language] || null;
}

export function setPreferredVoice(language, voiceURI) {
  const prefs = getVoicePrefs();
  if (voiceURI) prefs[language] = voiceURI;
  else delete prefs[language];
  localStorage.setItem(VOICE_PREF_KEY, JSON.stringify(prefs));
}

// Heuristic ranking: neural / cloud voices sound much better than the
// default "compact" system ones, so prefer them when several are installed.
function scoreVoice(v) {
  const n = (v.name + ' ' + v.voiceURI).toLowerCase();
  let s = 0;
  if (/google/.test(n)) s += 5;
  if (/natural|neural|premium|enhanced|wavenet/.test(n)) s += 4;
  if (/microsoft/.test(n)) s += 2;
  if (v.localService) s += 1;
  if (/compact/.test(n)) s -= 3;
  return s;
}

// Voices available for a language, best first (for the settings picker).
export function getVoicesForLang(language) {
  const langCode = LANG_VOICE_MAP[language] || 'en-US';
  const prefix = langCode.split('-')[0];
  return voices
    .filter(v => v.lang === langCode || v.lang.startsWith(prefix))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

function pickVoice(language, langCode) {
  // 1. Explicit user choice
  const prefURI = getPreferredVoiceURI(language);
  if (prefURI) {
    const chosen = voices.find(v => v.voiceURI === prefURI);
    if (chosen) return chosen;
  }
  // 2. Best-scoring exact-language voice
  const exact = voices.filter(v => v.lang === langCode).sort((a, b) => scoreVoice(b) - scoreVoice(a));
  if (exact.length) return exact[0];
  // 3. Best-scoring prefix match (e.g. "fr-CA" for "fr-FR")
  const prefix = langCode.split('-')[0];
  const loose = voices.filter(v => v.lang.startsWith(prefix)).sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return loose[0] || null;
}

export function speak(text, language = 'english', rate = 0.9) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  if (!voices.length) loadVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  const langCode = LANG_VOICE_MAP[language] || 'en-US';
  const voice = pickVoice(language, langCode);
  if (voice) utterance.voice = voice;
  utterance.lang = langCode;
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
}

export function isSpeechSupported() {
  return typeof speechSynthesis !== 'undefined';
}

// Lets the settings screen refresh its voice lists once the browser
// finishes loading them asynchronously.
export function onVoicesReady(cb) {
  if (voices.length) { cb(); return; }
  if (typeof speechSynthesis === 'undefined') return;
  const prev = speechSynthesis.onvoiceschanged;
  speechSynthesis.onvoiceschanged = () => {
    loadVoices();
    if (typeof prev === 'function') prev();
    cb();
  };
}
