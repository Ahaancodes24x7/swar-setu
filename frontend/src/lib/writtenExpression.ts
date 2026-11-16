// DSM-5 "specific learning disorder with impairment in written expression" covers spelling
// accuracy, grammar and punctuation accuracy, and clarity or organisation of written
// expression. Handwriting (graphomotor) measures are kept as supporting evidence: a motor-only
// difficulty points towards developmental coordination disorder rather than an SLD.
//
// Task design:
//   copy        letters and one word shown on screen  -> legibility + pen control (no spelling demand)
//   dictation   word spoken, not shown                -> spelling accuracy
//   sentence    sentence spoken, not shown            -> spelling, capitalisation, punctuation
//   composition free writing to a prompt (Grade 3+)   -> clarity / organisation, grammar
//   shape       copy a simple shape                   -> visual-motor (supporting)
import type { DysgraphiaPrompt } from "@/lib/ncertTestPrompts";

export type WritingTask = "copy" | "dictation" | "sentence" | "composition" | "shape";

export interface WrittenPrompt extends DysgraphiaPrompt {
  task: WritingTask;
  /** what text-to-speech says for dictation tasks (the word in a sentence, then alone) */
  speak?: string;
}

type Band = "1-2" | "3-4" | "5-6" | "7-8" | "9-12";
const band = (g: number): Band => (g <= 2 ? "1-2" : g <= 4 ? "3-4" : g <= 6 ? "5-6" : g <= 8 ? "7-8" : "9-12");

const EN = {
  letters: { "1-2": ["b", "g"], "3-4": ["k", "y"], "5-6": ["f", "q"], "7-8": ["f", "q"], "9-12": ["f", "q"] },
  copy: { "1-2": "hat", "3-4": "plant", "5-6": "garden", "7-8": "beautiful", "9-12": "environment" },
  dictation: {
    "1-2": [["cat", "The cat is sleeping."], ["sun", "The sun is hot."], ["fish", "A fish can swim."]],
    "3-4": [["school", "I walk to school."], ["friend", "She is my friend."], ["because", "I ate because I was hungry."]],
    "5-6": [["different", "These two leaves are different."], ["necessary", "Water is necessary for life."], ["beautiful", "The garden looks beautiful."]],
    "7-8": [["government", "The government built a new road."], ["immediately", "Please come home immediately."], ["separate", "Keep the wet clothes separate."]],
    "9-12": [["accommodation", "The hotel offers cheap accommodation."], ["conscience", "Let your conscience guide you."], ["occurrence", "Floods are a common occurrence here."]],
  },
  sentence: {
    "1-2": "The dog can run.", "3-4": "We went to the market on Sunday.", "5-6": "After the rain, the children played outside.",
    "7-8": "Although it was late, Meera finished her homework.", "9-12": "The committee, which met on Monday, approved the new library.",
  },
  composition: {
    "1-2": "", "3-4": "Write two sentences about your favourite food and why you like it.",
    "5-6": "Write three or four sentences about a festival you enjoy and how you celebrate it.",
    "7-8": "Write a short paragraph (four or five sentences) about a problem in your neighbourhood and how it could be solved.",
    "9-12": "Write a short paragraph giving your opinion: should students get homework every day? Give at least one reason.",
  },
  shape: { "1-2": "triangle", "3-4": "square", "5-6": "rectangle", "7-8": "rectangle", "9-12": "rectangle" },
};

const HI = {
  letters: { "1-2": ["क", "म"], "3-4": ["ख", "ष"], "5-6": ["क्ष", "ज्ञ"], "7-8": ["क्ष", "ज्ञ"], "9-12": ["क्ष", "ज्ञ"] },
  copy: { "1-2": "घर", "3-4": "पौधा", "5-6": "बगीचा", "7-8": "पुस्तकालय", "9-12": "पर्यावरण" },
  dictation: {
    "1-2": [["कमल", "तालाब में कमल है।"], ["आम", "आम मीठा है।"], ["नल", "नल से पानी आता है।"]],
    "3-4": [["किताब", "मेरी किताब नई है।"], ["बादल", "आसमान में बादल हैं।"], ["दोस्त", "वह मेरा दोस्त है।"]],
    "5-6": [["विद्यालय", "हमारा विद्यालय बड़ा है।"], ["स्वतंत्र", "भारत एक स्वतंत्र देश है।"], ["पर्यावरण", "पर्यावरण को साफ़ रखें।"]],
    "7-8": [["प्रार्थना", "सुबह हम प्रार्थना करते हैं।"], ["आश्चर्य", "उसे देखकर मुझे आश्चर्य हुआ।"], ["व्यायाम", "रोज़ व्यायाम करना चाहिए।"]],
    "9-12": [["उत्तरदायित्व", "देश के प्रति हर नागरिक का उत्तरदायित्व है।"], ["परिस्थिति", "कठिन परिस्थिति में धैर्य रखें।"], ["महत्त्वपूर्ण", "यह एक महत्त्वपूर्ण निर्णय है।"]],
  },
  sentence: {
    "1-2": "मैं स्कूल जाता हूँ।", "3-4": "हम रविवार को बाज़ार गए।", "5-6": "बारिश के बाद बच्चे बाहर खेले।",
    "7-8": "देर हो गई थी, फिर भी मीरा ने अपना गृहकार्य पूरा किया।", "9-12": "सोमवार को हुई बैठक में समिति ने नए पुस्तकालय को मंज़ूरी दी।",
  },
  composition: {
    "1-2": "", "3-4": "अपने पसंदीदा खाने के बारे में दो वाक्य लिखिए और बताइए कि वह आपको क्यों पसंद है।",
    "5-6": "अपने किसी पसंदीदा त्योहार के बारे में तीन-चार वाक्य लिखिए और बताइए कि आप उसे कैसे मनाते हैं।",
    "7-8": "अपने मोहल्ले की किसी समस्या पर चार-पाँच वाक्यों का एक छोटा अनुच्छेद लिखिए और बताइए कि उसे कैसे सुलझाया जा सकता है।",
    "9-12": "अपनी राय लिखिए: क्या विद्यार्थियों को रोज़ गृहकार्य मिलना चाहिए? कम से कम एक कारण दीजिए।",
  },
  shape: { "1-2": "triangle", "3-4": "square", "5-6": "rectangle", "7-8": "rectangle", "9-12": "rectangle" },
};

const SHAPE_REF: Record<string, string> = { triangle: "△", square: "□", rectangle: "▭" };
const SHAPE_NAME_HI: Record<string, string> = { triangle: "त्रिभुज", square: "वर्ग", rectangle: "आयत" };

export function getWrittenExpressionPrompts(lang: string, grade: number): WrittenPrompt[] {
  const hi = lang === "hi";
  const d = hi ? HI : EN;
  const b = band(grade);
  const gl = b;
  const P: WrittenPrompt[] = [];
  for (const l of d.letters[b]) {
    P.push({ task: "copy", type: "letter", prompt: hi ? `अक्षर '${l}' लिखें` : `Copy the letter '${l}'`, reference: l, difficulty: 1, gradeLevel: gl, dsm5Domain: "letter-formation" });
  }
  P.push({ task: "copy", type: "word", prompt: hi ? `यह शब्द देखकर लिखें: '${d.copy[b]}'` : `Copy this word: '${d.copy[b]}'`, reference: d.copy[b], difficulty: 1, gradeLevel: gl, dsm5Domain: "letter-formation" });
  for (const [w, ctx] of d.dictation[b]) {
    P.push({ task: "dictation", type: "word", prompt: hi ? "सुनिए और शब्द लिखिए" : "Listen, then write the word", reference: w,
      speak: `${w}. ${ctx} ${w}.`, difficulty: 2, gradeLevel: gl, dsm5Domain: "spelling" });
  }
  if (grade >= 2) {
    P.push({ task: "sentence", type: "word", prompt: hi ? "सुनिए और पूरा वाक्य लिखिए" : "Listen, then write the whole sentence",
      reference: d.sentence[b], speak: `${d.sentence[b]} ... ${d.sentence[b]}`, difficulty: 2, gradeLevel: gl, dsm5Domain: "spelling" });
  }
  if (grade >= 3) {
    P.push({ task: "composition", type: "word", prompt: d.composition[b], difficulty: 3, gradeLevel: gl });
  }
  const shape = d.shape[b];
  P.push({ task: "shape", type: "shape", prompt: hi ? `एक ${SHAPE_NAME_HI[shape]} बनाएँ` : `Draw a ${shape}`, reference: SHAPE_REF[shape], difficulty: 1, gradeLevel: gl, dsm5Domain: "visual-motor" });
  return P;
}

/** Whether the handwriting model's reading equals the dictated word (case, spaces, punctuation ignored). */
export function spelledCorrectly(recognised: string | undefined, reference: string): boolean | undefined {
  if (recognised === undefined) return undefined;
  const n = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");
  return n(recognised) === n(reference);
}

/** Teacher's check of the written-expression tasks (the handwriting model only pre-fills spelling). */
export interface WritingReview {
  spelling: Record<number, boolean>;             // dictation item index -> spelled correctly
  sentence?: { capital: boolean; endPunctuation: boolean; allWords: boolean; spelling: boolean };
  composition?: { clarity: 0 | 1 | 2; grammar: 0 | 1 | 2 };
}

export interface WrittenExpressionScores {
  spellingAccuracy: number | null;     // 0-1
  grammarPunctuation: number | null;   // 0-1
  clarityOrganisation: number | null;  // 0-1
}

export function scoreWrittenExpression(review: WritingReview, lang: string): WrittenExpressionScores {
  const sp = Object.values(review.spelling);
  const spellingItems = [...sp, ...(review.sentence ? [review.sentence.spelling] : [])];
  const spellingAccuracy = spellingItems.length ? spellingItems.filter(Boolean).length / spellingItems.length : null;

  const g: number[] = [];
  if (review.sentence) {
    // Devanagari has no capital letters
    if (lang !== "hi") g.push(review.sentence.capital ? 1 : 0);
    g.push(review.sentence.endPunctuation ? 1 : 0, review.sentence.allWords ? 1 : 0);
  }
  if (review.composition) g.push(review.composition.grammar / 2);
  const grammarPunctuation = g.length ? g.reduce((a, b) => a + b, 0) / g.length : null;
  const clarityOrganisation = review.composition ? review.composition.clarity / 2 : null;
  return { spellingAccuracy, grammarPunctuation, clarityOrganisation };
}

/** Below-expected cut-offs for a screen (not norms): spelling < 70%, grammar < 67%, clarity rated "unclear". */
export const WRITTEN_CUTOFFS = { spelling: 0.7, grammar: 0.67, clarity: 0.5 };
