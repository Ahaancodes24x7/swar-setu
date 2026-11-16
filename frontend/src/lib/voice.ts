// Text-to-speech using the browser's built-in voices (Web Speech API).
// No external service: works offline and costs nothing. Picks a voice for the app language
// when the device has one (e.g. hi-IN for Hindi) and falls back to the default voice.

const LOCALES: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", te: "te-IN", mr: "mr-IN", ta: "ta-IN",
  gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN",
};

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const lang = locale.split("-")[0];
  return voices.find((v) => v.lang === locale) || voices.find((v) => v.lang.startsWith(lang));
}

/** Removes emoji and markdown so they are not read aloud. */
function speakable(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[*_#`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speakText(text: string, languageCode = "en"): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    window.speechSynthesis.cancel();
    const locale = LOCALES[languageCode] || languageCode;
    const utterance = new SpeechSynthesisUtterance(speakable(text));
    utterance.lang = locale;
    const voice = pickVoice(locale);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
