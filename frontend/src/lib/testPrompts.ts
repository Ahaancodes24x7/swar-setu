// DSM-5 Compliant, NCERT-Aligned Test Prompts for Voice-based SLD Screening
// This file provides legacy compatibility and redirects to the main ncertTestPrompts

import { getNcertPrompts, type TestPromptsByLanguage as NCERTTestPrompts } from "./ncertTestPrompts";

export interface TestPrompt {
  text: string;
  difficulty: 1 | 2 | 3;
  dsm5Domain?: string;
}

export interface TestPromptsByLanguage {
  reading: TestPrompt[];
  number: TestPrompt[];
  phoneme: TestPrompt[];
}

// Convert NCERT prompts to legacy format
function convertToLegacyFormat(ncertPrompts: NCERTTestPrompts): TestPromptsByLanguage {
  return {
    reading: [
      ...ncertPrompts.dyslexia.words.map(p => ({ text: p.text, difficulty: p.difficulty, dsm5Domain: p.dsm5Domain })),
      ...ncertPrompts.dyslexia.sentences.map(p => ({ text: p.text, difficulty: p.difficulty, dsm5Domain: p.dsm5Domain })),
      ...ncertPrompts.dyslexia.paragraphs.map(p => ({ text: p.text, difficulty: p.difficulty, dsm5Domain: p.dsm5Domain })),
    ],
    number: [
      ...ncertPrompts.dyscalculia.numberReading.map(p => ({ text: p.text, difficulty: p.difficulty, dsm5Domain: p.dsm5Domain })),
      ...ncertPrompts.dyscalculia.numberSequence.map(p => ({ text: p.text, difficulty: p.difficulty, dsm5Domain: p.dsm5Domain })),
    ],
    phoneme: [
      // Use word-level prompts for phoneme testing (focuses on sound accuracy)
      ...ncertPrompts.dyslexia.words.map(p => ({ text: p.text, difficulty: p.difficulty, dsm5Domain: "reading-accuracy" })),
    ],
  };
}

// Build prompts for all supported languages
export const testPromptsByLanguage: Record<string, TestPromptsByLanguage> = {
  en: convertToLegacyFormat(getNcertPrompts("en")),
  hi: convertToLegacyFormat(getNcertPrompts("hi")),
  bn: convertToLegacyFormat(getNcertPrompts("bn")),
  ta: convertToLegacyFormat(getNcertPrompts("ta")),
  te: convertToLegacyFormat(getNcertPrompts("te")),
  mr: convertToLegacyFormat(getNcertPrompts("mr")),
  gu: convertToLegacyFormat(getNcertPrompts("gu")),
  kn: convertToLegacyFormat(getNcertPrompts("kn")),
  ml: convertToLegacyFormat(getNcertPrompts("ml")),
  pa: convertToLegacyFormat(getNcertPrompts("pa")),
  or: convertToLegacyFormat(getNcertPrompts("or")),
};

// Get prompts for a specific language, fallback to English if not available
export function getTestPrompts(languageCode: string): TestPromptsByLanguage {
  return testPromptsByLanguage[languageCode] || testPromptsByLanguage.en;
}
