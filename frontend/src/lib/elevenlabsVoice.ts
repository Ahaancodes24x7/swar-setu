// ElevenLabs Voice & Speech Integration Engine
// API Key: sk_a7a1b9e7b19ea52737c7c65df8463917fbb0ce7756b936df

const ELEVENLABS_API_KEY =
  import.meta.env.VITE_ELEVENLABS_API_KEY ||
  import.meta.env.ELEVENLABS_API_KEY ||
  "sk_a7a1b9e7b19ea52737c7c65df8463917fbb0ce7756b936df";

// Default ElevenLabs voice ID (e.g. Rachel / multilingual voice)
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

export interface SpeechToTextResult {
  text: string;
  confidence: number;
}

/**
 * Text-to-Speech synthesis via ElevenLabs REST API
 */
export async function speakTextElevenLabs(text: string, voiceId = DEFAULT_VOICE_ID): Promise<HTMLAudioElement | null> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`ElevenLabs TTS HTTP ${response.status}, falling back to Web Speech API.`);
      return speakTextWebSpeech(text);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
    return audio;
  } catch (err) {
    console.warn("ElevenLabs TTS connection error, falling back to Web Speech API:", err);
    return speakTextWebSpeech(text);
  }
}

/**
 * Web Speech API Fallback for Text-to-Speech
 */
export function speakTextWebSpeech(text: string): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve(null);
    utterance.onerror = () => resolve(null);
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speech-to-Text Transcription Helper (uses Web Speech Recognition + ElevenLabs Voice context)
 */
export function createSpeechRecognizer(
  onResult: (text: string, isFinal: boolean) => void,
  onError?: (err: string) => void
) {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError("Browser does not support SpeechRecognition API");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event: any) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    console.warn("SpeechRecognition error:", event.error);
    if (onError) onError(event.error);
  };

  return recognition;
}
