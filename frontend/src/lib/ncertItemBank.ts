// NCERT-aligned, grade-scaled item bank for the DSM-5 screening battery.
//
// Levels: Grades 1-8 individually, then 9-10 and 11-12. Every level has the same task
// patterns (so the screening features stay comparable) and its own difficulty:
//   item 1 = review of the previous grade, items 2-3 = on grade, item 4 = stretch.
// A screener must sit AT grade expectation, not at the hardest textbook content, so items test
// reading/number skills, never subject knowledge (no "what does delta mean in physics").
//
// Sources for level-setting: NCERT Learning Outcomes at the Elementary Stage (2017), NCERT
// textbooks (Marigold / Honeysuckle / Honeydew / Poorvi / Beehive / First Flight; Rimjhim / Vasant /
// Kshitij; Math-Magic / Maths Mela / Ganita Prakash / Mathematics 9-12). Digit spans follow
// typical age norms (forward ~ age/2 + 1, backward ~ forward - 2); dot-ratio acuity follows the
// developmental approximate-number-system literature (about 1:2 at 6 years to 7:8 in adolescence).
// All passages and problems are original.

import type {
  ArithmeticQuestion, ComprehensionQuestion, DotClusterQuestion, MagnitudeQuestion, PhonologicalQuestion,
  PseudowordQuestion, SequenceQuestion, SymbolMappingQuestion, VisualConfusionQuestion, WorkingMemoryQuestion,
} from "./dsm5TestData";

export const ITEM_BANK_VERSION = "ncert-graded-2026.11";
export const LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9-10", "11-12"] as const;
export type Level = (typeof LEVELS)[number];
type Lang = "en" | "hi";

export function levelFor(grade: number): Level {
  const g = Math.round(grade) || 3;
  if (g <= 1) return "1";
  if (g <= 8) return String(g) as Level;
  return g <= 10 ? "9-10" : "11-12";
}
export const levelRank = (l: string) => Math.max(0, LEVELS.indexOf(l as Level));

const DIFF: (1 | 2 | 3)[] = [1, 2, 2, 3];
const diff = (i: number) => DIFF[Math.min(i, 3)];
const per = <T,>(fn: (lvl: Level, li: number) => T[]) => LEVELS.flatMap((l, i) => fn(l, i));

// =====================================================================================
// 1. Phonological awareness
// =====================================================================================
type PhonKind = PhonologicalQuestion["taskType"];
type P = [PhonKind, string, string | string[], string[], string];

const PHON: Record<Lang, Record<Level, P[]>> = {
  en: {
    "1": [
      ["odd-one-out", "Which word starts with a different sound?", ["cat", "car", "ball", "can"], [], "ball"],
      ["odd-one-out", "Which word starts with a different sound?", ["sun", "sit", "moon", "sock"], [], "moon"],
      ["rhyme", "Which word does NOT rhyme with the others?", ["hat", "cat", "bat", "pen"], [], "pen"],
      ["syllable-count", "How many parts (syllables) are in this word?", "rabbit", ["1", "2", "3", "4"], "2"],
    ],
    "2": [
      ["odd-one-out", "Which word ends with a different sound?", ["hat", "cat", "ham", "bat"], [], "ham"],
      ["rhyme", "Which word does NOT rhyme with the others?", ["cake", "lake", "book", "bake"], [], "book"],
      ["syllable-count", "How many parts (syllables) are in this word?", "banana", ["2", "3", "4", "5"], "3"],
      ["phoneme-deletion", 'Say "cat" without the "c" sound. What word do you get?', "cat → (remove c)", ["at", "ca", "ct", "hat"], "at"],
    ],
    "3": [
      ["syllable-count", "How many parts (syllables) are in this word?", "butterfly", ["2", "3", "4", "5"], "3"],
      ["syllable-count", "How many parts (syllables) are in this word?", "watermelon", ["2", "3", "4", "5"], "4"],
      ["phoneme-deletion", 'Say "smile" without the "s" sound. What word do you get?', "smile → (remove s)", ["mile", "sile", "smil", "mill"], "mile"],
      ["odd-one-out", "Which word has a different middle sound?", ["pin", "sit", "hop", "fig"], [], "hop"],
    ],
    "4": [
      ["phoneme-deletion", 'Say "stand" without the "t" sound. What word do you get?', "stand → (remove t)", ["sand", "stan", "tand", "sad"], "sand"],
      ["phoneme-deletion", 'Say "plant" without the "l" sound. What word do you get?', "plant → (remove l)", ["pant", "plan", "lant", "plat"], "pant"],
      ["syllable-count", "How many parts (syllables) are in this word?", "caterpillar", ["3", "4", "5", "6"], "4"],
      ["phoneme-count", 'How many sounds do you hear in "ship"?', "ship", ["2", "3", "4", "5"], "3"],
    ],
    "5": [
      ["phoneme-deletion", 'Say "frog" without the "r" sound. What word do you get?', "frog → (remove r)", ["fog", "frg", "rog", "fro"], "fog"],
      ["phoneme-substitution", 'Change the "c" in "cold" to "g". What word do you get?', "cold → (c → g)", ["gold", "cog", "goal", "colg"], "gold"],
      ["phoneme-count", 'How many sounds do you hear in "fish"?', "fish", ["2", "3", "4", "5"], "3"],
      ["syllable-count", "How many parts (syllables) are in this word?", "information", ["3", "4", "5", "6"], "4"],
    ],
    "6": [
      ["phoneme-deletion", 'Say "blast" without the "l" sound. What word do you get?', "blast → (remove l)", ["bast", "blat", "last", "bla"], "bast"],
      ["phoneme-substitution", 'Change the "t" in "train" to "b". What word do you get?', "train → (t → b)", ["brain", "bain", "trab", "rain"], "brain"],
      ["phoneme-count", 'How many sounds do you hear in "street"?', "street", ["4", "5", "6", "7"], "5"],
      ["syllable-count", "How many parts (syllables) are in this word?", "electricity", ["3", "4", "5", "6"], "5"],
    ],
    "7": [
      ["homophone", "Which pair of words sound exactly the same?", ["their / there", "cat / cut", "sun / sand", "big / bag"], [], "their / there"],
      ["silent-letter", "Which word has a silent letter?", ["knife", "nice", "kite", "fine"], [], "knife"],
      ["phoneme-reversal", 'Say "pat" backwards, sound by sound. What word do you get?', "pat → (backwards)", ["tap", "apt", "pot", "tip"], "tap"],
      ["phoneme-count", 'How many sounds do you hear in "splash"?', "splash", ["4", "5", "6", "7"], "5"],
    ],
    "8": [
      ["silent-letter", "Which word has a silent letter?", ["island", "inland", "insect", "inside"], [], "island"],
      ["homophone", 'Which word sounds the same as "weight"?', ["wait", "white", "what", "wet"], [], "wait"],
      ["phoneme-substitution", 'Swap the first sounds of "big dog". What do you get?', "big dog → (swap first sounds)", ["dig bog", "dog big", "bid gog", "pig dog"], "dig bog"],
      ["phoneme-count", 'How many sounds do you hear in "thought"?', "thought", ["3", "4", "5", "7"], "3"],
    ],
    "9-10": [
      ["stress", "Which word has its stress on the SECOND syllable?", ["begin", "garden", "table", "window"], [], "begin"],
      ["morpheme", 'How many meaningful parts (morphemes) are in "unhappiness"?', "unhappiness", ["1", "2", "3", "4"], "3"],
      ["rhyme", 'Which word rhymes with "through"?', ["blue", "rough", "though", "cough"], [], "blue"],
      ["silent-letter", "Which word has a silent letter?", ["psychology", "plastic", "protest", "product"], [], "psychology"],
    ],
    "11-12": [
      ["morpheme", 'How many meaningful parts (morphemes) are in "disagreements"?', "disagreements", ["2", "3", "4", "5"], "4"],
      ["stress", "Which word moves its stress when it changes from a noun to a verb?", ["record", "garden", "happy", "window"], [], "record"],
      ["rhyme", 'Which word rhymes with "colonel"?', ["journal", "colon", "channel", "panel"], [], "journal"],
      ["odd-one-out", 'Which word has the same vowel sound as "bird"?', ["word", "beard", "bored", "bed"], [], "word"],
    ],
  },
  hi: {
    "1": [
      ["odd-one-out", "कौन सा शब्द अलग आवाज़ से शुरू होता है?", ["माँ", "मछली", "गाय", "मिठाई"], [], "गाय"],
      ["odd-one-out", "कौन सा शब्द अलग आवाज़ से शुरू होता है?", ["कमल", "कप", "बतख", "कलम"], [], "बतख"],
      ["rhyme", "कौन सा शब्द बाकी शब्दों से तुक नहीं मिलाता?", ["मोर", "चोर", "शोर", "आम"], [], "आम"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "कमल", ["2", "3", "4", "5"], "3"],
    ],
    "2": [
      ["odd-one-out", "कौन सा शब्द अलग आवाज़ पर खत्म होता है?", ["आम", "काम", "नाम", "घर"], [], "घर"],
      ["rhyme", "कौन सा शब्द बाकी शब्दों से तुक नहीं मिलाता?", ["रानी", "पानी", "नानी", "बादल"], [], "बादल"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "तितली", ["2", "3", "4", "5"], "3"],
      ["phoneme-deletion", "'कमल' में से 'क' हटाओ। कौन सा शब्द बना?", "कमल → (क हटाओ)", ["मल", "कम", "कल", "मक"], "मल"],
    ],
    "3": [
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "अमरूद", ["3", "4", "5", "6"], "4"],
      ["phoneme-deletion", "'बादल' में से 'द' हटाओ। कौन सा शब्द बना?", "बादल → (द हटाओ)", ["बाल", "बाद", "दल", "बल"], "बाल"],
      ["phoneme-substitution", "'नाक' में 'न' की जगह 'च' लगाओ। कौन सा शब्द बना?", "नाक → (न → च)", ["चाक", "नाच", "चक", "काक"], "चाक"],
      ["odd-one-out", "किस शब्द की मात्रा बाकी से अलग है?", ["मीठा", "सीटी", "पीला", "गोल"], [], "गोल"],
    ],
    "4": [
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "पाठशाला", ["3", "4", "5", "6"], "4"],
      ["phoneme-deletion", "'मकान' में से 'म' हटाओ। कौन सा शब्द बना?", "मकान → (म हटाओ)", ["कान", "मान", "मका", "कम"], "कान"],
      ["phoneme-substitution", "'मोर' में 'म' की जगह 'च' लगाओ। कौन सा शब्द बना?", "मोर → (म → च)", ["चोर", "मोच", "शोर", "चमोर"], "चोर"],
      ["odd-one-out", "किस शब्द में 'ऊ' (ू) की मात्रा है?", ["फूल", "फल", "फिर", "फेर"], [], "फूल"],
    ],
    "5": [
      ["odd-one-out", "किस शब्द में संयुक्त अक्षर (आधा अक्षर) है?", ["प्यार", "पानी", "पेड़", "पैर"], [], "प्यार"],
      ["phoneme-deletion", "'चमक' में से 'म' हटाओ। कौन सा शब्द बना?", "चमक → (म हटाओ)", ["चक", "मक", "चम", "कम"], "चक"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "विद्यालय", ["3", "4", "5", "6"], "4"],
      ["rhyme", "कौन सा शब्द बाकी शब्दों से तुक नहीं मिलाता?", ["गाना", "खाना", "जाना", "जंगल"], [], "जंगल"],
    ],
    "6": [
      ["odd-one-out", "किस शब्द में रेफ (र्) है?", ["धर्म", "धरा", "धारा", "धन"], [], "धर्म"],
      ["odd-one-out", "किस शब्द में अनुस्वार (ं) है?", ["पंखा", "पका", "पाक", "पिता"], [], "पंखा"],
      ["phoneme-substitution", "'खेल' में 'ख' की जगह 'म' लगाओ। कौन सा शब्द बना?", "खेल → (ख → म)", ["मेल", "खम", "मल", "केल"], "मेल"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "स्वतंत्रता", ["3", "4", "5", "6"], "4"],
    ],
    "7": [
      ["phoneme-deletion", "'कमरा' में से 'म' हटाओ। कौन सा शब्द बना?", "कमरा → (म हटाओ)", ["करा", "कम", "मरा", "कर"], "करा"],
      ["odd-one-out", "कौन सा शब्द अलग ध्वनि पर खत्म होता है?", ["पढ़ाई", "लड़ाई", "चढ़ाई", "पढ़ना"], [], "पढ़ना"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "प्रयोगशाला", ["4", "5", "6", "7"], "5"],
      ["rhyme", "कौन सा शब्द 'बादल' से तुक मिलाता है?", ["पागल", "बादाम", "बाज़ार", "बालक"], [], "पागल"],
    ],
    "8": [
      ["morpheme", "'विद्यालय' किन दो शब्दों से मिलकर बना है?", ["विद्या + आलय", "विद् + यालय", "वि + द्यालय", "विद्य + आलय"], [], "विद्या + आलय"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "अंतरराष्ट्रीय", ["4", "5", "6", "7"], "6"],
      ["odd-one-out", "किस शब्द में 'ड़' है?", ["पेड़", "पेट", "पेठा", "पेन"], [], "पेड़"],
      ["phoneme-substitution", "'नाम' में 'न' की जगह 'क' लगाओ। कौन सा शब्द बना?", "नाम → (न → क)", ["काम", "नाक", "कान", "मान"], "काम"],
    ],
    "9-10": [
      ["morpheme", "'सूर्योदय' का सही संधि-विच्छेद कौन सा है?", ["सूर्य + उदय", "सूर + योदय", "सूर्यो + दय", "सू + र्योदय"], [], "सूर्य + उदय"],
      ["morpheme", "'असफलता' में कितने सार्थक भाग हैं?", "असफलता", ["1", "2", "3", "4"], "3"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "परिस्थितियाँ", ["4", "5", "6", "7"], "5"],
      ["odd-one-out", "किस शब्द में 'ज्ञ' है?", ["ज्ञान", "जान", "गान", "ध्यान"], [], "ज्ञान"],
    ],
    "11-12": [
      ["morpheme", "'विद्यार्थी' का सही संधि-विच्छेद कौन सा है?", ["विद्या + अर्थी", "विद्य + आर्थी", "विद् + यार्थी", "विद्या + र्थी"], [], "विद्या + अर्थी"],
      ["morpheme", "'बेईमानी' में कितने सार्थक भाग हैं?", "बेईमानी", ["1", "2", "3", "4"], "3"],
      ["syllable-count", "इस शब्द में कितने अक्षर हैं?", "आत्मविश्वास", ["4", "5", "6", "7"], "5"],
      ["morpheme", "'राजपुत्र' का सही विग्रह कौन सा है?", ["राजा का पुत्र", "राज और पुत्र", "राज्य में पुत्र", "राजा से पुत्र"], [], "राजा का पुत्र"],
    ],
  },
};

function phonological(lang: Lang): PhonologicalQuestion[] {
  return per((lvl, li) =>
    PHON[lang][lvl].map(([taskType, instruction, stimulus, opts, ans], i) => ({
      id: `pa-${lang}-${lvl}-${i + 1}`, instruction, stimulus,
      options: opts.length ? opts : (stimulus as string[]),
      correctAnswer: ans, difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "phonological-awareness",
      taskType, timeLimit: li < 2 ? 20 : 15,
    }))
  );
}

// =====================================================================================
// 2. Word decoding (read aloud). Real NCERT-vocabulary words: speech recognition maps true
//    pseudowords onto real words, so decoding load is scaled by length and spelling patterns.
// =====================================================================================
const DECODE: Record<Lang, Record<Level, string[]>> = {
  en: {
    "1": ["sun", "jump", "ship", "green"],
    "2": ["basket", "rabbit", "flower", "night"],
    "3": ["together", "kitchen", "elephant", "brought"],
    "4": ["important", "machine", "whistle", "different"],
    "5": ["adventure", "knowledge", "neighbour", "temperature"],
    "6": ["photograph", "vegetable", "comfortable", "experiment"],
    "7": ["environment", "magnificent", "Wednesday", "particularly"],
    "8": ["independence", "responsibility", "pronunciation", "laboratory"],
    "9-10": ["approximately", "sophisticated", "miscellaneous", "entrepreneur"],
    "11-12": ["photosynthesis", "consciousness", "circumference", "characteristically"],
  },
  hi: {
    "1": ["घर", "नल", "आम", "कमल"],
    "2": ["बादल", "तितली", "गुड़िया", "मछली"],
    "3": ["किताब", "अमरूद", "खिलौना", "दरवाज़ा"],
    "4": ["पाठशाला", "त्योहार", "बरसात", "कहानी"],
    "5": ["विद्यालय", "प्रार्थना", "स्वतंत्र", "अध्यापक"],
    "6": ["स्वास्थ्य", "प्रदर्शनी", "संस्कृति", "व्यायाम"],
    "7": ["प्रयोगशाला", "परिश्रम", "उत्सुकता", "आश्चर्य"],
    "8": ["अंतरराष्ट्रीय", "उत्तरदायित्व", "प्रतिष्ठा", "व्यक्तित्व"],
    "9-10": ["परिस्थितियाँ", "सांस्कृतिक", "ऐतिहासिक", "प्रोत्साहन"],
    "11-12": ["प्रतिस्पर्धा", "वैज्ञानिकता", "अभिव्यक्ति", "आत्मनिर्भरता"],
  },
};

function decoding(lang: Lang): PseudowordQuestion[] {
  return per((lvl, li) =>
    DECODE[lang][lvl].map((w, i) => ({
      id: `pw-${lang}-${lvl}-${i + 1}`, instruction: lang === "hi" ? "यह शब्द साफ़ आवाज़ में पढ़ें:" : "Read this word clearly:",
      stimulus: w, phonemes: [...w], correctAnswer: w, difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "decoding",
      timeLimit: 8 + Math.min(6, Math.floor(li / 2)),
    }))
  );
}

// =====================================================================================
// 3. Visual word confusion: spot the correct spelling, same/different pairs, context choice
// =====================================================================================
type VKind = VisualConfusionQuestion["confusionType"];
type V = ["spell" | "pair" | "context", VKind, string | string[], string[], string, string?];

const VIS: Record<Lang, Record<Level, V[]>> = {
  en: {
    "1": [
      ["spell", "reversal", "dog", ["dog", "bog", "gob", "dgo"], "dog"],
      ["pair", "reversal", ["was", "saw"], [], "Different"],
      ["pair", "similar-shape", ["pin", "pin"], [], "Same"],
      ["spell", "reversal", "bed", ["deb", "bed", "dbe", "ped"], "bed"],
    ],
    "2": [
      ["spell", "transposition", "play", ["play", "paly", "qlay", "plya"], "play"],
      ["pair", "reversal", ["on", "no"], [], "Different"],
      ["spell", "reversal", "big", ["dig", "big", "gib", "bgi"], "big"],
      ["pair", "similar-shape", ["step", "step"], [], "Same"],
    ],
    "3": [
      ["pair", "transposition", ["form", "from"], [], "Different"],
      ["spell", "transposition", "friend", ["friend", "freind", "frend", "firend"], "friend"],
      ["pair", "transposition", ["quite", "quiet"], [], "Different"],
      ["spell", "transposition", "said", ["siad", "said", "sed", "saib"], "said"],
    ],
    "4": [
      ["spell", "transposition", "because", ["becuase", "because", "beacuse", "becouse"], "because"],
      ["pair", "transposition", ["calm", "clam"], [], "Different"],
      ["pair", "transposition", ["angel", "angle"], [], "Different"],
      ["pair", "similar-shape", ["through", "through"], [], "Same"],
    ],
    "5": [
      ["spell", "similar-shape", "beautiful", ["beatiful", "beautiful", "beutiful", "beautifull"], "beautiful"],
      ["context", "similar-shape", "The ______ is very cold today.", ["weather", "whether"], "weather"],
      ["pair", "transposition", ["diary", "dairy"], [], "Different"],
      ["spell", "transposition", "science", ["sceince", "sciense", "science", "scince"], "science"],
    ],
    "6": [
      ["spell", "similar-shape", "necessary", ["neccessary", "necesary", "necessary", "nessecary"], "necessary"],
      ["context", "similar-shape", "Can I have a ______ of cake?", ["peace", "piece"], "piece"],
      ["pair", "similar-shape", ["desert", "dessert"], [], "Different"],
      ["spell", "transposition", "receive", ["recieve", "receive", "receeve", "reseive"], "receive"],
    ],
    "7": [
      ["context", "similar-shape", "She was happy to ______ the prize.", ["except", "accept"], "accept"],
      ["spell", "similar-shape", "government", ["goverment", "government", "govermant", "governmant"], "government"],
      ["pair", "transposition", ["casual", "causal"], [], "Different"],
      ["context", "similar-shape", "Loud noise can ______ your sleep.", ["affect", "effect"], "affect"],
    ],
    "8": [
      ["spell", "similar-shape", "occasion", ["ocassion", "occassion", "occasion", "ocasion"], "occasion"],
      ["pair", "similar-shape", ["conscience", "conscious"], [], "Different"],
      ["context", "similar-shape", "Her calm nature is a perfect ______ to his energy.", ["compliment", "complement"], "complement"],
      ["spell", "similar-shape", "separate", ["seperate", "separate", "separete", "saparate"], "separate"],
    ],
    "9-10": [
      ["context", "similar-shape", "The teacher's question tried to ______ an answer.", ["illicit", "elicit"], "elicit"],
      ["spell", "similar-shape", "accommodation", ["accomodation", "acommodation", "accommodation", "accommadation"], "accommodation"],
      ["pair", "similar-shape", ["prescribe", "proscribe"], [], "Different"],
      ["spell", "similar-shape", "embarrass", ["embarass", "embarrass", "embarras", "embaress"], "embarrass"],
    ],
    "11-12": [
      ["context", "similar-shape", "The ______ reason for the delay was heavy rain.", ["principle", "principal"], "principal"],
      ["spell", "similar-shape", "conscientious", ["consciencious", "conscientous", "conscientious", "conscientiuos"], "conscientious"],
      ["pair", "similar-shape", ["eminent", "imminent"], [], "Different"],
      ["spell", "similar-shape", "millennium", ["millenium", "milennium", "millennium", "millenniun"], "millennium"],
    ],
  },
  hi: {
    "1": [
      ["spell", "similar-shape", "घर", ["धर", "घर", "गर", "घार"], "घर"],
      ["pair", "reversal", ["बल", "लब"], [], "अलग"],
      ["pair", "similar-shape", ["कमल", "कमल"], [], "एक जैसे"],
      ["spell", "similar-shape", "मछली", ["मछलि", "मचली", "मछली", "भछली"], "मछली"],
    ],
    "2": [
      ["spell", "similar-shape", "किताब", ["कीताब", "किताब", "कितब", "किताव"], "किताब"],
      ["pair", "transposition", ["नमक", "नकम"], [], "अलग"],
      ["spell", "similar-shape", "बादल", ["बाधल", "बादाल", "बादल", "वादल"], "बादल"],
      ["pair", "similar-shape", ["बतख", "बतख"], [], "एक जैसे"],
    ],
    "3": [
      ["pair", "reversal", ["राम", "मरा"], [], "अलग"],
      ["spell", "similar-shape", "गुलाब", ["गुलाव", "गूलाब", "गुलाब", "गुलब"], "गुलाब"],
      ["pair", "similar-shape", ["खाना", "खाना"], [], "एक जैसे"],
      ["spell", "similar-shape", "पढ़ाई", ["पड़ाई", "पढ़ाई", "पढाइ", "पठाई"], "पढ़ाई"],
    ],
    "4": [
      ["spell", "similar-shape", "त्योहार", ["तयोहार", "त्यौहर", "त्योहार", "त्योहर"], "त्योहार"],
      ["pair", "similar-shape", ["कुल", "कूल"], [], "अलग"],
      ["spell", "similar-shape", "शाम", ["साम", "शाम", "षाम", "शम"], "शाम"],
      ["pair", "similar-shape", ["मेला", "मेला"], [], "एक जैसे"],
    ],
    "5": [
      ["spell", "similar-shape", "विद्यालय", ["विधालय", "विद्यलय", "विद्यालय", "विदयालय"], "विद्यालय"],
      ["context", "similar-shape", "रात के बाद ______ आता है।", ["दिन", "दीन"], "दिन"],
      ["pair", "similar-shape", ["अनल", "अनिल"], [], "अलग"],
      ["spell", "similar-shape", "परीक्षा", ["परिक्षा", "परीक्षा", "परीछा", "परीक्शा"], "परीक्षा"],
    ],
    "6": [
      ["spell", "similar-shape", "आशीर्वाद", ["आर्शीवाद", "आशिर्वाद", "आशीर्वाद", "आशीरवाद"], "आशीर्वाद"],
      ["context", "similar-shape", "पानी को ______ भी कहते हैं।", ["नीड़", "नीर"], "नीर"],
      ["pair", "similar-shape", ["बुरा", "बूरा"], [], "अलग"],
      ["spell", "similar-shape", "उज्ज्वल", ["उज्वल", "उज्ज्वल", "उजज्वल", "उज्जवल"], "उज्ज्वल"],
    ],
    "7": [
      ["spell", "similar-shape", "श्रीमान", ["श्रिमान", "शरीमान", "श्रीमान", "श्रीमन"], "श्रीमान"],
      ["context", "similar-shape", "दरवाज़े को ______ भी कहते हैं।", ["कपट", "कपाट"], "कपाट"],
      ["pair", "similar-shape", ["सुत", "सूत"], [], "अलग"],
      ["spell", "similar-shape", "अत्यधिक", ["अत्याधिक", "अत्यधिक", "अतयधिक", "अत्यधीक"], "अत्यधिक"],
    ],
    "8": [
      ["spell", "similar-shape", "उपर्युक्त", ["उपरोक्त", "उपरयुक्त", "उपर्युक्त", "उपर्यूक्त"], "उपर्युक्त"],
      ["context", "similar-shape", "राम ने रावण का ______ किया।", ["संसार", "संहार"], "संहार"],
      ["pair", "similar-shape", ["प्रणाम", "परिणाम"], [], "अलग"],
      ["spell", "similar-shape", "पुनर्निर्माण", ["पुर्ननिर्माण", "पुनर्निर्माण", "पुनरनिर्माण", "पुनर्निमार्ण"], "पुनर्निर्माण"],
    ],
    "9-10": [
      ["spell", "similar-shape", "कवयित्री", ["कवियत्री", "कवियित्री", "कवयित्री", "कवयत्री"], "कवयित्री"],
      ["context", "similar-shape", "परीक्षा की ______ तीन घंटे है।", ["अवधी", "अवधि"], "अवधि"],
      ["pair", "similar-shape", ["प्रसाद", "प्रासाद"], [], "अलग"],
      ["spell", "similar-shape", "दृष्टि", ["द्रष्टि", "दृष्टी", "दृष्टि", "दिष्टि"], "दृष्टि"],
    ],
    "11-12": [
      ["spell", "similar-shape", "ज्योत्स्ना", ["ज्योत्सना", "जोत्स्ना", "ज्योत्स्ना", "ज्योत्स्न"], "ज्योत्स्ना"],
      ["context", "similar-shape", "राजा का ______ बहुत सुंदर था।", ["प्रसाद", "प्रासाद"], "प्रासाद"],
      ["pair", "similar-shape", ["अभिराम", "अविराम"], [], "अलग"],
      ["spell", "similar-shape", "अनधिकृत", ["अनाधिकृत", "अनधिकृत", "अनधिक्रत", "अनधिकरत"], "अनधिकृत"],
    ],
  },
};

const VIS_TEXT = {
  en: { spell: "Which word is spelled correctly?", pair: "Are these two words the same or different?", context: "Choose the word that fits the sentence:", same: "Same", different: "Different" },
  hi: { spell: "कौन सा शब्द सही लिखा है?", pair: "क्या ये दोनों शब्द एक जैसे हैं या अलग?", context: "वाक्य में सही बैठने वाला शब्द चुनें:", same: "एक जैसे", different: "अलग" },
};

function visual(lang: Lang): VisualConfusionQuestion[] {
  const tx = VIS_TEXT[lang];
  return per((lvl) =>
    VIS[lang][lvl].map(([kind, confusionType, stimulus, opts, ans], i) => ({
      id: `vc-${lang}-${lvl}-${i + 1}`, instruction: tx[kind], stimulus,
      options: kind === "pair" ? [tx.same, tx.different] : opts,
      correctAnswer: ans, difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "visual-processing", confusionType,
      timeLimit: kind === "pair" ? 10 : kind === "context" ? 20 : 15,
    }))
  );
}

// =====================================================================================
// 4. Reading comprehension: two original passages per level, three questions
//    (literal recall, then inference / main idea from Grade 4 up).
// =====================================================================================
type Q = [string, string[], string];
type Passage = { text: string; qs: Q[] };

const COMP: Record<Lang, Record<Level, Passage[]>> = {
  en: {
    "1": [
      { text: "Raju has a small dog. The dog is white. It likes to run in the park.", qs: [
        ["What colour is the dog?", ["White", "Black", "Brown", "Red"], "White"],
        ["Where does the dog like to run?", ["In the park", "In the house", "On the road", "In the school"], "In the park"]] },
      { text: "Meena has two red apples. She gives one apple to her friend.", qs: [
        ["How many apples does Meena have now?", ["One", "Two", "Three", "None"], "One"]] },
    ],
    "2": [
      { text: "It was raining. Sita took her blue umbrella and walked to school. Her shoes got wet, but her bag stayed dry.", qs: [
        ["What colour was the umbrella?", ["Blue", "Red", "Green", "Yellow"], "Blue"],
        ["What got wet?", ["Her shoes", "Her bag", "Her book", "Her umbrella"], "Her shoes"]] },
      { text: "Ali plants a seed in a pot. He gives it water every day. After a week, a small green leaf comes out.", qs: [
        ["What did Ali give the seed every day?", ["Water", "Milk", "Sand", "Sugar"], "Water"]] },
    ],
    "3": [
      { text: "The farmer wakes up early every morning. He goes to his field and waters the plants. His crops grow tall and green. At the market, people buy his vegetables because they are fresh.", qs: [
        ["When does the farmer wake up?", ["Early in the morning", "At night", "In the afternoon", "Late in the morning"], "Early in the morning"],
        ["Why do people buy his vegetables?", ["Because they are fresh", "Because they are cheap", "Because they are big", "Because they are red"], "Because they are fresh"]] },
      { text: "Tara's grandmother told her a story about a clever crow. The crow was thirsty. It dropped small stones into a pot until the water came up, and then it drank.", qs: [
        ["Why did the crow drop stones into the pot?", ["To make the water come up", "To break the pot", "To play a game", "To feed its babies"], "To make the water come up"]] },
    ],
    "4": [
      { text: "Every Sunday, Arjun helps his father at their small shop. He counts the coins, arranges the packets on the shelves and greets the customers with a smile. Last Sunday, an old woman forgot her purse on the counter. Arjun ran after her and returned it. She thanked him and called him an honest boy.", qs: [
        ["What did the old woman forget?", ["Her purse", "Her bag", "Her glasses", "Her umbrella"], "Her purse"],
        ["Why did she call Arjun honest?", ["He returned her purse", "He counted the coins", "He smiled at her", "He worked on Sunday"], "He returned her purse"]] },
      { text: "Bats sleep during the day, hanging upside down in dark caves. When the sun sets, they fly out to find food. Many bats eat insects, so farmers are happy to have them nearby.", qs: [
        ["Why are farmers happy to have bats nearby?", ["Bats eat insects", "Bats sleep in caves", "Bats fly at night", "Bats hang upside down"], "Bats eat insects"]] },
    ],
    "5": [
      { text: "Kavya's class went on a trip to a lake near the hills. Their teacher asked them to count the birds they saw. Kavya spotted ducks, a heron standing on one leg and a kingfisher that dived into the water and came up with a fish. By the end of the day, the class had counted fourteen kinds of birds. Kavya wrote them all in her notebook so she would not forget.", qs: [
        ["What did the kingfisher do?", ["Dived and caught a fish", "Stood on one leg", "Swam with the ducks", "Sat on a tree"], "Dived and caught a fish"],
        ["Why did Kavya write the birds in her notebook?", ["So she would not forget them", "Because the teacher was angry", "To draw pictures", "To sell the notebook"], "So she would not forget them"]] },
      { text: "In the old days, people sent messages using pigeons. A trained pigeon could fly back home from far away, carrying a small note tied to its leg. Today we send messages in seconds using phones, but some people still keep pigeons as a hobby.", qs: [
        ["What is the passage mainly about?", ["How messages were once sent by pigeons", "How to repair a phone", "What pigeons eat", "How to tie a knot"], "How messages were once sent by pigeons"]] },
    ],
    "6": [
      { text: "Nidhi noticed that the tap in her school's washroom kept dripping. She placed a bottle under it during lunch and found that it filled half a litre in one hour. She did the maths: that was twelve litres a day, wasted from just one tap. Nidhi wrote a letter to the principal, and the next week a plumber fixed every leaking tap in the school. Her classmates started calling her the 'water detective'.", qs: [
        ["How much water did the tap waste in one hour?", ["Half a litre", "One litre", "Twelve litres", "Two litres"], "Half a litre"],
        ["Why did her classmates call her the 'water detective'?", ["She found and stopped a water-wasting problem", "She fixed the taps herself", "She drank a lot of water", "She wanted to be a plumber"], "She found and stopped a water-wasting problem"]] },
      { text: "Honeybees do a special 'waggle dance' when they return to the hive. The direction of the dance tells other bees which way to fly, and the length of the dance tells them how far away the flowers are. In this way, a single bee can guide the whole hive to food.", qs: [
        ["What does the length of the waggle dance tell other bees?", ["How far away the flowers are", "Which way to fly", "How many bees to send", "What colour the flowers are"], "How far away the flowers are"]] },
    ],
    "7": [
      { text: "When the village pond dried up, the elders said nothing could be done until the next monsoon. Fourteen-year-old Ravi disagreed. He gathered his friends, and together they removed the plastic and mud that had blocked the channels feeding the pond. They also planted grass along the banks so that soil would not wash in again. When the rains came, the pond filled faster than anyone remembered, and it stayed full well into summer.", qs: [
        ["What had blocked the channels?", ["Plastic and mud", "Rocks and trees", "Animals", "Grass"], "Plastic and mud"],
        ["Why did they plant grass along the banks?", ["To stop soil washing into the pond", "To feed the cows", "To make the pond look nice", "To sell the grass"], "To stop soil washing into the pond"]] },
      { text: "Some people believe that reading on a screen is the same as reading on paper. Studies, however, suggest that readers often skim when they use screens and remember less of what they read. Paper, it seems, encourages slower and more careful reading. This does not mean screens are bad; it means we should be aware of how we read.", qs: [
        ["What is the writer's main point?", ["We should be aware of how we read on screens and paper", "Screens are always bad", "Paper is too expensive", "Nobody should use screens"], "We should be aware of how we read on screens and paper"]] },
    ],
    "8": [
      { text: "For years, the small town relied on a single bus that ran twice a day. Students who missed it walked eight kilometres to school. When the town council asked residents for ideas, a group of Class 8 students surveyed their neighbours and discovered that more than two hundred people travelled the same route every morning. They presented the numbers at a council meeting. Convinced by the evidence, the council added three more buses.", qs: [
        ["What did the students discover from their survey?", ["Over two hundred people used the same route", "The bus was always late", "Nobody needed a bus", "Students preferred walking"], "Over two hundred people used the same route"],
        ["What lesson does the story teach?", ["A clear argument backed by facts can change decisions", "Buses are expensive", "Walking is healthy", "Councils never listen"], "A clear argument backed by facts can change decisions"]] },
      { text: "The mangrove forests of the Sundarbans act like a natural wall. Their tangled roots hold the soil in place and slow down the waves during storms. When mangroves are cut, the coastline becomes more open to flooding. Protecting these forests therefore protects the people who live behind them.", qs: [
        ["According to the passage, why are mangroves important?", ["They protect the coast from storms and flooding", "They give sweet fruit", "They are good for building houses", "They attract tourists"], "They protect the coast from storms and flooding"]] },
    ],
    "9-10": [
      { text: "Anaya had always assumed that her grandmother's stories about the village were exaggerated. Then, during a school project on local history, she found an old newspaper report describing the very flood her grandmother spoke of, down to the night the temple bell rang to warn the families on the riverbank. Anaya realised that memories passed down in families can preserve details that official records sometimes miss, and she began recording her grandmother's stories on her phone.", qs: [
        ["What did the newspaper report confirm?", ["Her grandmother's account of the flood", "That the temple was new", "That nobody lived by the river", "That the flood never happened"], "Her grandmother's account of the flood"],
        ["Why did Anaya start recording the stories?", ["She realised family memories preserve valuable details", "She wanted to win a prize", "Her teacher made her", "She wanted to sell them"], "She realised family memories preserve valuable details"]] },
      { text: "Saving money is wise for one family. But if every family in a country suddenly saves more at the same time, people buy fewer goods. Shops then sell less, businesses cut jobs, and incomes fall, so in the end the country may not save more at all. Economists call this the paradox of thrift.", qs: [
        ["What does the passage suggest?", ["What is good for one family may not be good for the whole country", "Saving money is always bad", "Shops should close", "Families should never save"], "What is good for one family may not be good for the whole country"]] },
    ],
    "11-12": [
      { text: "Critics of standardised examinations argue that a three-hour paper cannot capture what a student has learned over a year. Supporters reply that exams, whatever their flaws, apply the same yardstick to everyone and are harder to manipulate than continuous assessment. The truth may lie between the two positions: a system that combines a fair final examination with carefully moderated classwork could reward both consistent effort and the ability to perform under pressure. Such a system would, of course, demand more time and trust from teachers, which is perhaps why it remains rare.", qs: [
        ["What do supporters of examinations argue?", ["Exams apply the same standard to everyone", "Exams capture everything a student learns", "Exams should be removed", "Classwork is easier to mark"], "Exams apply the same standard to everyone"],
        ["What is the writer's own view?", ["Combining exams with moderated classwork may be best", "Exams should be abolished", "Only classwork matters", "Exams are perfect as they are"], "Combining exams with moderated classwork may be best"]] },
      { text: "Urban heat islands form when cities replace soil and trees with concrete and asphalt, which absorb sunlight during the day and release heat at night. As a result, a city centre can be several degrees warmer than the countryside around it. Planting trees, creating parks and using light-coloured roofs are among the simplest ways to cool a city.", qs: [
        ["Which of these would the writer most likely support?", ["Painting roofs in light colours", "Replacing parks with car parks", "Cutting trees to widen roads", "Using darker road surfaces"], "Painting roofs in light colours"]] },
    ],
  },
  hi: {
    "1": [
      { text: "राजू के पास एक छोटा कुत्ता है। कुत्ता सफ़ेद है। उसे बाग में दौड़ना अच्छा लगता है।", qs: [
        ["कुत्ता किस रंग का है?", ["सफ़ेद", "काला", "भूरा", "लाल"], "सफ़ेद"],
        ["कुत्ते को कहाँ दौड़ना अच्छा लगता है?", ["बाग में", "घर में", "सड़क पर", "स्कूल में"], "बाग में"]] },
      { text: "मीना के पास दो लाल सेब हैं। वह एक सेब अपनी सहेली को देती है।", qs: [
        ["अब मीना के पास कितने सेब हैं?", ["एक", "दो", "तीन", "एक भी नहीं"], "एक"]] },
    ],
    "2": [
      { text: "बारिश हो रही थी। सीता अपना नीला छाता लेकर स्कूल गई। उसके जूते गीले हो गए, पर उसका बस्ता सूखा रहा।", qs: [
        ["छाता किस रंग का था?", ["नीला", "लाल", "हरा", "पीला"], "नीला"],
        ["क्या गीला हो गया?", ["उसके जूते", "उसका बस्ता", "उसकी किताब", "उसका छाता"], "उसके जूते"]] },
      { text: "अली गमले में एक बीज बोता है। वह रोज़ उसे पानी देता है। एक हफ़्ते बाद एक छोटी हरी पत्ती निकलती है।", qs: [
        ["अली बीज को रोज़ क्या देता था?", ["पानी", "दूध", "रेत", "चीनी"], "पानी"]] },
    ],
    "3": [
      { text: "किसान रोज़ सुबह जल्दी उठता है। वह अपने खेत में जाकर पौधों को पानी देता है। उसकी फ़सल ऊँची और हरी होती है। बाज़ार में लोग उसकी सब्ज़ियाँ खरीदते हैं क्योंकि वे ताज़ी होती हैं।", qs: [
        ["किसान कब उठता है?", ["सुबह जल्दी", "रात को", "दोपहर में", "देर सुबह"], "सुबह जल्दी"],
        ["लोग उसकी सब्ज़ियाँ क्यों खरीदते हैं?", ["क्योंकि वे ताज़ी होती हैं", "क्योंकि वे सस्ती होती हैं", "क्योंकि वे बड़ी होती हैं", "क्योंकि वे लाल होती हैं"], "क्योंकि वे ताज़ी होती हैं"]] },
      { text: "तारा की दादी ने उसे एक चतुर कौवे की कहानी सुनाई। कौवा प्यासा था। उसने घड़े में छोटे-छोटे पत्थर डाले, जब तक पानी ऊपर नहीं आ गया, और फिर पानी पिया।", qs: [
        ["कौवे ने घड़े में पत्थर क्यों डाले?", ["पानी ऊपर लाने के लिए", "घड़ा तोड़ने के लिए", "खेल खेलने के लिए", "बच्चों को खिलाने के लिए"], "पानी ऊपर लाने के लिए"]] },
    ],
    "4": [
      { text: "हर रविवार अर्जुन अपने पिता की छोटी दुकान पर मदद करता है। वह सिक्के गिनता है, अलमारियों में पैकेट सजाता है और मुस्कुराकर ग्राहकों का स्वागत करता है। पिछले रविवार एक बूढ़ी औरत अपना बटुआ काउंटर पर भूल गई। अर्जुन दौड़कर उसके पीछे गया और बटुआ लौटा दिया। उसने धन्यवाद दिया और उसे ईमानदार लड़का कहा।", qs: [
        ["बूढ़ी औरत क्या भूल गई थी?", ["अपना बटुआ", "अपना थैला", "अपना चश्मा", "अपना छाता"], "अपना बटुआ"],
        ["उसने अर्जुन को ईमानदार क्यों कहा?", ["उसने बटुआ लौटा दिया", "उसने सिक्के गिने", "वह मुस्कुराया", "उसने रविवार को काम किया"], "उसने बटुआ लौटा दिया"]] },
      { text: "चमगादड़ दिन में अँधेरी गुफ़ाओं में उल्टे लटककर सोते हैं। सूरज ढलने पर वे भोजन ढूँढने निकलते हैं। बहुत से चमगादड़ कीड़े खाते हैं, इसलिए किसान उन्हें पास रहना पसंद करते हैं।", qs: [
        ["किसान चमगादड़ों को पास रहना क्यों पसंद करते हैं?", ["चमगादड़ कीड़े खाते हैं", "चमगादड़ गुफ़ा में सोते हैं", "चमगादड़ रात में उड़ते हैं", "चमगादड़ उल्टे लटकते हैं"], "चमगादड़ कीड़े खाते हैं"]] },
    ],
    "5": [
      { text: "काव्या की कक्षा पहाड़ों के पास एक झील की सैर पर गई। अध्यापिका ने बच्चों से दिखने वाले पक्षी गिनने को कहा। काव्या ने बत्तखें देखीं, एक पैर पर खड़ा बगुला देखा और एक किलकिला देखा जो पानी में गोता लगाकर मछली पकड़ लाया। दिन के अंत तक कक्षा ने चौदह तरह के पक्षी गिन लिए। काव्या ने सबके नाम अपनी कॉपी में लिख लिए ताकि वह भूल न जाए।", qs: [
        ["किलकिले ने क्या किया?", ["गोता लगाकर मछली पकड़ी", "एक पैर पर खड़ा रहा", "बत्तखों के साथ तैरा", "पेड़ पर बैठा रहा"], "गोता लगाकर मछली पकड़ी"],
        ["काव्या ने पक्षियों के नाम कॉपी में क्यों लिखे?", ["ताकि वह भूल न जाए", "क्योंकि अध्यापिका नाराज़ थीं", "चित्र बनाने के लिए", "कॉपी बेचने के लिए"], "ताकि वह भूल न जाए"]] },
      { text: "पुराने समय में लोग कबूतरों से संदेश भेजते थे। सिखाया हुआ कबूतर दूर से भी घर लौट आता था, उसके पैर में एक छोटी चिट्ठी बँधी होती थी। आज हम फ़ोन से पल भर में संदेश भेज देते हैं, फिर भी कुछ लोग शौक के लिए कबूतर पालते हैं।", qs: [
        ["यह अनुच्छेद मुख्य रूप से किस बारे में है?", ["पहले कबूतरों से संदेश कैसे भेजे जाते थे", "फ़ोन कैसे ठीक करें", "कबूतर क्या खाते हैं", "गाँठ कैसे बाँधें"], "पहले कबूतरों से संदेश कैसे भेजे जाते थे"]] },
    ],
    "6": [
      { text: "निधि ने देखा कि स्कूल के शौचालय का नल लगातार टपकता रहता है। उसने खाने की छुट्टी में नल के नीचे एक बोतल रखी और पाया कि एक घंटे में आधा लीटर पानी भर गया। उसने हिसाब लगाया: एक ही नल से रोज़ बारह लीटर पानी बर्बाद हो रहा था। निधि ने प्रधानाचार्य को पत्र लिखा और अगले हफ़्ते प्लंबर ने स्कूल के सारे टपकते नल ठीक कर दिए। उसके सहपाठी उसे 'पानी जासूस' कहने लगे।", qs: [
        ["नल से एक घंटे में कितना पानी बर्बाद हुआ?", ["आधा लीटर", "एक लीटर", "बारह लीटर", "दो लीटर"], "आधा लीटर"],
        ["सहपाठी उसे 'पानी जासूस' क्यों कहने लगे?", ["उसने पानी की बर्बादी पकड़ी और रुकवाई", "उसने खुद नल ठीक किए", "वह बहुत पानी पीती थी", "वह प्लंबर बनना चाहती थी"], "उसने पानी की बर्बादी पकड़ी और रुकवाई"]] },
      { text: "मधुमक्खियाँ छत्ते में लौटकर एक खास 'नाच' करती हैं। नाच की दिशा दूसरी मधुमक्खियों को बताती है कि किस ओर उड़ना है, और नाच की लंबाई बताती है कि फूल कितनी दूर हैं। इस तरह एक मधुमक्खी पूरे छत्ते को भोजन तक पहुँचा देती है।", qs: [
        ["नाच की लंबाई दूसरी मधुमक्खियों को क्या बताती है?", ["फूल कितनी दूर हैं", "किस ओर उड़ना है", "कितनी मधुमक्खियाँ भेजनी हैं", "फूल किस रंग के हैं"], "फूल कितनी दूर हैं"]] },
    ],
    "7": [
      { text: "जब गाँव का तालाब सूख गया, तो बड़ों ने कहा कि अगली बरसात तक कुछ नहीं हो सकता। चौदह साल का रवि इससे सहमत नहीं था। उसने अपने दोस्तों को इकट्ठा किया और सबने मिलकर तालाब तक पानी लाने वाली नालियों में फँसा प्लास्टिक और कीचड़ निकाला। उन्होंने किनारों पर घास भी लगाई ताकि मिट्टी फिर से न बहे। बारिश आने पर तालाब पहले से कहीं जल्दी भर गया और गर्मियों तक भरा रहा।", qs: [
        ["नालियाँ किस चीज़ से रुकी हुई थीं?", ["प्लास्टिक और कीचड़", "पत्थर और पेड़", "जानवर", "घास"], "प्लास्टिक और कीचड़"],
        ["उन्होंने किनारों पर घास क्यों लगाई?", ["ताकि मिट्टी बहकर तालाब में न जाए", "गायों को खिलाने के लिए", "तालाब सुंदर दिखे इसलिए", "घास बेचने के लिए"], "ताकि मिट्टी बहकर तालाब में न जाए"]] },
      { text: "कुछ लोग मानते हैं कि स्क्रीन पर पढ़ना और कागज़ पर पढ़ना एक जैसा है। लेकिन अध्ययन बताते हैं कि स्क्रीन पर लोग अक्सर जल्दी-जल्दी नज़र दौड़ाते हैं और कम याद रख पाते हैं। कागज़ धीरे और ध्यान से पढ़ने में मदद करता है। इसका मतलब यह नहीं कि स्क्रीन बुरी है; मतलब यह है कि हमें अपने पढ़ने के तरीके के प्रति सजग रहना चाहिए।", qs: [
        ["लेखक की मुख्य बात क्या है?", ["हमें स्क्रीन और कागज़ पर पढ़ने के तरीके के प्रति सजग रहना चाहिए", "स्क्रीन हमेशा बुरी है", "कागज़ बहुत महँगा है", "किसी को स्क्रीन नहीं देखनी चाहिए"], "हमें स्क्रीन और कागज़ पर पढ़ने के तरीके के प्रति सजग रहना चाहिए"]] },
    ],
    "8": [
      { text: "कई सालों से छोटा कस्बा एक ही बस पर निर्भर था जो दिन में दो बार चलती थी। बस छूट जाने पर बच्चे आठ किलोमीटर पैदल स्कूल जाते थे। जब नगर परिषद ने लोगों से सुझाव माँगे, तो कक्षा आठ के कुछ विद्यार्थियों ने अपने पड़ोसियों का सर्वे किया और पाया कि दो सौ से ज़्यादा लोग रोज़ सुबह उसी रास्ते से जाते हैं। उन्होंने ये आँकड़े परिषद की बैठक में रखे। सबूत से सहमत होकर परिषद ने तीन और बसें चला दीं।", qs: [
        ["सर्वे से विद्यार्थियों को क्या पता चला?", ["दो सौ से ज़्यादा लोग उसी रास्ते से जाते हैं", "बस हमेशा देर से आती है", "किसी को बस की ज़रूरत नहीं", "बच्चों को पैदल चलना पसंद है"], "दो सौ से ज़्यादा लोग उसी रास्ते से जाते हैं"],
        ["इस कहानी से क्या सीख मिलती है?", ["तथ्यों पर आधारित साफ़ तर्क फ़ैसले बदल सकता है", "बसें महँगी होती हैं", "पैदल चलना अच्छा है", "परिषद कभी नहीं सुनती"], "तथ्यों पर आधारित साफ़ तर्क फ़ैसले बदल सकता है"]] },
      { text: "सुंदरबन के मैंग्रोव जंगल एक प्राकृतिक दीवार की तरह काम करते हैं। उनकी उलझी हुई जड़ें मिट्टी को थामे रखती हैं और तूफ़ान में लहरों की रफ़्तार कम करती हैं। मैंग्रोव काटने पर तट पर बाढ़ का ख़तरा बढ़ जाता है। इसलिए इन जंगलों को बचाना, इनके पीछे रहने वाले लोगों को बचाना है।", qs: [
        ["अनुच्छेद के अनुसार मैंग्रोव क्यों ज़रूरी हैं?", ["वे तट को तूफ़ान और बाढ़ से बचाते हैं", "वे मीठे फल देते हैं", "वे घर बनाने के काम आते हैं", "वे पर्यटकों को बुलाते हैं"], "वे तट को तूफ़ान और बाढ़ से बचाते हैं"]] },
    ],
    "9-10": [
      { text: "अनाया हमेशा सोचती थी कि गाँव के बारे में दादी की कहानियाँ बढ़ा-चढ़ाकर कही जाती हैं। फिर स्थानीय इतिहास पर एक स्कूल परियोजना के दौरान उसे एक पुरानी अख़बार की ख़बर मिली, जिसमें ठीक उसी बाढ़ का वर्णन था जिसकी बात दादी करती थीं, यहाँ तक कि उस रात का भी जब मंदिर की घंटी बजाकर नदी किनारे के परिवारों को सावधान किया गया था। अनाया समझ गई कि परिवारों में चली आ रही यादें ऐसी बातें सँभाल कर रखती हैं जो सरकारी दस्तावेज़ों में छूट जाती हैं, और वह दादी की कहानियाँ फ़ोन पर रिकॉर्ड करने लगी।", qs: [
        ["अख़बार की ख़बर से किस बात की पुष्टि हुई?", ["दादी के बताए बाढ़ के वर्णन की", "कि मंदिर नया था", "कि नदी किनारे कोई नहीं रहता था", "कि बाढ़ कभी आई ही नहीं"], "दादी के बताए बाढ़ के वर्णन की"],
        ["अनाया कहानियाँ रिकॉर्ड क्यों करने लगी?", ["उसे समझ आया कि पारिवारिक यादें कीमती बातें बचाती हैं", "वह इनाम जीतना चाहती थी", "अध्यापक ने ज़बरदस्ती करवाया", "वह उन्हें बेचना चाहती थी"], "उसे समझ आया कि पारिवारिक यादें कीमती बातें बचाती हैं"]] },
      { text: "एक परिवार के लिए पैसे बचाना समझदारी है। लेकिन अगर देश का हर परिवार एक साथ ज़्यादा बचत करने लगे, तो लोग कम सामान ख़रीदेंगे। दुकानों की बिक्री घटेगी, कारोबार नौकरियाँ कम करेंगे और आमदनी गिरेगी, इसलिए अंत में देश की कुल बचत शायद बढ़े ही नहीं। अर्थशास्त्री इसे 'बचत का विरोधाभास' कहते हैं।", qs: [
        ["अनुच्छेद क्या बताता है?", ["जो एक परिवार के लिए अच्छा है, वह पूरे देश के लिए अच्छा हो, ज़रूरी नहीं", "पैसे बचाना हमेशा बुरा है", "दुकानें बंद होनी चाहिए", "परिवारों को कभी बचत नहीं करनी चाहिए"], "जो एक परिवार के लिए अच्छा है, वह पूरे देश के लिए अच्छा हो, ज़रूरी नहीं"]] },
    ],
    "11-12": [
      { text: "मानकीकृत परीक्षाओं के आलोचक कहते हैं कि तीन घंटे का प्रश्नपत्र साल भर की पढ़ाई को नहीं माप सकता। समर्थकों का जवाब है कि अपनी कमियों के बावजूद परीक्षा सब पर एक ही पैमाना लागू करती है और सतत मूल्यांकन की तुलना में उसमें हेरफेर करना कठिन है। सच शायद दोनों के बीच है: एक निष्पक्ष अंतिम परीक्षा और सावधानी से जाँचे गए कक्षा-कार्य को मिलाने वाली व्यवस्था लगातार मेहनत और दबाव में प्रदर्शन, दोनों को महत्त्व दे सकती है। बेशक, ऐसी व्यवस्था के लिए शिक्षकों का अधिक समय और भरोसा चाहिए, शायद इसीलिए यह अब भी कम दिखती है।", qs: [
        ["परीक्षा के समर्थक क्या तर्क देते हैं?", ["परीक्षा सब पर एक ही पैमाना लागू करती है", "परीक्षा सब कुछ माप लेती है", "परीक्षा हटा देनी चाहिए", "कक्षा-कार्य जाँचना आसान है"], "परीक्षा सब पर एक ही पैमाना लागू करती है"],
        ["लेखक की अपनी राय क्या है?", ["परीक्षा और जाँचे गए कक्षा-कार्य को मिलाना बेहतर हो सकता है", "परीक्षा ख़त्म कर देनी चाहिए", "सिर्फ़ कक्षा-कार्य मायने रखता है", "परीक्षा जैसी है वैसी ही सही है"], "परीक्षा और जाँचे गए कक्षा-कार्य को मिलाना बेहतर हो सकता है"]] },
      { text: "जब शहर मिट्टी और पेड़ों की जगह कंक्रीट और डामर बिछा देते हैं, तो 'शहरी ऊष्मा द्वीप' बनते हैं। ये सतहें दिन में धूप सोखती हैं और रात में गर्मी छोड़ती हैं। इसी कारण शहर का बीच का हिस्सा आसपास के गाँवों से कई डिग्री ज़्यादा गर्म रह सकता है। पेड़ लगाना, पार्क बनाना और हल्के रंग की छतें बनाना शहर को ठंडा रखने के सबसे आसान तरीकों में हैं।", qs: [
        ["लेखक किस बात का सबसे अधिक समर्थन करेगा?", ["छतों को हल्के रंग से रँगना", "पार्कों की जगह पार्किंग बनाना", "सड़क चौड़ी करने के लिए पेड़ काटना", "गहरे रंग की सड़कें बनाना"], "छतों को हल्के रंग से रँगना"]] },
    ],
  },
};

function comprehension(lang: Lang): ComprehensionQuestion[] {
  return per((lvl) => {
    let n = 0;
    return COMP[lang][lvl].flatMap((p) =>
      p.qs.map(([question, options, ans]) => {
        const i = n++;
        const words = p.text.split(/\s+/).length;
        return {
          id: `rc-${lang}-${lvl}-${i + 1}`, instruction: lang === "hi" ? "पढ़ें और उत्तर दें:" : "Read and answer:",
          passage: p.text, stimulus: p.text, question, options, correctAnswer: ans,
          difficulty: diff(i + (i === 2 ? 1 : 0)), gradeLevel: lvl, dsm5Domain: "reading-comprehension",
          // reading time grows with passage length; the second question on a passage needs less
          timeLimit: Math.round(20 + words * (i === 1 ? 0.25 : 0.6)),
        };
      })
    );
  });
}

// =====================================================================================
// 5. Verbal working memory: span length by grade (typical forward/backward digit spans)
// =====================================================================================
const SPAN: Record<Level, { fwd: [number, number]; words: number; back: number }> = {
  "1": { fwd: [3, 4], words: 3, back: 0 },
  "2": { fwd: [4, 4], words: 3, back: 2 },
  "3": { fwd: [4, 5], words: 4, back: 3 },
  "4": { fwd: [5, 5], words: 4, back: 3 },
  "5": { fwd: [5, 6], words: 4, back: 3 },
  "6": { fwd: [5, 6], words: 5, back: 4 },
  "7": { fwd: [6, 6], words: 5, back: 4 },
  "8": { fwd: [6, 7], words: 5, back: 4 },
  "9-10": { fwd: [6, 7], words: 5, back: 5 },
  "11-12": { fwd: [7, 7], words: 6, back: 5 },
};
const WORDS: Record<Lang, string[]> = {
  en: ["sun", "tree", "book", "fish", "cup", "hat", "door", "milk", "star", "bird", "ball", "rain", "leaf", "ship", "cake", "road"],
  hi: ["घर", "आम", "नल", "फूल", "पेड़", "दूध", "किताब", "चाँद", "मोर", "पानी", "गाय", "बस", "कलम", "रोटी", "तारा", "नाव"],
};

/** Deterministic digit sequence with no repeats next to each other. */
function digits(len: number, seed: number): string[] {
  const out: string[] = [];
  let s = seed * 9301 + 49297;
  while (out.length < len) {
    s = (s * 9301 + 49297) % 233280;
    const d = String(1 + Math.floor((s / 233280) * 9));
    if (d !== out[out.length - 1] && !out.includes(d)) out.push(d);
  }
  return out;
}
function words(lang: Lang, len: number, seed: number): string[] {
  const pool = WORDS[lang];
  return Array.from({ length: len }, (_, i) => pool[(seed * 5 + i * 7) % pool.length]);
}

function workingMemory(lang: Lang): WorkingMemoryQuestion[] {
  const T = lang === "hi"
    ? { fwd: "सुनें और इन संख्याओं को उसी क्रम में दोहराएं:", words: "सुनें और इन शब्दों को उसी क्रम में दोहराएं:", back: "सुनें और इन संख्याओं को उल्टे क्रम में बोलें:" }
    : { fwd: "Listen and repeat these numbers in the same order:", words: "Listen and repeat these words in the same order:", back: "Listen and say these numbers in REVERSE order:" };
  return per((lvl, li) => {
    const sp = SPAN[lvl];
    const seqs: { seq: string[]; direction: "forward" | "backward"; ins: string }[] = [
      { seq: digits(sp.fwd[0], li * 4 + 1), direction: "forward", ins: T.fwd },
      { seq: words(lang, sp.words, li + 1), direction: "forward", ins: T.words },
      { seq: digits(sp.fwd[1], li * 4 + 2), direction: "forward", ins: T.fwd },
      sp.back
        ? { seq: digits(sp.back, li * 4 + 3), direction: "backward", ins: T.back }
        : { seq: words(lang, sp.words, li + 9), direction: "forward", ins: T.words },
    ];
    return seqs.map(({ seq, direction, ins }, i) => ({
      id: `wm-${lang}-${lvl}-${i + 1}`, instruction: ins, stimulus: seq, sequence: seq,
      correctAnswer: direction === "backward" ? [...seq].reverse() : seq, direction,
      difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "working-memory", timeLimit: 10 + seq.length * 3,
    }));
  });
}

// =====================================================================================
// 6. Magnitude comparison / number line (NCERT number range for each grade)
// =====================================================================================
type M = { a: string; b: string; ans: string } | { line: string; range: string; opts: string[]; ans: string };
const MAG: Record<Level, M[]> = {
  "1": [{ a: "14", b: "17", ans: "17" }, { a: "12", b: "9", ans: "12" },
    { line: "15", range: "0-20", opts: ["Near 0", "Near 5", "Near 10", "Near 15", "Near 20"], ans: "Near 15" }, { a: "18", b: "11", ans: "18" }],
  "2": [{ a: "46", b: "64", ans: "64" }, { a: "59", b: "61", ans: "61" },
    { line: "72", range: "0-100", opts: ["Near 0", "Near 25", "Near 50", "Near 75", "Near 100"], ans: "Near 75" }, { a: "90", b: "89", ans: "90" }],
  "3": [{ a: "356", b: "365", ans: "365" }, { a: "708", b: "780", ans: "780" },
    { line: "480", range: "0-1000", opts: ["Near 0", "Near 250", "Near 500", "Near 750", "Near 1000"], ans: "Near 500" }, { a: "640", b: "604", ans: "640" }],
  "4": [{ a: "4,075", b: "4,705", ans: "4,705" }, { a: "9,909", b: "9,099", ans: "9,909" },
    { line: "2,600", range: "0-10,000", opts: ["Near 0", "Near 2,500", "Near 5,000", "Near 7,500", "Near 10,000"], ans: "Near 2,500" }, { a: "1/2", b: "1/4", ans: "1/2" }],
  "5": [{ a: "1,20,500", b: "1,02,500", ans: "1,20,500" }, { a: "2.5", b: "2.05", ans: "2.5" },
    { a: "3/4", b: "2/4", ans: "3/4" }, { line: "0.75", range: "0-1", opts: ["Near 0", "Near 0.25", "Near 0.5", "Near 0.75", "Near 1"], ans: "Near 0.75" }],
  "6": [{ a: "2/3", b: "3/5", ans: "2/3" }, { a: "0.6", b: "0.58", ans: "0.6" },
    { a: "−3", b: "−7", ans: "−3" }, { line: "−6", range: "−10 to 10", opts: ["Near −10", "Near −5", "Near 0", "Near 5", "Near 10"], ans: "Near −5" }],
  "7": [{ a: "3/7", b: "4/9", ans: "4/9" }, { a: "−15", b: "−9", ans: "−9" }, { a: "0.45", b: "0.405", ans: "0.45" }, { a: "−3/4", b: "−2/3", ans: "−2/3" }],
  "8": [{ a: "2⁵", b: "5²", ans: "2⁵" }, { a: "√49", b: "6.5", ans: "√49" }, { a: "−5/6", b: "−7/8", ans: "−5/6" }, { a: "0.0099", b: "0.01", ans: "0.01" }],
  "9-10": [{ a: "√50", b: "7", ans: "√50" }, { a: "π", b: "22/7", ans: "22/7" }, { a: "√2 + 1", b: "2.5", ans: "2.5" }, { a: "1.2 × 10³", b: "980", ans: "1.2 × 10³" }],
  "11-12": [{ a: "3⁴", b: "4³", ans: "3⁴" }, { a: "10⁻³", b: "10⁻⁵", ans: "10⁻³" }, { a: "log₁₀ 1000", b: "√10", ans: "√10" }, { a: "2¹⁰", b: "10³", ans: "2¹⁰" }],
};
const nearHi = (s: string) => s.replace(/^Near /, "लगभग ");

function magnitude(lang: Lang): MagnitudeQuestion[] {
  return per((lvl) =>
    MAG[lvl].map((m, i) => {
      const base = { id: `mc-${lang}-${lvl}-${i + 1}`, difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "number-sense" };
      if ("line" in m) {
        const opts = lang === "hi" ? m.opts.map(nearHi) : m.opts;
        return {
          ...base, taskType: "number-line" as const, options: opts, correctAnswer: lang === "hi" ? nearHi(m.ans) : m.ans,
          instruction: lang === "hi" ? `${m.range} की संख्या रेखा पर ${m.line} कहाँ आएगा?` : `Where would ${m.line} go on a number line from ${m.range}?`,
          stimulus: lang === "hi" ? `${m.line} को ${m.range} के बीच रखें` : `Place ${m.line} on ${m.range}`, timeLimit: 15,
        };
      }
      const ints = /^-?\d+$/.test(m.a) && /^-?\d+$/.test(m.b);
      return {
        ...base, taskType: "comparison" as const, stimulus: [m.a, m.b], options: [m.a, m.b], correctAnswer: m.ans,
        ...(ints ? { numbers: [Number(m.a), Number(m.b)] as [number, number] } : {}),
        instruction: lang === "hi" ? "कौन सा बड़ा है?" : "Which is larger?", timeLimit: ints ? 8 : 15,
      };
    })
  );
}

// =====================================================================================
// 7. Quantity estimation (dot clusters): ratio gets closer and display shorter with age
// =====================================================================================
const RATIO: Record<Level, number[]> = {
  "1": [0.5, 0.5, 0.6, 0.67], "2": [0.5, 0.6, 0.67, 0.67], "3": [0.6, 0.67, 0.67, 0.75], "4": [0.67, 0.67, 0.75, 0.75],
  "5": [0.67, 0.75, 0.75, 0.8], "6": [0.75, 0.75, 0.8, 0.8], "7": [0.75, 0.8, 0.8, 0.83], "8": [0.8, 0.8, 0.83, 0.83],
  "9-10": [0.8, 0.83, 0.83, 0.86], "11-12": [0.83, 0.83, 0.86, 0.875],
};

function estimation(lang: Lang): DotClusterQuestion[] {
  return per((lvl, li) =>
    RATIO[lvl].map((r, i) => {
      const big = [12, 15, 18, 24][i % 4] - (li % 2) * (i % 2 ? 0 : 2); // 10-24 dots
      let small = Math.round(big * r);
      if (small >= big) small = big - 1;
      const leftBigger = (li + i) % 2 === 0;
      const [leftDots, rightDots] = leftBigger ? [big, small] : [small, big];
      return {
        id: `qe-${lang}-${lvl}-${i + 1}`, instruction: lang === "hi" ? "किस समूह में ज़्यादा बिंदु हैं?" : "Which group has MORE dots?",
        stimulus: [`${leftDots} dots`, `${rightDots} dots`], leftDots, rightDots,
        displayTime: Math.max(900, 1500 - li * 70), options: ["Left", "Right"], correctAnswer: leftBigger ? "Left" : "Right",
        difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "approximate-number", timeLimit: 5,
      };
    })
  );
}

// =====================================================================================
// 8. Arithmetic word problems (NCERT Learning Outcomes per grade)
// =====================================================================================
type A = [ArithmeticQuestion["operation"], string, string, string[], string];
const ARITH: Record<Level, A[]> = {
  "1": [
    ["addition", "Priya has 5 apples. Her friend gives her 3 more. How many apples does Priya have now?", "प्रिया के पास 5 सेब हैं। उसकी सहेली उसे 3 और देती है। अब प्रिया के पास कितने सेब हैं?", ["6", "7", "8", "9"], "8"],
    ["subtraction", "There are 9 birds on a tree. 4 fly away. How many birds are left?", "पेड़ पर 9 चिड़ियाँ हैं। 4 उड़ जाती हैं। कितनी चिड़ियाँ बचीं?", ["3", "4", "5", "6"], "5"],
    ["addition", "Ravi has 7 marbles and Sonu has 6 marbles. How many marbles do they have together?", "रवि के पास 7 कंचे हैं और सोनू के पास 6 कंचे। दोनों के पास कुल कितने कंचे हैं?", ["11", "12", "13", "14"], "13"],
    ["subtraction", "A box has 15 crayons. 6 are broken. How many crayons are not broken?", "एक डिब्बे में 15 क्रेयॉन हैं। 6 टूटे हुए हैं। कितने क्रेयॉन नहीं टूटे?", ["8", "9", "10", "11"], "9"],
  ],
  "2": [
    ["addition", "Meena has 23 stickers. She gets 14 more. How many stickers does she have now?", "मीना के पास 23 स्टिकर हैं। उसे 14 और मिलते हैं। अब उसके पास कितने स्टिकर हैं?", ["35", "36", "37", "38"], "37"],
    ["subtraction", "A class has 42 children. 18 are girls. How many are boys?", "एक कक्षा में 42 बच्चे हैं। उनमें 18 लड़कियाँ हैं। लड़के कितने हैं?", ["22", "24", "26", "34"], "24"],
    ["multiplication", "One pencil costs 5 rupees. How much do 4 pencils cost?", "एक पेंसिल 5 रुपये की है। 4 पेंसिल कितने की होंगी?", ["9", "15", "20", "25"], "20"],
    ["subtraction", "Raju had 60 rupees. He bought a toy for 35 rupees. How much money is left?", "राजू के पास 60 रुपये थे। उसने 35 रुपये का खिलौना ख़रीदा। कितने रुपये बचे?", ["15", "25", "35", "95"], "25"],
  ],
  "3": [
    ["subtraction", "A shopkeeper had 350 oranges. He sold 125. How many oranges are left?", "एक दुकानदार के पास 350 संतरे थे। उसने 125 बेच दिए। कितने संतरे बचे?", ["215", "225", "235", "475"], "225"],
    ["multiplication", "There are 6 rows of chairs with 8 chairs in each row. How many chairs are there?", "कुर्सियों की 6 पंक्तियाँ हैं और हर पंक्ति में 8 कुर्सियाँ हैं। कुल कितनी कुर्सियाँ हैं?", ["14", "42", "48", "54"], "48"],
    ["division", "24 laddoos are shared equally among 4 children. How many does each child get?", "24 लड्डू 4 बच्चों में बराबर बाँटे गए। हर बच्चे को कितने मिले?", ["4", "5", "6", "8"], "6"],
    ["addition", "A school has 268 boys and 245 girls. How many children are there in all?", "एक स्कूल में 268 लड़के और 245 लड़कियाँ हैं। कुल कितने बच्चे हैं?", ["413", "503", "513", "523"], "513"],
  ],
  "4": [
    ["multiplication", "A bus carries 48 passengers on each trip. How many passengers does it carry in 7 trips?", "एक बस हर चक्कर में 48 यात्री ले जाती है। 7 चक्करों में कितने यात्री ले जाएगी?", ["286", "326", "336", "346"], "336"],
    ["division", "96 books are packed equally into 8 boxes. How many books are in each box?", "96 किताबें 8 डिब्बों में बराबर रखी गईं। हर डिब्बे में कितनी किताबें हैं?", ["11", "12", "13", "14"], "12"],
    ["division", "Half of the 36 students in a class went on a trip. How many students went?", "कक्षा के 36 विद्यार्थियों में से आधे सैर पर गए। कितने विद्यार्थी गए?", ["12", "16", "18", "72"], "18"],
    ["mixed", "A film starts at 3:30 pm and lasts 2 hours 15 minutes. When does it end?", "एक फ़िल्म दोपहर 3:30 बजे शुरू होती है और 2 घंटे 15 मिनट चलती है। वह कब ख़त्म होगी?", ["5:15 pm", "5:30 pm", "5:45 pm", "6:15 pm"], "5:45 pm"],
  ],
  "5": [
    ["multiplication", "A school bought 125 notebooks at 18 rupees each. What was the total cost?", "एक स्कूल ने 18 रुपये प्रति कॉपी के हिसाब से 125 कॉपियाँ ख़रीदीं। कुल कितना ख़र्च हुआ?", ["1,250 rupees", "2,150 rupees", "2,250 rupees", "2,350 rupees"], "2,250 rupees"],
    ["division", "A rope 7 m 50 cm long is cut into 3 equal pieces. How long is each piece?", "7 मी 50 सेमी लंबी रस्सी को 3 बराबर टुकड़ों में काटा गया। हर टुकड़ा कितना लंबा है?", ["2 m 5 cm", "2 m 25 cm", "2 m 50 cm", "3 m 50 cm"], "2 m 50 cm"],
    ["addition", "Rani read 3/8 of a book on Monday and 2/8 on Tuesday. What fraction of the book has she read?", "रानी ने सोमवार को किताब का 3/8 भाग और मंगलवार को 2/8 भाग पढ़ा। उसने किताब का कितना भाग पढ़ लिया?", ["1/8", "5/16", "5/8", "6/8"], "5/8"],
    ["mixed", "A rectangular garden is 12 m long and 8 m wide. What is its perimeter?", "एक आयताकार बगीचा 12 मी लंबा और 8 मी चौड़ा है। उसका परिमाप कितना है?", ["20 m", "40 m", "48 m", "96 m"], "40 m"],
  ],
  "6": [
    ["mixed", "The ratio of boys to girls in a class is 3 : 2. If there are 18 boys, how many girls are there?", "एक कक्षा में लड़कों और लड़कियों का अनुपात 3 : 2 है। अगर 18 लड़के हैं, तो लड़कियाँ कितनी हैं?", ["10", "12", "15", "27"], "12"],
    ["mixed", "If 5 pens cost 60 rupees, how much do 8 pens cost?", "अगर 5 पेन 60 रुपये के हैं, तो 8 पेन कितने के होंगे?", ["84 rupees", "96 rupees", "100 rupees", "480 rupees"], "96 rupees"],
    ["addition", "Sita bought 1.5 kg of rice and 2.75 kg of wheat. What is the total weight?", "सीता ने 1.5 किग्रा चावल और 2.75 किग्रा गेहूँ ख़रीदा। कुल वज़न कितना है?", ["3.25 kg", "3.75 kg", "4.15 kg", "4.25 kg"], "4.25 kg"],
    ["addition", "The temperature was −3 °C in the morning and rose by 8 °C by noon. What was the temperature at noon?", "सुबह तापमान −3 °C था और दोपहर तक 8 °C बढ़ गया। दोपहर में तापमान कितना था?", ["−11 °C", "−5 °C", "5 °C", "11 °C"], "5 °C"],
  ],
  "7": [
    ["mixed", "A shirt costs 800 rupees. There is a 25% discount. What is the price after the discount?", "एक कमीज़ 800 रुपये की है। उस पर 25% छूट है। छूट के बाद कीमत क्या है?", ["200 rupees", "575 rupees", "600 rupees", "775 rupees"], "600 rupees"],
    ["mixed", "Find the simple interest on 2,000 rupees at 5% per year for 3 years.", "2,000 रुपये पर 5% वार्षिक दर से 3 साल का साधारण ब्याज ज्ञात कीजिए।", ["100 rupees", "150 rupees", "300 rupees", "600 rupees"], "300 rupees"],
    ["mixed", "The marks of 5 students are 12, 15, 18, 10 and 20. What is the average mark?", "5 विद्यार्थियों के अंक 12, 15, 18, 10 और 20 हैं। औसत अंक कितना है?", ["14", "15", "16", "75"], "15"],
    ["mixed", "A number is multiplied by 4 and then 7 is added. The result is 35. What is the number?", "किसी संख्या को 4 से गुणा करके 7 जोड़ा गया। परिणाम 35 है। वह संख्या क्या है?", ["6", "7", "8", "9"], "7"],
  ],
  "8": [
    ["mixed", "A shopkeeper buys a fan for 1,200 rupees and sells it for 1,500 rupees. What is his profit percentage?", "एक दुकानदार 1,200 रुपये में पंखा ख़रीदकर 1,500 रुपये में बेचता है। उसका लाभ प्रतिशत क्या है?", ["20%", "25%", "30%", "300%"], "25%"],
    ["mixed", "A train covers 360 km in 4 hours. How long will it take to cover 450 km at the same speed?", "एक रेलगाड़ी 4 घंटे में 360 किमी चलती है। उसी चाल से 450 किमी चलने में कितना समय लगेगा?", ["4.5 hours", "5 hours", "5.5 hours", "6 hours"], "5 hours"],
    ["mixed", "If 3x − 5 = 2x + 4, what is x?", "अगर 3x − 5 = 2x + 4, तो x का मान क्या है?", ["−9", "−1", "1", "9"], "9"],
    ["mixed", "The price of a book rises from 250 rupees to 300 rupees. What is the percentage increase?", "एक किताब की कीमत 250 रुपये से बढ़कर 300 रुपये हो गई। कितने प्रतिशत की बढ़ोतरी हुई?", ["16.7%", "20%", "25%", "50%"], "20%"],
  ],
  "9-10": [
    ["mixed", "The price of an item increases by 20% and then decreases by 20%. What is the overall change?", "किसी वस्तु की कीमत पहले 20% बढ़ी और फिर 20% घटी। कुल मिलाकर क्या बदलाव हुआ?", ["No change", "4% decrease", "4% increase", "20% decrease"], "4% decrease"],
    ["mixed", "The sum of two numbers is 50 and their difference is 14. What is the larger number?", "दो संख्याओं का योग 50 है और उनका अंतर 14 है। बड़ी संख्या क्या है?", ["18", "32", "36", "64"], "32"],
    ["mixed", "What is the sum of the first 10 terms of the AP 2, 5, 8, 11, ...?", "समांतर श्रेढ़ी 2, 5, 8, 11, ... के पहले 10 पदों का योग क्या है?", ["145", "155", "165", "290"], "155"],
    ["mixed", "A ladder 10 m long reaches a window 8 m high. How far is the foot of the ladder from the wall?", "10 मी लंबी सीढ़ी 8 मी ऊँची खिड़की तक पहुँचती है। सीढ़ी का निचला सिरा दीवार से कितनी दूर है?", ["2 m", "4 m", "6 m", "18 m"], "6 m"],
  ],
  "11-12": [
    ["mixed", "Find the compound interest on 10,000 rupees at 10% per year for 2 years.", "10,000 रुपये पर 10% वार्षिक दर से 2 साल का चक्रवृद्धि ब्याज ज्ञात कीजिए।", ["1,100 rupees", "2,000 rupees", "2,100 rupees", "2,200 rupees"], "2,100 rupees"],
    ["multiplication", "A culture of bacteria doubles every hour. Starting with 500 bacteria, how many will there be after 4 hours?", "जीवाणुओं की संख्या हर घंटे दोगुनी होती है। 500 जीवाणुओं से शुरू करने पर 4 घंटे बाद कितने होंगे?", ["2,000", "4,000", "8,000", "16,000"], "8,000"],
    ["mixed", "A bag has 3 red and 5 blue balls. One ball is picked at random. What is the probability that it is red?", "एक थैले में 3 लाल और 5 नीली गेंदें हैं। एक गेंद यादृच्छिक रूप से निकाली गई। उसके लाल होने की प्रायिकता क्या है?", ["1/3", "3/5", "3/8", "5/8"], "3/8"],
    ["multiplication", "In how many different ways can 4 students stand in a line?", "4 विद्यार्थी एक पंक्ति में कितने अलग-अलग तरीकों से खड़े हो सकते हैं?", ["4", "12", "16", "24"], "24"],
  ],
};
const hiUnits = (s: string) => s.replace(/ rupees$/, " रुपये").replace(/ hours$/, " घंटे").replace(/^No change$/, "कोई बदलाव नहीं")
  .replace(/^(\d+)% decrease$/, "$1% कमी").replace(/^(\d+)% increase$/, "$1% बढ़ोतरी").replace(/ pm$/, " बजे").replace(/ m (\d+) cm$/, " मी $1 सेमी")
  .replace(/ m$/, " मी").replace(/ kg$/, " किग्रा");

function arithmetic(lang: Lang): ArithmeticQuestion[] {
  return per((lvl, li) =>
    ARITH[lvl].map(([operation, en, hi, opts, ans], i) => ({
      id: `ar-${lang}-${lvl}-${i + 1}`, instruction: lang === "hi" ? "इस सवाल को हल करें:" : "Solve this word problem:",
      stimulus: lang === "hi" ? hi : en, context: "daily-life", operation,
      options: lang === "hi" ? opts.map(hiUnits) : opts, correctAnswer: lang === "hi" ? hiUnits(ans) : ans,
      difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "math-reasoning", timeLimit: 30 + Math.min(30, li * 4),
    }))
  );
}

// =====================================================================================
// 9. Symbol mapping: quantity / number word / notation -> written symbol
// =====================================================================================
type S = [SymbolMappingQuestion["taskType"], string, string, string[], string]; // kind, en word, hi word, options, answer
const dots = (n: number) => "●".repeat(n);
const SYM: Record<Level, S[]> = {
  "1": [
    ["dots-to-number", dots(8), dots(8), ["6", "7", "8", "9"], "8"],
    ["number-to-dots", "6", "6", [dots(5), dots(6), dots(7), dots(4)], dots(6)],
    ["spoken-to-written", "fourteen", "चौदह", ["4", "14", "40", "41"], "14"],
    ["spoken-to-written", "nineteen", "उन्नीस", ["9", "19", "90", "91"], "19"],
  ],
  "2": [
    ["spoken-to-written", "sixty-four", "चौंसठ", ["46", "60", "64", "604"], "64"],
    ["spoken-to-written", "seventy", "सत्तर", ["7", "17", "70", "700"], "70"],
    ["spoken-to-written", "4 tens and 3 ones", "4 दहाई और 3 इकाई", ["7", "34", "43", "403"], "43"],
    ["spoken-to-written", "ninety-nine", "निन्यानवे", ["19", "90", "99", "909"], "99"],
  ],
  "3": [
    ["spoken-to-written", "four hundred seven", "चार सौ सात", ["47", "407", "470", "4007"], "407"],
    ["spoken-to-written", "six hundred thirty", "छह सौ तीस", ["360", "603", "630", "6030"], "630"],
    ["spoken-to-written", "3 hundreds, 5 tens and 2 ones", "3 सैकड़ा, 5 दहाई और 2 इकाई", ["253", "325", "352", "3052"], "352"],
    ["spoken-to-written", "one hundred nineteen", "एक सौ उन्नीस", ["109", "119", "190", "1019"], "119"],
  ],
  "4": [
    ["spoken-to-written", "three thousand fifty", "तीन हज़ार पचास", ["3,005", "3,050", "3,500", "30,050"], "3,050"],
    ["spoken-to-written", "one half", "आधा", ["1/2", "2/1", "1/3", "2"], "1/2"],
    ["spoken-to-written", "nine thousand nine", "नौ हज़ार नौ", ["9,009", "9,090", "9,900", "90,009"], "9,009"],
    ["spoken-to-written", "one quarter", "एक चौथाई", ["1/3", "1/4", "4/1", "4"], "1/4"],
  ],
  "5": [
    ["spoken-to-written", "two lakh five thousand", "दो लाख पाँच हज़ार", ["25,000", "2,00,500", "2,05,000", "2,50,000"], "2,05,000"],
    ["spoken-to-written", "seven tenths", "सात दशमांश", ["0.07", "0.7", "7.0", "7.10"], "0.7"],
    ["spoken-to-written", "three-fourths", "तीन-चौथाई", ["3/4", "4/3", "3/8", "34"], "3/4"],
    ["spoken-to-written", "one lakh", "एक लाख", ["1,000", "10,000", "1,00,000", "10,00,000"], "1,00,000"],
  ],
  "6": [
    ["spoken-to-written", "negative eight", "ऋण आठ", ["8", "−8", "1/8", "0.8"], "−8"],
    ["spoken-to-written", "two and a half", "ढाई", ["2.05", "2.2", "2.5", "25"], "2.5"],
    ["spoken-to-written", "five hundredths", "पाँच शतांश", ["0.5", "0.05", "500", "5.100"], "0.05"],
    ["spoken-to-written", "three-fifths", "तीन-पाँचवाँ", ["5/3", "3/5", "3.5", "35"], "3/5"],
  ],
  "7": [
    ["spoken-to-written", "twenty-five percent", "पच्चीस प्रतिशत", ["0.025", "0.25", "2.5", "25.0"], "0.25"],
    ["spoken-to-written", "negative three-quarters", "ऋण तीन-चौथाई", ["3/4", "−3/4", "−4/3", "−0.34"], "−3/4"],
    ["spoken-to-written", "x plus seven", "x धन सात", ["7x", "x + 7", "x − 7", "x/7"], "x + 7"],
    ["spoken-to-written", "seven times y", "सात गुणा y", ["7 + y", "y/7", "7y", "y⁷"], "7y"],
  ],
  "8": [
    ["spoken-to-written", "five squared", "पाँच का वर्ग", ["5²", "2⁵", "5 × 2", "√5"], "5²"],
    ["spoken-to-written", "square root of sixty-four", "चौंसठ का वर्गमूल", ["64²", "√64", "64/2", "∛64"], "√64"],
    ["spoken-to-written", "two to the power ten", "दो की घात दस", ["10²", "2 × 10", "2¹⁰", "210"], "2¹⁰"],
    ["spoken-to-written", "x cubed", "x का घन", ["3x", "x³", "x + 3", "∛x"], "x³"],
  ],
  "9-10": [
    ["spoken-to-written", "three times ten to the power four", "तीन गुणा दस की घात चार", ["3⁴", "3 × 10⁴", "30⁴", "3 + 10⁴"], "3 × 10⁴"],
    ["spoken-to-written", "a is not equal to b", "a, b के बराबर नहीं है", ["a = b", "a ≈ b", "a ≠ b", "a ≡ b"], "a ≠ b"],
    ["spoken-to-written", "x is greater than or equal to 5", "x, 5 से बड़ा या बराबर है", ["x > 5", "x ≤ 5", "x ≥ 5", "x < 5"], "x ≥ 5"],
    ["spoken-to-written", "sine of thirty degrees", "तीस अंश का साइन", ["sin 30°", "cos 30°", "tan 30°", "sin 3°"], "sin 30°"],
  ],
  "11-12": [
    ["spoken-to-written", "x belongs to the set A", "x समुच्चय A का अवयव है", ["x ∈ A", "x ⊂ A", "A ∈ x", "x ∉ A"], "x ∈ A"],
    ["spoken-to-written", "the modulus of x", "x का मापांक", ["|x|", "[x]", "(x)", "x̄"], "|x|"],
    ["spoken-to-written", "f of x", "x का फलन f", ["f(x)", "f × x", "fx²", "x(f)"], "f(x)"],
    ["spoken-to-written", "n factorial", "n क्रमगुणित", ["n!", "n²", "√n", "nⁿ"], "n!"],
  ],
};

function symbolMapping(lang: Lang): SymbolMappingQuestion[] {
  return per((lvl) =>
    SYM[lvl].map(([taskType, en, hi, options, ans], i) => {
      const w = lang === "hi" ? hi : en;
      const instruction =
        taskType === "dots-to-number" ? (lang === "hi" ? "कितने बिंदु हैं?" : "How many dots are there?")
        : taskType === "number-to-dots" ? (lang === "hi" ? `कौन सा समूह ${w} दिखाता है?` : `Which group shows the number ${w}?`)
        : lang === "hi" ? `इसे कैसे लिखेंगे: "${w}"?` : `How do you write "${w}"?`;
      return {
        id: `sm-${lang}-${lvl}-${i + 1}`, instruction, stimulus: w, options, correctAnswer: ans, taskType,
        difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "symbol-mapping", timeLimit: 12,
      };
    })
  );
}

// =====================================================================================
// 10. Sequential logic (number patterns)
// =====================================================================================
type L = [string[], string[], string]; // sequence with "?", options, answer
const SEQ: Record<Level, L[]> = {
  "1": [[["1", "2", "3", "4", "?"], ["5", "6", "7", "8"], "5"], [["2", "4", "6", "8", "?"], ["9", "10", "11", "12"], "10"],
    [["10", "9", "8", "7", "?"], ["5", "6", "7", "8"], "6"], [["5", "10", "?", "20"], ["11", "12", "15", "25"], "15"]],
  "2": [[["10", "20", "30", "?"], ["31", "35", "40", "50"], "40"], [["3", "6", "9", "12", "?"], ["13", "14", "15", "16"], "15"],
    [["50", "45", "40", "?"], ["30", "35", "39", "45"], "35"], [["11", "22", "33", "?"], ["34", "43", "44", "55"], "44"]],
  "3": [[["100", "200", "300", "?"], ["301", "310", "400", "500"], "400"], [["4", "8", "12", "16", "?"], ["18", "20", "24", "32"], "20"],
    [["25", "50", "75", "?"], ["80", "90", "100", "125"], "100"], [["90", "80", "?", "60"], ["65", "70", "75", "85"], "70"]],
  "4": [[["1000", "900", "800", "?"], ["600", "700", "750", "799"], "700"], [["7", "14", "21", "28", "?"], ["30", "32", "35", "42"], "35"],
    [["2", "4", "8", "16", "?"], ["18", "24", "32", "64"], "32"], [["1", "4", "9", "16", "?"], ["20", "23", "25", "36"], "25"]],
  "5": [[["0.5", "1", "1.5", "2", "?"], ["2.1", "2.5", "3", "4"], "2.5"], [["3", "9", "27", "?"], ["36", "54", "81", "90"], "81"],
    [["1", "4", "9", "16", "25", "?"], ["30", "35", "36", "49"], "36"], [["1", "3", "6", "10", "?"], ["12", "14", "15", "16"], "15"]],
  "6": [[["−2", "−4", "−6", "?"], ["−7", "−8", "8", "−10"], "−8"], [["1/2", "1/4", "1/8", "?"], ["1/10", "1/12", "1/16", "1/32"], "1/16"],
    [["1", "8", "27", "64", "?"], ["81", "100", "125", "216"], "125"], [["2", "3", "5", "8", "12", "?"], ["15", "16", "17", "18"], "17"]],
  "7": [[["81", "27", "9", "3", "?"], ["0", "1", "2", "−3"], "1"], [["5", "1", "−3", "−7", "?"], ["−9", "−10", "−11", "−12"], "−11"],
    [["1", "1", "2", "3", "5", "8", "?"], ["11", "12", "13", "16"], "13"], [["2", "6", "12", "20", "30", "?"], ["36", "40", "42", "48"], "42"]],
  "8": [[["256", "64", "16", "?"], ["2", "4", "8", "12"], "4"], [["1", "2", "4", "7", "11", "?"], ["14", "15", "16", "17"], "16"],
    [["1", "8", "27", "64", "125", "?"], ["150", "196", "216", "250"], "216"], [["2", "5", "10", "17", "26", "?"], ["35", "36", "37", "38"], "37"]],
  "9-10": [[["2", "5", "?", "11", "14"], ["7", "8", "9", "10"], "8"], [["1/2", "1", "3/2", "?"], ["3/4", "7/4", "2", "5/2"], "2"],
    [["0.1", "0.01", "0.001", "?"], ["0.0001", "0.002", "0.01", "1.0001"], "0.0001"], [["1", "1", "2", "3", "5", "8", "?", "21"], ["11", "12", "13", "15"], "13"]],
  "11-12": [[["3", "9", "27", "81", "?"], ["162", "243", "324", "729"], "243"], [["1", "3", "7", "15", "31", "?"], ["47", "62", "63", "64"], "63"],
    [["1", "−1/2", "1/4", "−1/8", "?"], ["−1/16", "1/16", "1/8", "−1/32"], "1/16"], [["1", "4", "27", "256", "?"], ["625", "1024", "3000", "3125"], "3125"]],
};

function sequences(lang: Lang): SequenceQuestion[] {
  return per((lvl) =>
    SEQ[lvl].map(([seq, options, ans], i) => {
      const missingIndex = seq.indexOf("?");
      return {
        id: `sl-${lang}-${lvl}-${i + 1}`,
        instruction: missingIndex === seq.length - 1 ? (lang === "hi" ? "आगे कौन सी संख्या आएगी?" : "What number comes next?") : (lang === "hi" ? "कौन सी संख्या छूट गई है?" : "What number is missing?"),
        stimulus: seq, pattern: seq.filter((x) => x !== "?"), missingIndex, options, correctAnswer: ans,
        difficulty: diff(i), gradeLevel: lvl, dsm5Domain: "sequential-logic", timeLimit: 20,
      };
    })
  );
}

// =====================================================================================
export function buildItemBank(lang: Lang) {
  return {
    dyslexia: {
      phonologicalAwareness: phonological(lang),
      pseudowordDecoding: decoding(lang),
      visualConfusion: visual(lang),
      readingComprehension: comprehension(lang),
      verbalWorkingMemory: workingMemory(lang),
    },
    dyscalculia: {
      magnitudeComparison: magnitude(lang),
      quantityEstimation: estimation(lang),
      arithmeticReasoning: arithmetic(lang),
      symbolMapping: symbolMapping(lang),
      sequentialLogic: sequences(lang),
    },
  };
}
