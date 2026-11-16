import { describe, expect, it } from "vitest";
import {
  alignReading, factNorm, generateFacts, passageFor, scoreFacts, scoreReading, tokenize, wcpmNorm,
} from "@/lib/dsm5Fluency";
import { getWrittenExpressionPrompts, scoreWrittenExpression, spelledCorrectly } from "@/lib/writtenExpression";

describe("oral reading alignment", () => {
  const passage = "Ravi has a red kite. He runs to the park with his dog.";

  it("counts a perfect reading of the first sentence", () => {
    const a = alignReading(passage, "Ravi has a red kite.");
    expect(a.wordsAttempted).toBe(5);
    expect(a.wordsCorrect).toBe(5);
    expect(a.marks.slice(5).every((m) => m === "not_reached")).toBe(true);
  });

  it("marks substitutions and omissions as errors but not repeats", () => {
    // "red" -> "rid" (error), "a" omitted, "kite" repeated
    const a = alignReading(passage, "Ravi has rid kite kite he runs");
    expect(a.wordsAttempted).toBe(7);
    expect(a.wordsCorrect).toBe(5);
    expect(a.marks[2]).toBe("error");
  });

  it("tolerates a one-letter recognition slip on long words only", () => {
    expect(alignReading("children played outside", "children playd outside").wordsCorrect).toBe(3);
    expect(alignReading("the cat sat", "the cot sat").wordsCorrect).toBe(2);
  });

  it("handles empty transcripts and Devanagari", () => {
    expect(alignReading(passage, "").wordsAttempted).toBe(0);
    const hi = passageFor("hi", 1);
    expect(tokenize("रवि के पास एक लाल पतंग है।")).toEqual(["रवि", "के", "पास", "एक", "लाल", "पतंग", "है"]);
    const a = alignReading(hi.text, "रवि के पास एक लाल पतंग है");
    expect(a.wordsCorrect).toBe(7);
  });

  it("scores WCPM and the below-expected rule", () => {
    const p = passageFor("en", 3);
    const fast = scoreReading(p, 3, 60, 120, 118, "speech");
    expect(fast.wcpm).toBe(118);
    expect(fast.belowExpected).toBe(false);
    const slow = scoreReading(p, 3, 60, 50, 48, "speech");
    expect(slow.belowExpected).toBe(true);
    const inaccurate = scoreReading(p, 3, 60, 120, 100, "speech");
    expect(inaccurate.accuracy).toBeLessThan(0.9);
    expect(inaccurate.belowExpected).toBe(true);
    expect(wcpmNorm(9)).toEqual(wcpmNorm(6));
  });
});

describe("arithmetic fact fluency", () => {
  it("generates grade-appropriate facts with correct answers", () => {
    for (const g of [1, 3, 6]) {
      const facts = generateFacts(g, 200, 42);
      for (const f of facts) {
        const v = f.op === "+" ? f.a + f.b : f.op === "−" ? f.a - f.b : f.op === "×" ? f.a * f.b : f.a / f.b;
        expect(v).toBe(f.answer);
        expect(f.answer).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(f.answer)).toBe(true);
      }
      if (g === 1) expect(facts.every((f) => f.op === "+" || f.op === "−")).toBe(true);
    }
    expect(generateFacts(3, 10, 7)).toEqual(generateFacts(3, 10, 7));
  });

  it("scores rate, accuracy and retrieval time", () => {
    const resp = Array.from({ length: 20 }, (_, i) => ({ fact: "2 + 2", given: "4", correct: i % 10 !== 0, ms: 2000 }));
    const r = scoreFacts(resp, 60, 3);
    expect(r.correct).toBe(18);
    expect(r.correctPerMinute).toBe(18);
    expect(r.accuracy).toBeCloseTo(0.9);
    expect(r.avgCorrectMs).toBe(2000);
    expect(r.belowExpected).toBe(false);
    expect(scoreFacts(resp.slice(0, 5), 60, 3).belowExpected).toBe(true);
    expect(factNorm(12)).toBe(factNorm(6));
  });
});

describe("written expression", () => {
  it("builds DSM-5 tasks by grade, with dictated words hidden behind speech", () => {
    const g1 = getWrittenExpressionPrompts("en", 1);
    expect(g1.some((p) => p.task === "sentence")).toBe(false);
    expect(g1.some((p) => p.task === "composition")).toBe(false);
    const g4 = getWrittenExpressionPrompts("en", 4);
    expect(g4.filter((p) => p.task === "dictation")).toHaveLength(3);
    expect(g4.some((p) => p.task === "sentence")).toBe(true);
    expect(g4.some((p) => p.task === "composition")).toBe(true);
    for (const p of g4.filter((x) => x.task === "dictation")) {
      expect(p.speak).toContain(p.reference);
      expect(p.prompt).not.toContain(p.reference!);
    }
    expect(getWrittenExpressionPrompts("hi", 5).filter((p) => p.task === "dictation")[0].reference).toBe("विद्यालय");
  });

  it("checks spelling and scores the three specifiers", () => {
    expect(spelledCorrectly("School.", "school")).toBe(true);
    expect(spelledCorrectly("skool", "school")).toBe(false);
    expect(spelledCorrectly(undefined, "school")).toBeUndefined();
    const s = scoreWrittenExpression({
      spelling: { 3: true, 4: false, 5: true },
      sentence: { capital: false, endPunctuation: true, allWords: true, spelling: false },
      composition: { clarity: 1, grammar: 2 },
    }, "en");
    expect(s.spellingAccuracy).toBeCloseTo(2 / 4);
    expect(s.grammarPunctuation).toBeCloseTo((0 + 1 + 1 + 1) / 4);
    expect(s.clarityOrganisation).toBe(0.5);
    // no capital letters in Devanagari
    const h = scoreWrittenExpression({ spelling: {}, sentence: { capital: false, endPunctuation: true, allWords: true, spelling: true } }, "hi");
    expect(h.grammarPunctuation).toBe(1);
    expect(h.clarityOrganisation).toBeNull();
  });
});
