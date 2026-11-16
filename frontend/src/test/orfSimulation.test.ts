// Re-evaluation of the DSM-5 oral reading fluency score under speech-recognition noise.
// Simulated readers with known accuracy and rate read the graded passages; their speech is
// passed through an ASR error model (substitutions, deletions, insertions at a given word error
// rate) and scored with alignReading(). Compares measured vs true WCPM and the agreement of the
// "below the 25th percentile" flag. Writes backend/reports/realistic_eval/results/orf_simulation.json.
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { alignReading, passageFor, tokenize, wcpmNorm } from "@/lib/dsm5Fluency";

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
function mutate(w: string, r: () => number): string {
  // a plausible misreading: change, drop or add one or two letters
  const chars = w.split("");
  const n = w.length > 4 && r() < 0.5 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const i = Math.floor(r() * chars.length);
    const op = r();
    if (op < 0.5) chars[i] = LETTERS[Math.floor(r() * 26)];
    else if (op < 0.75 && chars.length > 2) chars.splice(i, 1);
    else chars.splice(i, 0, LETTERS[Math.floor(r() * 26)]);
  }
  const out = chars.join("");
  return out === w ? w + "s" : out;
}

function normal(r: () => number) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

interface Sim { trueWcpm: number; measured: number; naive: number; trueBelow: boolean; measuredBelow: boolean }

function simulate(grade: number, wer: number, n: number, seed: number): Sim[] {
  const r = rng(seed);
  const passage = passageFor("en", grade);
  const P = tokenize(passage.text);
  const norm = wcpmNorm(grade);
  const out: Sim[] = [];
  for (let c = 0; c < n; c++) {
    // reader: rate around the grade median (log-normal spread), error rate 1-25 %
    const rate = Math.max(15, norm.p50 * Math.exp(0.35 * normal(r))); // words read per minute
    const errRate = Math.min(0.4, Math.max(0.01, 0.05 * Math.exp(0.8 * normal(r)) * (rate < norm.p25 ? 2 : 1)));
    const seconds = Math.min(60, (P.length / rate) * 60);
    const attempted = Math.min(P.length, Math.round((rate * seconds) / 60));
    const spoken: string[] = [];
    let correct = 0;
    for (let j = 0; j < attempted; j++) {
      const e = r();
      if (e < errRate * 0.7) spoken.push(mutate(P[j], r));        // misread
      else if (e < errRate) { /* omitted */ }
      else { spoken.push(P[j]); correct++; }
      if (r() < 0.03) spoken.push(P[j]);                           // repetition (not an error)
    }
    // ASR error model: 60 % substitutions, 25 % deletions, 15 % insertions
    const heard: string[] = [];
    for (const w of spoken) {
      const e = r();
      if (e < wer * 0.6) heard.push(mutate(w, r));
      else if (e < wer * 0.85) { /* dropped by ASR */ }
      else heard.push(w);
      if (r() < wer * 0.15) heard.push(["the", "a", "and", "uh"][Math.floor(r() * 4)]);
    }
    const trueWcpm = (correct / seconds) * 60;
    const a = alignReading(passage.text, heard.join(" "));
    const measured = (a.wordsCorrect / seconds) * 60;
    const naive = (heard.length / seconds) * 60; // words heard per minute, no alignment
    out.push({ trueWcpm, measured, naive, trueBelow: trueWcpm < norm.p25, measuredBelow: measured < norm.p25 });
  }
  return out;
}

function summarise(s: Sim[]) {
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const bias = mean(s.map((x) => x.measured - x.trueWcpm));
  const mae = mean(s.map((x) => Math.abs(x.measured - x.trueWcpm)));
  const naiveBias = mean(s.map((x) => x.naive - x.trueWcpm));
  const mt = mean(s.map((x) => x.trueWcpm)), mm = mean(s.map((x) => x.measured));
  const cov = mean(s.map((x) => (x.trueWcpm - mt) * (x.measured - mm)));
  const sd = (v: number[], m: number) => Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
  const corr = cov / (sd(s.map((x) => x.trueWcpm), mt) * sd(s.map((x) => x.measured), mm));
  const pos = s.filter((x) => x.trueBelow), neg = s.filter((x) => !x.trueBelow);
  const sens = pos.filter((x) => x.measuredBelow).length / Math.max(1, pos.length);
  const spec = neg.filter((x) => !x.measuredBelow).length / Math.max(1, neg.length);
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return { n: s.length, prevalence_below_p25: r3(pos.length / s.length), bias_wcpm: r3(bias), mae_wcpm: r3(mae),
    correlation: r3(corr), naive_bias_wcpm: r3(naiveBias), flag_sensitivity: r3(sens), flag_specificity: r3(spec) };
}

// The full 2000-reader run (ORF_FULL=1) regenerates the paper's results file and takes ~2 min;
// the default run is a quick 300-reader check of the same assertions.
const FULL = process.env.ORF_FULL === "1";
const READERS = FULL ? 2000 : 300;

describe("oral reading fluency under ASR noise", () => {
  it("recovers WCPM and the below-25th-percentile flag", () => {
    const results: Record<string, Record<string, ReturnType<typeof summarise>>> = {};
    for (const grade of [1, 3, 5]) {
      results[`grade_${grade}`] = {};
      for (const wer of [0, 0.05, 0.1, 0.2]) {
        const s = summarise(simulate(grade, wer, READERS, 1000 * grade + Math.round(wer * 100)));
        results[`grade_${grade}`][`wer_${wer}`] = s;
        if (FULL) console.log(`ORF g${grade} wer=${wer}`, JSON.stringify(s));
      }
    }
    const out = path.resolve(__dirname, "../../../backend/reports/realistic_eval/results/orf_simulation.json");
    if (FULL && fs.existsSync(path.dirname(out))) fs.writeFileSync(out, JSON.stringify({
      description: "WCPM recovered by alignReading() from simulated readers under an ASR error model (2000 readers per cell)",
      results,
    }, null, 1));
    // clean transcript: within a few WCPM (long misread words one letter off count as correct); 10 % WER: still ranks readers well
    expect(results.grade_3.wer_0.mae_wcpm).toBeLessThan(3);
    expect(results.grade_3["wer_0.1"].correlation).toBeGreaterThan(0.95);
  }, FULL ? 300_000 : 60_000);
});
