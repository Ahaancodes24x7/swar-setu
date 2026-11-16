// DSM-5 specifier subtests that need timing: oral reading fluency (reading: "word reading
// accuracy" and "reading rate or fluency") and arithmetic fact fluency (mathematics:
// "accurate or fluent calculation"). Passages are original, graded by length and vocabulary.
//
// Benchmarks are approximate screening references, not diagnostic norms:
//  - oral reading: Hasbrouck & Tindal (2017) spring words-correct-per-minute, English, US.
//    No published Hindi norms exist; the screening model age-norms the measure itself.
//  - fact fluency: curriculum-based-measurement guidance on facts correct per minute.

export interface ReadingPassage {
  id: string;
  lang: "en" | "hi";
  band: "1-2" | "3-4" | "5-6" | "7-8" | "9-12";
  title: string;
  text: string;
}

export const READING_PASSAGES: ReadingPassage[] = [
  { id: "orf-en-1", lang: "en", band: "1-2", title: "The red kite",
    text: "Ravi has a red kite. He runs to the park with his dog. The wind is big. The kite goes up and up. The dog jumps and barks at the kite. Ravi laughs. Then the wind stops and the kite comes down in a tree. Ravi and his mother get it down. They go home to eat." },
  { id: "orf-en-2", lang: "en", band: "3-4", title: "The school garden",
    text: "Our class planted a small garden behind the school. Every morning we watered the seeds and pulled out the weeds. After two weeks, tiny green leaves pushed through the soil. Meena counted thirty bean plants and nine tomato plants. When the rain did not come, we carried buckets from the tap. By the end of the month the beans were taller than our knees, and the first tomatoes were turning red. Our teacher said we could cook them for the school lunch." },
  { id: "orf-en-3", lang: "en", band: "5-6", title: "The river crossing",
    text: "Every monsoon, the river near Arjun's village rose so high that the old wooden bridge disappeared under brown water. Children who lived on the far bank missed school for weeks. One year the villagers decided to build a stronger bridge. Engineers from the district showed them how to set concrete pillars deep into the riverbed, and families took turns carrying sand and stones. Arjun measured each pillar carefully and wrote the numbers in a notebook. When the rains arrived, the water roared beneath the new bridge, but it held firm, and for the first time nobody had to stay at home." },
  { id: "orf-hi-1", lang: "hi", band: "1-2", title: "लाल पतंग",
    text: "रवि के पास एक लाल पतंग है। वह अपने कुत्ते के साथ बाग में जाता है। हवा तेज़ है। पतंग ऊपर ऊपर जाती है। कुत्ता पतंग को देखकर भौंकता है। रवि हँसता है। फिर हवा रुक जाती है और पतंग पेड़ पर अटक जाती है। रवि और उसकी माँ पतंग उतारते हैं। फिर वे खाना खाने घर जाते हैं।" },
  { id: "orf-hi-2", lang: "hi", band: "3-4", title: "स्कूल का बगीचा",
    text: "हमारी कक्षा ने स्कूल के पीछे एक छोटा बगीचा लगाया। हर सुबह हम बीजों को पानी देते और घास निकालते। दो हफ़्ते बाद मिट्टी से छोटी हरी पत्तियाँ निकल आईं। मीना ने तीस सेम के पौधे और नौ टमाटर के पौधे गिने। जब बारिश नहीं हुई तो हम नल से बाल्टियाँ भरकर लाए। महीने के अंत तक सेम हमारे घुटनों से ऊँची हो गई और पहले टमाटर लाल होने लगे। हमारी अध्यापिका ने कहा कि हम इन्हें स्कूल के खाने में पका सकते हैं।" },
  { id: "orf-hi-3", lang: "hi", band: "5-6", title: "नदी का पुल",
    text: "हर बरसात में अर्जुन के गाँव के पास की नदी इतनी ऊपर चढ़ जाती थी कि पुराना लकड़ी का पुल भूरे पानी में डूब जाता था। दूसरे किनारे पर रहने वाले बच्चे कई हफ़्तों तक स्कूल नहीं जा पाते थे। एक साल गाँव वालों ने मज़बूत पुल बनाने का फ़ैसला किया। ज़िले के इंजीनियरों ने उन्हें सिखाया कि नदी की तली में गहरे खंभे कैसे गाड़ते हैं, और सब परिवार बारी बारी से रेत और पत्थर ढोते रहे। अर्जुन हर खंभे को ध्यान से नापता और नाप अपनी कॉपी में लिखता। जब बारिश आई तो पानी नए पुल के नीचे गरजता रहा, पर पुल मज़बूती से खड़ा रहा।" },
  { id: "orf-en-4", lang: "en", band: "7-8", title: "The night the lights went out",
    text: "When the power failed across the town one summer evening, Kabir expected the night to be dull. Without fans, the house grew warm, so the family carried mats up to the roof. His grandfather pointed out the stars he had used as a boy to find his way home from the fields: the bright one that rose in the east before the rains, and the group shaped like a kite that turned slowly through the night. Neighbours on the other roofs began to talk across the gaps, sharing water and stories. Someone played an old song on a radio that ran on batteries. By the time the lights flickered back on, nobody hurried downstairs. Kabir realised that the dark had not taken anything away from the evening; it had simply made room for things that were usually drowned out by noise and light." },
  { id: "orf-en-5", lang: "en", band: "9-12", title: "Measuring a country",
    text: "For most of history, maps were drawn by travellers who walked, sailed or rode across the land, measuring distances by days and directions by the sun and stars. Their maps were often beautiful but rarely accurate, and blank spaces were sometimes filled with imaginary mountains or sea creatures. The Great Trigonometrical Survey of India, begun in 1802, changed this approach. Surveyors carried heavy instruments across plains, forests and mountains, measuring angles between distant points with remarkable precision. The work took decades, and many of the people involved suffered from disease and exhaustion. Their measurements, however, produced some of the most reliable maps of the age and even revealed the height of the world's tallest peak. Today satellites can map a city in hours, yet the basic idea remains the same: careful measurement, patiently repeated, turns an unknown landscape into something we can understand and share." },
  { id: "orf-hi-4", lang: "hi", band: "7-8", title: "जब बिजली चली गई",
    text: "गर्मी की एक शाम जब पूरे कस्बे की बिजली चली गई, तो कबीर को लगा कि रात बहुत उबाऊ होगी। पंखे बंद होने से घर गर्म हो गया, इसलिए पूरा परिवार चटाइयाँ लेकर छत पर चला गया। उसके दादाजी ने वे तारे दिखाए जिनकी मदद से वे बचपन में खेतों से घर का रास्ता ढूँढते थे: एक चमकीला तारा जो बरसात से पहले पूरब में उगता था, और पतंग के आकार का एक तारामंडल जो रात भर धीरे-धीरे घूमता था। आसपास की छतों पर पड़ोसी भी एक-दूसरे से बातें करने लगे, पानी और किस्से बाँटने लगे। किसी ने बैटरी वाले रेडियो पर एक पुराना गाना लगा दिया। जब बिजली लौटी, तो कोई जल्दी से नीचे नहीं गया। कबीर ने समझा कि अँधेरे ने शाम से कुछ छीना नहीं था; उसने बस उन बातों के लिए जगह बना दी थी जो रोज़ शोर और रोशनी में दब जाती हैं।" },
  { id: "orf-hi-5", lang: "hi", band: "9-12", title: "एक देश को नापना",
    text: "इतिहास के ज़्यादातर समय में नक्शे यात्री बनाते थे, जो पैदल, नाव या घोड़े से सफ़र करते थे। वे दूरी को दिनों में और दिशा को सूरज और तारों से नापते थे। उनके नक्शे अक्सर सुंदर होते थे, पर सटीक कम ही होते थे, और ख़ाली जगहों को कभी-कभी काल्पनिक पहाड़ों या समुद्री जीवों से भर दिया जाता था। 1802 में शुरू हुए भारत के महान त्रिकोणमितीय सर्वेक्षण ने यह तरीका बदल दिया। सर्वेक्षक भारी उपकरण लेकर मैदानों, जंगलों और पहाड़ों से गुज़रे और दूर-दूर के बिंदुओं के बीच के कोणों को अद्भुत सटीकता से नापा। यह काम दशकों तक चला और इसमें लगे कई लोग बीमारी और थकान से जूझते रहे। फिर भी उनके माप से उस दौर के सबसे भरोसेमंद नक्शे बने और दुनिया की सबसे ऊँची चोटी की ऊँचाई भी पता चली। आज उपग्रह कुछ ही घंटों में पूरे शहर का नक्शा बना देते हैं, फिर भी मूल विचार वही है: धैर्य से बार-बार किया गया सावधान माप किसी अनजान इलाके को ऐसी चीज़ में बदल देता है जिसे हम समझ सकें और दूसरों तक पहुँचा सकें।" },
];

export function gradeBand(grade: number): ReadingPassage["band"] {
  return grade <= 2 ? "1-2" : grade <= 4 ? "3-4" : grade <= 6 ? "5-6" : grade <= 8 ? "7-8" : "9-12";
}

export function passageFor(lang: string, grade: number): ReadingPassage {
  const l = lang === "hi" ? "hi" : "en";
  const band = gradeBand(grade);
  return READING_PASSAGES.find((p) => p.lang === l && p.band === band) || READING_PASSAGES[0];
}

/** Spring WCPM, 50th and 25th percentile (Hasbrouck & Tindal 2017; grades above 6 use grade 6). */
const WCPM_NORMS: Record<number, { p50: number; p25: number }> = {
  1: { p50: 60, p25: 34 },
  2: { p50: 100, p25: 72 },
  3: { p50: 112, p25: 87 },
  4: { p50: 133, p25: 107 },
  5: { p50: 146, p25: 123 },
  6: { p50: 146, p25: 122 },
};

export function wcpmNorm(grade: number) {
  return WCPM_NORMS[Math.min(6, Math.max(1, Math.round(grade) || 3))];
}

/** Tokenise for comparison: lower case, punctuation removed, Devanagari marks kept. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[।॥]/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s']/gu, " ")
    .replace(/'/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** A spoken word counts as the passage word if identical, or (for long words) one edit away —
 *  speech recognition often drops an inflection that the child did read. */
function sameWord(spoken: string, target: string): boolean {
  if (spoken === target) return true;
  return target.length >= 5 && editDistance(spoken, target) <= 1;
}

export interface ReadingAlignment {
  wordsAttempted: number;
  wordsCorrect: number;
  /** per passage word: "correct" | "error" | "not_reached" */
  marks: ("correct" | "error" | "not_reached")[];
}

/**
 * Align what the child said with the passage. Semi-global alignment: the transcript must be
 * fully explained, but the child may stop anywhere in the passage. Insertions (repeated or
 * extra words) cost one, like substitutions and omissions, but don't count as words read.
 */
export function alignReading(passage: string, transcript: string): ReadingAlignment {
  const P = tokenize(passage);
  const T = tokenize(transcript);
  const n = P.length, m = T.length;
  const marks: ReadingAlignment["marks"] = P.map(() => "not_reached");
  if (!m) return { wordsAttempted: 0, wordsCorrect: 0, marks };

  // D[i][j]: cost of aligning transcript[0..i) with passage[0..j)
  const D: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let j = 0; j <= n; j++) D[0][j] = j;
  for (let i = 1; i <= m; i++) {
    D[i][0] = i;
    for (let j = 1; j <= n; j++) {
      D[i][j] = Math.min(
        D[i - 1][j - 1] + (sameWord(T[i - 1], P[j - 1]) ? 0 : 1),
        D[i - 1][j] + 1, // extra spoken word
        D[i][j - 1] + 1, // passage word skipped
      );
    }
  }
  // the child stopped after passage word `end`; prefer the furthest end among equal costs
  let end = 0;
  for (let j = 1; j <= n; j++) if (D[m][j] <= D[m][end]) end = j;

  let i = m, j = end, correct = 0;
  while (i > 0 && j > 0) {
    const match = sameWord(T[i - 1], P[j - 1]);
    if (D[i][j] === D[i - 1][j - 1] + (match ? 0 : 1)) {
      marks[j - 1] = match ? "correct" : "error";
      if (match) correct++;
      i--; j--;
    } else if (D[i][j] === D[i][j - 1] + 1) {
      marks[j - 1] = "error"; j--;
    } else {
      i--;
    }
  }
  while (j > 0) { marks[j - 1] = "error"; j--; }
  return { wordsAttempted: end, wordsCorrect: correct, marks };
}

export interface ReadingFluencyResult {
  passageId: string;
  method: "speech" | "teacher";
  seconds: number;
  wordsAttempted: number;
  wordsCorrect: number;
  wcpm: number;
  accuracy: number;
  transcript?: string;
  norm: { p50: number; p25: number };
  belowExpected: boolean;
}

export function scoreReading(
  passage: ReadingPassage, grade: number, seconds: number, wordsAttempted: number, wordsCorrect: number,
  method: ReadingFluencyResult["method"], transcript?: string,
): ReadingFluencyResult {
  const s = Math.max(1, seconds);
  const wcpm = Math.round((wordsCorrect / s) * 60);
  const accuracy = wordsAttempted ? wordsCorrect / wordsAttempted : 0;
  const norm = wcpmNorm(grade);
  // DSM-5 reading specifier: slow (below the 25th percentile) or inaccurate (< 90%) reading
  const belowExpected = (passage.lang === "en" && wcpm < norm.p25) || accuracy < 0.9;
  return { passageId: passage.id, method, seconds: Math.round(s), wordsAttempted, wordsCorrect, wcpm, accuracy, transcript, norm, belowExpected };
}

// ---------------------------------------------------------------- arithmetic fact fluency

export interface MathFact {
  a: number;
  b: number;
  op: "+" | "−" | "×" | "÷";
  answer: number;
}

/** Deterministic pseudo-random generator so a session's facts are reproducible from its seed. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFacts(grade: number, count = 60, seed = Date.now()): MathFact[] {
  const r = mulberry32(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const facts: MathFact[] = [];
  for (let k = 0; k < count; k++) {
    const pick = r();
    if (grade <= 2 || pick < (grade <= 4 ? 0.5 : 0.25)) {
      const max = grade <= 1 ? 10 : 20;
      if (r() < 0.5) { const a = int(0, max / 2), b = int(0, max / 2); facts.push({ a, b, op: "+", answer: a + b }); }
      else { const a = int(1, max), b = int(0, a); facts.push({ a, b, op: "−", answer: a - b }); }
    } else if (grade <= 4 || pick < 0.65) {
      const a = int(2, grade <= 3 ? 5 : 10), b = int(1, 10);
      facts.push({ a, b, op: "×", answer: a * b });
    } else {
      const b = int(2, 10), q = int(1, 10);
      facts.push({ a: b * q, b, op: "÷", answer: q });
    }
  }
  return facts;
}

/** Expected facts correct per minute (approximate CBM benchmark; grades above 6 use grade 6). */
export function factNorm(grade: number): number {
  return [10, 10, 15, 20, 25, 30, 35][Math.min(6, Math.max(1, Math.round(grade) || 3))];
}

export interface FactFluencyResult {
  seconds: number;
  attempted: number;
  correct: number;
  correctPerMinute: number;
  accuracy: number;
  avgCorrectMs: number;
  expectedPerMinute: number;
  belowExpected: boolean;
  responses: { fact: string; given: string; correct: boolean; ms: number }[];
}

export function scoreFacts(
  responses: FactFluencyResult["responses"], seconds: number, grade: number,
): FactFluencyResult {
  const s = Math.max(1, seconds);
  const correct = responses.filter((x) => x.correct);
  const cpm = Math.round((correct.length / s) * 60 * 10) / 10;
  const accuracy = responses.length ? correct.length / responses.length : 0;
  const expected = factNorm(grade);
  const avgCorrectMs = correct.length ? Math.round(correct.reduce((t, x) => t + x.ms, 0) / correct.length) : 0;
  // DSM-5 maths specifier "accurate or fluent calculation": slow (< 60% of benchmark) or inaccurate (< 80%)
  const belowExpected = cpm < expected * 0.6 || (responses.length >= 5 && accuracy < 0.8);
  return { seconds: Math.round(s), attempted: responses.length, correct: correct.length, correctPerMinute: cpm,
    accuracy, avgCorrectMs, expectedPerMinute: expected, belowExpected, responses };
}
