// DSM-5 Based Assessment Data for Specific Learning Disorders
// All tests measure: accuracy, response time, and error patterns
// Language-agnostic where possible, adaptable to Indian multilingual context

import { buildItemBank, levelFor, levelRank } from "./ncertItemBank";

export { ITEM_BANK_VERSION } from "./ncertItemBank";

export interface TestQuestion {
  id: string;
  instruction: string;
  stimulus: string | string[];
  options?: string[];
  correctAnswer: string | string[] | number;
  difficulty: 1 | 2 | 3;
  gradeLevel: string;
  dsm5Domain: string;
  timeLimit?: number; // in seconds
}

export interface TestMetrics {
  accuracy: number;
  responseTime: number;
  errorPatterns: ErrorPattern[];
  hesitationCount: number;
  correctCount: number;
  totalQuestions: number;
}

export interface ErrorPattern {
  type: 'substitution' | 'reversal' | 'omission' | 'addition' | 'transposition' | 'sequence' | 'magnitude' | 'other';
  detail: string;
  questionId: string;
}

// ============================================
// DYSLEXIA TEST DATA
// ============================================

// 1. Phonological Awareness Test
export interface PhonologicalQuestion extends TestQuestion {
  taskType: 'odd-one-out' | 'syllable-count' | 'phoneme-deletion' | 'phoneme-substitution' | 'phoneme-reversal'
    | 'phoneme-count' | 'rhyme' | 'homophone' | 'silent-letter' | 'stress' | 'morpheme';
}


// 2. Pseudoword Decoding Test
export interface PseudowordQuestion extends TestQuestion {
  phonemes: string[];
}


// 3. Visual Word Confusion Test
export interface VisualConfusionQuestion extends TestQuestion {
  confusionType: 'reversal' | 'transposition' | 'similar-shape';
}


// 4. Reading Comprehension (Low Load)
export interface ComprehensionQuestion extends TestQuestion {
  passage: string;
  question: string;
}


// 5. Verbal Working Memory Test
export interface WorkingMemoryQuestion extends TestQuestion {
  sequence: string[];
  direction: 'forward' | 'backward';
}


// ============================================
// DYSCALCULIA TEST DATA
// ============================================

// 1. Number Sense & Magnitude Comparison
export interface MagnitudeQuestion extends TestQuestion {
  taskType: 'comparison' | 'number-line';
  numbers?: [number, number];
  targetNumber?: number;
  range?: [number, number];
}


// 2. Quantity Estimation (Non-Symbolic) - Dot Clusters
export interface DotClusterQuestion extends TestQuestion {
  leftDots: number;
  rightDots: number;
  displayTime: number; // milliseconds
}


// 3. Arithmetic Reasoning (Conceptual)
export interface ArithmeticQuestion extends TestQuestion {
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
  context: string;
}


// 4. Symbol-Quantity Mapping
export interface SymbolMappingQuestion extends TestQuestion {
  taskType: 'number-to-dots' | 'dots-to-number' | 'spoken-to-written';
}


// 5. Sequential Logic Test
export interface SequenceQuestion extends TestQuestion {
  pattern: (number | string)[];
  missingIndex: number;
}


// Items for the child's grade: Grades 1-8 each have their own level, then 9-10 and 11-12.
// Falls back to the nearest level only if a level were ever empty. Items are authored easy -> hard.
export function getQuestionsByGrade<T extends TestQuestion>(questions: T[], gradeNum: number): T[] {
  if (!questions || questions.length === 0) return [];
  const target = levelFor(gradeNum);
  const exact = questions.filter((q) => q.gradeLevel === target);
  if (exact.length) return [...exact].sort((a, b) => a.difficulty - b.difficulty);
  const rank = levelRank(target);
  const nearest = Math.min(...questions.map((q) => Math.abs(levelRank(q.gradeLevel) - rank)));
  return questions.filter((q) => Math.abs(levelRank(q.gradeLevel) - rank) === nearest);
}

const banks: Record<string, ReturnType<typeof buildItemBank>> = {};

// Test data for a language (English and Hindi; other languages fall back to English)
export function getTestData(langCode: string) {
  const lang = langCode === "hi" ? "hi" : "en";
  return (banks[lang] ??= buildItemBank(lang));
}
