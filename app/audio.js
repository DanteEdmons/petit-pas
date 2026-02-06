/* Petit Pas — Web Speech API Audio */

const LANG_VOICE_MAP = {
  english: 'en-US',
  french: 'fr-FR',
  japanese: 'ja-JP',
  serbian: 'sr-RS',
};

let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function findVoice(langCode) {
  // Try exact match first
  let voice = voices.find(v => v.lang === langCode);
  // Then try prefix match
  if (!voice) {
    const prefix = langCode.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(prefix));
  }
  return voice;
}

export function speak(text, language = 'english', rate = 0.9) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const langCode = LANG_VOICE_MAP[language] || 'en-US';
  const voice = findVoice(langCode);
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
