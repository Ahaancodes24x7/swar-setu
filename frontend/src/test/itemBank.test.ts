import { describe, expect, it } from "vitest";
import { getQuestionsByGrade, getTestData } from "@/lib/dsm5TestData";
import { LEVELS, levelFor } from "@/lib/ncertItemBank";
import { gradeBand, passageFor } from "@/lib/dsm5Fluency";
import { getWrittenExpressionPrompts } from "@/lib/writtenExpression";
import { tokenizeResponse, normalizeItem } from "@/lib/spokenSequence";

const LANGS = ["en", "hi"] as const;
const subtests = (lang: string) => {
  const d = getTestData(lang);
  return { ...d.dyslexia, ...d.dyscalculia } as Record<string, { id: string; gradeLevel: string; difficulty: number; options?: string[]; correctAnswer: unknown }[]>;
};

describe("graded NCERT item bank", () => {
  it("maps every school grade to its own level", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(levelFor)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9-10", "9-10", "11-12", "11-12"]);
    expect(levelFor(0)).toBe("3"); // unknown grade: same Grade 3 default the tests use
  });

  for (const lang of LANGS) {
    it(`[${lang}] has 3-4 items per subtest at every level, unique ids, answers among the options`, () => {
      const ids = new Set<string>();
      for (const [name, items] of Object.entries(subtests(lang))) {
        for (const lvl of LEVELS) {
          const atLevel = items.filter((q) => q.gradeLevel === lvl);
          expect(atLevel.length, `${lang} ${name} level ${lvl}`).toBeGreaterThanOrEqual(3);
          expect(atLevel.length).toBeLessThanOrEqual(4);
        }
        for (const q of items) {
          expect(ids.has(q.id), q.id).toBe(false);
          ids.add(q.id);
          if (q.options && typeof q.correctAnswer === "string") expect(q.options, q.id).toContain(q.correctAnswer);
          if (q.options) expect(new Set(q.options).size, `${q.id} duplicate options`).toBe(q.options.length);
        }
      }
    });

    it(`[${lang}] gives each grade its own questions, ordered easy to hard`, () => {
      const pa = subtests(lang).phonologicalAwareness;
      const g3 = getQuestionsByGrade(pa as any, 3);
      const g4 = getQuestionsByGrade(pa as any, 4);
      expect(g3.every((q) => q.gradeLevel === "3")).toBe(true);
      expect(g3.map((q) => q.id)).not.toEqual(g4.map((q) => q.id));
      const diffs = g3.map((q) => q.difficulty);
      expect([...diffs].sort()).toEqual(diffs);
    });
  }

  it("scales demands with grade (memory span, dot ratio, passage length)", () => {
    const d = getTestData("en");
    const span = (g: number) => Math.max(...getQuestionsByGrade(d.dyslexia.verbalWorkingMemory, g).map((q) => q.sequence.length));
    expect(span(1)).toBeLessThan(span(5));
    expect(span(5)).toBeLessThan(span(12));
    const ratio = (g: number) => Math.max(...getQuestionsByGrade(d.dyscalculia.quantityEstimation, g).map((q) => Math.min(q.leftDots, q.rightDots) / Math.max(q.leftDots, q.rightDots)));
    expect(ratio(1)).toBeLessThan(ratio(6));
    expect(ratio(6)).toBeLessThan(ratio(12));
    const words = (g: number) => getQuestionsByGrade(d.dyslexia.readingComprehension, g)[0].passage.split(/\s+/).length;
    for (let g = 1; g < 11; g++) expect(words(g + 1), `passage g${g + 1} vs g${g}`).toBeGreaterThanOrEqual(words(g));
    for (let g = 2; g <= 12; g++) {
      const prev = d.dyslexia.pseudowordDecoding.filter((q) => q.gradeLevel === levelFor(g - 1));
      const cur = d.dyslexia.pseudowordDecoding.filter((q) => q.gradeLevel === levelFor(g));
      const avg = (xs: typeof cur) => xs.reduce((a, q) => a + String(q.correctAnswer).length, 0) / xs.length;
      expect(avg(cur)).toBeGreaterThanOrEqual(avg(prev));
    }
  });

  it("extends reading passages and writing tasks past Grade 5", () => {
    expect(gradeBand(7)).toBe("7-8");
    expect(gradeBand(11)).toBe("9-12");
    expect(passageFor("en", 9).text.split(" ").length).toBeGreaterThan(passageFor("en", 5).text.split(" ").length);
    expect(passageFor("hi", 8).id).toBe("orf-hi-4");
    const g9 = getWrittenExpressionPrompts("en", 9);
    expect(g9.find((p) => p.task === "dictation")!.reference).toBe("accommodation");
    expect(g9.find((p) => p.task === "composition")!.prompt).toMatch(/opinion/);
  });
});

describe("spoken sequence matching", () => {
  it("accepts the ways speech recognition writes digits", () => {
    const exp = ["3", "7", "2"];
    for (const said of ["3 7 2", "372", "3, 7, 2", "three seven two", "३ ७ २", "तीन सात दो"]) {
      expect(tokenizeResponse(said, exp), said).toEqual(exp);
    }
    expect(tokenizeResponse("3 2 7", exp)).not.toEqual(exp);
  });
  it("keeps words as words", () => {
    expect(tokenizeResponse("sun tree book", ["sun", "tree", "book"])).toEqual(["sun", "tree", "book"]);
    expect(normalizeItem("पाँच")).toBe("5");
  });
});
