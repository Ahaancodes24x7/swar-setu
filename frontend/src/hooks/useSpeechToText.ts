// Live speech-to-text backed by the SwarSetu backend's self-hosted Whisper model
// (POST {FUNCTIONS_URL}/transcribe). Drop-in replacement for ElevenLabs' useScribe:
//   const stt = useSpeechToText({ language, onPartialTranscript, onCommittedTranscript });
//   await stt.connect();  const fullText = await stt.disconnect();
//
// Audio is captured as raw PCM in the browser, cut into segments at pauses (simple energy
// voice-activity detection, max 15 s), and each segment is transcribed once and "committed".
// While a segment is in progress its audio-so-far is transcribed every ~2 s as a partial result.

import { useCallback, useEffect, useRef, useState } from "react";
import { FUNCTIONS_URL } from "@/integrations/supabase/client";

export interface TranscriptEvent {
  text: string;
}

interface Options {
  language?: string;
  onPartialTranscript?: (e: TranscriptEvent) => void;
  onCommittedTranscript?: (e: TranscriptEvent) => void;
  onError?: (message: string) => void;
}

interface ConnectOptions {
  microphone?: MediaTrackConstraints;
}

const TARGET_RATE = 16000;
const SILENCE_TO_COMMIT_MS = 800;
const MAX_SEGMENT_MS = 15000;
const PARTIAL_EVERY_MS = 2000;

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

function downsample(chunks: Float32Array[], fromRate: number): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { merged.set(c, o); o += c.length; }
  if (fromRate === TARGET_RATE) return merged;
  const ratio = fromRate / TARGET_RATE;
  const out = new Float32Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio), end = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += merged[j];
    out[i] = end > start ? sum / (end - start) : merged[start] || 0;
  }
  return out;
}

export async function transcribeAudio(audio: Blob, language = "en"): Promise<{ text: string; words?: unknown[] }> {
  const form = new FormData();
  form.append("audio", audio, audio.type === "audio/wav" ? "speech.wav" : "speech.webm");
  form.append("language", language);
  const res = await fetch(`${FUNCTIONS_URL}/transcribe`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Transcription failed (${res.status})`);
  return data;
}

export function useSpeechToText({ language = "en", onPartialTranscript, onCommittedTranscript, onError }: Options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [level, setLevel] = useState(0);
  const cbRef = useRef({ onPartialTranscript, onCommittedTranscript, onError, language });
  cbRef.current = { onPartialTranscript, onCommittedTranscript, onError, language };

  const s = useRef({
    stream: null as MediaStream | null,
    ctx: null as AudioContext | null,
    node: null as ScriptProcessorNode | null,
    segment: [] as Float32Array[],
    segmentMs: 0,
    speaking: false,
    silenceMs: 0,
    noiseFloor: 0.005,
    lastPartialAt: 0,
    partialBusy: false,
    commitChain: Promise.resolve() as Promise<void>,
    committed: [] as string[],
  });

  const commitSegment = useCallback(() => {
    const st = s.current;
    if (!st.ctx || !st.segment.length) return;
    const pcm = downsample(st.segment, st.ctx.sampleRate);
    st.segment = []; st.segmentMs = 0; st.speaking = false; st.silenceMs = 0;
    if (pcm.length < TARGET_RATE * 0.3) return;
    const blob = encodeWav(pcm, TARGET_RATE);
    st.commitChain = st.commitChain.then(async () => {
      try {
        const { text } = await transcribeAudio(blob, cbRef.current.language);
        if (text) {
          st.committed.push(text);
          cbRef.current.onCommittedTranscript?.({ text });
        }
        cbRef.current.onPartialTranscript?.({ text: "" });
      } catch (e) {
        cbRef.current.onError?.(e instanceof Error ? e.message : String(e));
      }
    });
  }, []);

  const sendPartial = useCallback(() => {
    const st = s.current;
    if (!st.ctx || st.partialBusy || !st.segment.length) return;
    st.partialBusy = true;
    const blob = encodeWav(downsample(st.segment, st.ctx.sampleRate), TARGET_RATE);
    transcribeAudio(blob, cbRef.current.language)
      .then(({ text }) => { if (st.speaking || st.segment.length) cbRef.current.onPartialTranscript?.({ text }); })
      .catch(() => { /* partial results are best-effort */ })
      .finally(() => { st.partialBusy = false; });
  }, []);

  const connect = useCallback(async (opts: ConnectOptions = {}) => {
    const st = s.current;
    if (st.ctx) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, ...(opts.microphone || {}) },
    });
    const ctx = new AudioContext();
    // browsers create the context suspended when recording starts without a click
    await ctx.resume().catch(() => undefined);
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    Object.assign(st, { stream, ctx, node, segment: [], segmentMs: 0, speaking: false, silenceMs: 0,
      committed: [], commitChain: Promise.resolve(), lastPartialAt: 0 });

    node.onaudioprocess = (ev) => {
      const input = ev.inputBuffer.getChannelData(0);
      const chunk = new Float32Array(input);
      const chunkMs = (chunk.length / ctx.sampleRate) * 1000;
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
      const rms = Math.sqrt(sum / chunk.length);
      setLevel(Math.min(100, Math.round(rms * 600)));

      const threshold = Math.max(0.012, st.noiseFloor * 3);
      const voiced = rms > threshold;
      if (!voiced && !st.speaking) st.noiseFloor = st.noiseFloor * 0.95 + rms * 0.05;

      if (voiced) { st.speaking = true; st.silenceMs = 0; }
      if (st.speaking) {
        st.segment.push(chunk);
        st.segmentMs += chunkMs;
        if (!voiced) st.silenceMs += chunkMs;
        const now = performance.now();
        if (now - st.lastPartialAt > PARTIAL_EVERY_MS) { st.lastPartialAt = now; sendPartial(); }
        if (st.silenceMs >= SILENCE_TO_COMMIT_MS || st.segmentMs >= MAX_SEGMENT_MS) commitSegment();
      }
    };
    source.connect(node);
    node.connect(ctx.destination);
    setIsConnected(true);
  }, [commitSegment, sendPartial]);

  /** Stops capture, transcribes the last segment and resolves with the full committed text. */
  const disconnect = useCallback(async (): Promise<string> => {
    const st = s.current;
    if (!st.ctx) return st.committed.join(" ");
    if (st.speaking) commitSegment();
    st.node?.disconnect();
    st.stream?.getTracks().forEach((t) => t.stop());
    await st.ctx.close().catch(() => undefined);
    st.ctx = null; st.node = null; st.stream = null;
    setIsConnected(false);
    setLevel(0);
    await st.commitChain;
    return st.committed.join(" ").trim();
  }, [commitSegment]);

  useEffect(() => () => {
    const st = s.current;
    st.node?.disconnect();
    st.stream?.getTracks().forEach((t) => t.stop());
    st.ctx?.close().catch(() => undefined);
  }, []);

  return { connect, disconnect, isConnected, level };
}
