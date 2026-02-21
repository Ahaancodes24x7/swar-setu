// DSM-5 Based Assessment Data for Specific Learning Disorders
// All tests measure: accuracy, response time, and error patterns
// Language-agnostic where possible, adaptable to Indian multilingual context

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
  taskType: 'odd-one-out' | 'syllable-count' | 'phoneme-deletion';
}

export const phonologicalAwarenessData: Record<string, PhonologicalQuestion[]> = {
  en: [
    // Odd One Out - Starting sounds (Grade 1-2)
    { id: 'pa-1', instruction: 'Which word starts with a different sound?', stimulus: ['cat', 'car', 'ball', 'can'], options: ['cat', 'car', 'ball', 'can'], correctAnswer: 'ball', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 15 },
    { id: 'pa-2', instruction: 'Which word starts with a different sound?', stimulus: ['sun', 'sit', 'moon', 'see'], options: ['sun', 'sit', 'moon', 'see'], correctAnswer: 'moon', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 15 },
    { id: 'pa-3', instruction: 'Which word ends with a different sound?', stimulus: ['hat', 'cat', 'bat', 'ham'], options: ['hat', 'cat', 'bat', 'ham'], correctAnswer: 'ham', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 15 },
    
    // Syllable Segmentation (Grade 3-4)
    { id: 'pa-4', instruction: 'How many parts (syllables) are in this word?', stimulus: 'butterfly', options: ['2', '3', '4', '5'], correctAnswer: '3', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'phonological-awareness', taskType: 'syllable-count', timeLimit: 20 },
    { id: 'pa-5', instruction: 'How many parts (syllables) are in this word?', stimulus: 'elephant', options: ['2', '3', '4', '5'], correctAnswer: '3', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'phonological-awareness', taskType: 'syllable-count', timeLimit: 20 },
    { id: 'pa-6', instruction: 'How many parts (syllables) are in this word?', stimulus: 'umbrella', options: ['2', '3', '4', '5'], correctAnswer: '3', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'phonological-awareness', taskType: 'syllable-count', timeLimit: 20 },
    
    // Phoneme Deletion (Grade 5-6)
    { id: 'pa-7', instruction: 'Say "plant" without the "p" sound. What word do you get?', stimulus: 'plant → (remove p)', options: ['lant', 'ant', 'pant', 'plan'], correctAnswer: 'lant', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'phonological-awareness', taskType: 'phoneme-deletion', timeLimit: 20 },
    { id: 'pa-8', instruction: 'Say "smile" without the "s" sound. What word do you get?', stimulus: 'smile → (remove s)', options: ['mile', 'ile', 'sile', 'mil'], correctAnswer: 'mile', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'phonological-awareness', taskType: 'phoneme-deletion', timeLimit: 20 },
    { id: 'pa-9', instruction: 'Say "stand" without the "t" sound. What word do you get?', stimulus: 'stand → (remove t)', options: ['sand', 'and', 'stan', 'sad'], correctAnswer: 'sand', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'phonological-awareness', taskType: 'phoneme-deletion', timeLimit: 20 },

    // Grade 7-8: Advanced phoneme manipulation
    { id: 'pa-10', instruction: 'Say "strength" without the "r" sound. What do you get?', stimulus: 'strength → (remove r)', options: ['stength', 'sength', 'stength', 'stngth'], correctAnswer: 'stength', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'phonological-awareness', taskType: 'phoneme-deletion', timeLimit: 15 },
    { id: 'pa-11', instruction: 'Which pair of words are homophones (sound the same)?', stimulus: ['their/there', 'cat/bat', 'sun/son', 'big/pig'], options: ['their/there', 'cat/bat', 'sun/son', 'big/pig'], correctAnswer: 'their/there', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 15 },
    { id: 'pa-12', instruction: 'Identify the word with a silent letter:', stimulus: ['knight', 'night', 'kite', 'knot'], options: ['knight', 'night', 'kite', 'knot'], correctAnswer: 'knight', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 15 },

    // Grade 9-10: Abstract phonological analysis
    { id: 'pa-13', instruction: 'Which word contains a diphthong (a complex vowel sound)?', stimulus: ['coin', 'pin', 'sit', 'let'], options: ['coin', 'pin', 'sit', 'let'], correctAnswer: 'coin', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 12 },
    { id: 'pa-14', instruction: 'How many morphemes (meaningful parts) are in the word "unhappiness"?', stimulus: 'un-happi-ness', options: ['1', '2', '3', '4'], correctAnswer: '3', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'phonological-awareness', taskType: 'syllable-count', timeLimit: 15 },
    { id: 'pa-15', instruction: 'Which word has a different stress pattern from the others?', stimulus: ['record (noun)', 'record (verb)', 'present (noun)', 'object (noun)'], options: ['record (noun)', 'record (verb)', 'present (noun)', 'object (noun)'], correctAnswer: 'record (verb)', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 12 },
  ],
  hi: [
    { id: 'pa-hi-1', instruction: 'कौन सा शब्द अलग आवाज़ से शुरू होता है?', stimulus: ['माँ', 'मछली', 'गाय', 'मिठाई'], options: ['माँ', 'मछली', 'गाय', 'मिठाई'], correctAnswer: 'गाय', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 15 },
    { id: 'pa-hi-2', instruction: 'कौन सा शब्द अलग आवाज़ से शुरू होता है?', stimulus: ['किताब', 'कमल', 'पानी', 'कलम'], options: ['किताब', 'कमल', 'पानी', 'कलम'], correctAnswer: 'पानी', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'phonological-awareness', taskType: 'odd-one-out', timeLimit: 15 },
    { id: 'pa-hi-3', instruction: 'इस शब्द में कितने भाग (अक्षर) हैं?', stimulus: 'तितली', options: ['2', '3', '4', '5'], correctAnswer: '3', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'phonological-awareness', taskType: 'syllable-count', timeLimit: 20 },
    { id: 'pa-hi-4', instruction: 'इस शब्द में कितने भाग (अक्षर) हैं?', stimulus: 'बगीचा', options: ['2', '3', '4', '5'], correctAnswer: '3', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'phonological-awareness', taskType: 'syllable-count', timeLimit: 20 },
  ],
};

// 2. Pseudoword Decoding Test
export interface PseudowordQuestion extends TestQuestion {
  phonemes: string[];
}

export const pseudowordDecodingData: Record<string, PseudowordQuestion[]> = {
  en: [
    // Grade 1-2: Simple NCERT words - Common nouns and animals
    { id: 'pw-1', instruction: 'Read this word clearly:', stimulus: 'apple', phonemes: ['a', 'p', 'p', 'l', 'e'], correctAnswer: 'apple', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'decoding', timeLimit: 10 },
    { id: 'pw-2', instruction: 'Read this word clearly:', stimulus: 'school', phonemes: ['s', 'c', 'h', 'o', 'o', 'l'], correctAnswer: 'school', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'decoding', timeLimit: 10 },
    { id: 'pw-3', instruction: 'Read this word clearly:', stimulus: 'mother', phonemes: ['m', 'o', 't', 'h', 'e', 'r'], correctAnswer: 'mother', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'decoding', timeLimit: 10 },
    { id: 'pw-4', instruction: 'Read this word clearly:', stimulus: 'elephant', phonemes: ['e', 'l', 'e', 'p', 'h', 'a', 'n', 't'], correctAnswer: 'elephant', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'decoding', timeLimit: 10 },
    
    // Grade 3-4: NCERT words - Common themes from textbooks
    { id: 'pw-5', instruction: 'Read this word clearly:', stimulus: 'together', phonemes: ['t', 'o', 'g', 'e', 't', 'h', 'e', 'r'], correctAnswer: 'together', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'decoding', timeLimit: 15 },
    { id: 'pw-6', instruction: 'Read this word clearly:', stimulus: 'important', phonemes: ['i', 'm', 'p', 'o', 'r', 't', 'a', 'n', 't'], correctAnswer: 'important', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'decoding', timeLimit: 15 },
    { id: 'pw-7', instruction: 'Read this word clearly:', stimulus: 'beautiful', phonemes: ['b', 'e', 'a', 'u', 't', 'i', 'f', 'u', 'l'], correctAnswer: 'beautiful', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'decoding', timeLimit: 15 },
    
    // Grade 5-6: NCERT vocabulary - Advanced words
    { id: 'pw-8', instruction: 'Read this word clearly:', stimulus: 'agriculture', phonemes: ['a', 'g', 'r', 'i', 'c', 'u', 'l', 't', 'u', 'r', 'e'], correctAnswer: 'agriculture', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'decoding', timeLimit: 20 },
    { id: 'pw-9', instruction: 'Read this word clearly:', stimulus: 'civilization', phonemes: ['c', 'i', 'v', 'i', 'l', 'i', 'z', 'a', 't', 'i', 'o', 'n'], correctAnswer: 'civilization', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'decoding', timeLimit: 20 },
    { id: 'pw-10', instruction: 'Read this word clearly:', stimulus: 'environment', phonemes: ['e', 'n', 'v', 'i', 'r', 'o', 'n', 'm', 'e', 'n', 't'], correctAnswer: 'environment', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'decoding', timeLimit: 20 },

    // Grade 7-8: NCERT academic vocabulary
    { id: 'pw-11', instruction: 'Read this word clearly:', stimulus: 'characteristics', phonemes: ['c', 'h', 'a', 'r', 'a', 'c', 't', 'e', 'r', 'i', 's', 't', 'i', 'c', 's'], correctAnswer: 'characteristics', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'decoding', timeLimit: 18 },
    { id: 'pw-12', instruction: 'Read this word clearly:', stimulus: 'independence', phonemes: ['i', 'n', 'd', 'e', 'p', 'e', 'n', 'd', 'e', 'n', 'c', 'e'], correctAnswer: 'independence', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'decoding', timeLimit: 18 },
    { id: 'pw-13', instruction: 'Read this word clearly:', stimulus: 'constitution', phonemes: ['c', 'o', 'n', 's', 't', 'i', 't', 'u', 't', 'i', 'o', 'n'], correctAnswer: 'constitution', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'decoding', timeLimit: 18 },

    // Grade 9-10: Complex NCERT terms
    { id: 'pw-14', instruction: 'Read this word clearly:', stimulus: 'responsibility', phonemes: ['r', 'e', 's', 'p', 'o', 'n', 's', 'i', 'b', 'i', 'l', 'i', 't', 'y'], correctAnswer: 'responsibility', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'decoding', timeLimit: 15 },
    { id: 'pw-15', instruction: 'Read this word clearly:', stimulus: 'achievement', phonemes: ['a', 'c', 'h', 'i', 'e', 'v', 'e', 'm', 'e', 'n', 't'], correctAnswer: 'achievement', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'decoding', timeLimit: 15 },
    { id: 'pw-16', instruction: 'Read this word clearly:', stimulus: 'perspective', phonemes: ['p', 'e', 'r', 's', 'p', 'e', 'c', 't', 'i', 'v', 'e'], correctAnswer: 'perspective', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'decoding', timeLimit: 15 },
  ],
  hi: [
    // Grade 1-2: Common Hindi words from NCERT
    { id: 'pw-hi-1', instruction: 'इस शब्द को साफ़ बोलें:', stimulus: 'सेब', phonemes: ['स', 'े', 'ब'], correctAnswer: 'सेब', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'decoding', timeLimit: 10 },
    { id: 'pw-hi-2', instruction: 'इस शब्द को साफ़ बोलें:', stimulus: 'स्कूल', phonemes: ['स', '्', 'क', 'ू', 'ल'], correctAnswer: 'स्कूल', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'decoding', timeLimit: 10 },
    { id: 'pw-hi-3', instruction: 'इस शब्द को साफ़ बोलें:', stimulus: 'परिवार', phonemes: ['प', 'र', 'ि', 'व', 'ा', 'र'], correctAnswer: 'परिवार', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'decoding', timeLimit: 15 },
    { id: 'pw-hi-4', instruction: 'इस शब्द को साफ़ बोलें:', stimulus: 'गणतंत्र', phonemes: ['ग', 'ण', 'त', 'ं', 'त', 'र'], correctAnswer: 'गणतंत्र', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'decoding', timeLimit: 15 },
  ],
};

// 3. Visual Word Confusion Test
export interface VisualConfusionQuestion extends TestQuestion {
  confusionType: 'reversal' | 'transposition' | 'similar-shape';
}

export const visualConfusionData: Record<string, VisualConfusionQuestion[]> = {
  en: [
    // Letter reversals b/d/p/q
    { id: 'vc-1', instruction: 'Which word is spelled correctly?', stimulus: 'dog', options: ['dog', 'bog', 'pog', 'qog'], correctAnswer: 'dog', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'visual-processing', confusionType: 'reversal', timeLimit: 15 },
    { id: 'vc-2', instruction: 'Which word is spelled correctly?', stimulus: 'bed', options: ['bed', 'ded', 'beb', 'deb'], correctAnswer: 'bed', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'visual-processing', confusionType: 'reversal', timeLimit: 15 },
    { id: 'vc-3', instruction: 'Are these two words the same or different?', stimulus: ['was', 'saw'], options: ['Same', 'Different'], correctAnswer: 'Different', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'visual-processing', confusionType: 'reversal', timeLimit: 10 },
    
    // Word transposition
    { id: 'vc-4', instruction: 'Are these two words the same or different?', stimulus: ['form', 'from'], options: ['Same', 'Different'], correctAnswer: 'Different', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'visual-processing', confusionType: 'transposition', timeLimit: 10 },
    { id: 'vc-5', instruction: 'Are these two words the same or different?', stimulus: ['calm', 'clam'], options: ['Same', 'Different'], correctAnswer: 'Different', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'visual-processing', confusionType: 'transposition', timeLimit: 10 },
    { id: 'vc-6', instruction: 'Are these two words the same or different?', stimulus: ['quite', 'quiet'], options: ['Same', 'Different'], correctAnswer: 'Different', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'visual-processing', confusionType: 'transposition', timeLimit: 10 },
    
    // Similar shape words
    { id: 'vc-7', instruction: 'Which word matches the picture of a flower?', stimulus: '🌸', options: ['flour', 'flower', 'floor', 'flow'], correctAnswer: 'flower', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'visual-processing', confusionType: 'similar-shape', timeLimit: 15 },
    { id: 'vc-8', instruction: 'Which word means "relating to weather"?', stimulus: 'weather/whether', options: ['weather', 'whether'], correctAnswer: 'weather', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'visual-processing', confusionType: 'similar-shape', timeLimit: 15 },
  ],
  hi: [
    { id: 'vc-hi-1', instruction: 'कौन सा शब्द सही है?', stimulus: 'बाल', options: ['बाल', 'वाल', 'पाल', 'भाल'], correctAnswer: 'बाल', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'visual-processing', confusionType: 'similar-shape', timeLimit: 15 },
    { id: 'vc-hi-2', instruction: 'ये दोनों शब्द एक जैसे हैं या अलग?', stimulus: ['बहन', 'बहन'], options: ['एक जैसे', 'अलग'], correctAnswer: 'एक जैसे', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'visual-processing', confusionType: 'reversal', timeLimit: 10 },
    { id: 'vc-hi-3', instruction: 'ये दोनों शब्द एक जैसे हैं या अलग?', stimulus: ['कल', 'कला'], options: ['एक जैसे', 'अलग'], correctAnswer: 'अलग', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'visual-processing', confusionType: 'transposition', timeLimit: 10 },
  ],
};

// 4. Reading Comprehension (Low Load)
export interface ComprehensionQuestion extends TestQuestion {
  passage: string;
  question: string;
}

export const readingComprehensionData: Record<string, ComprehensionQuestion[]> = {
  en: [
    // Grade 1-2: 2-3 line passages
    { id: 'rc-1', instruction: 'Read and answer:', passage: 'The cat sat on the mat. It was a brown cat. The cat was sleeping.', stimulus: 'The cat sat on the mat. It was a brown cat. The cat was sleeping.What color was the cat?', question: 'What color was the cat?', options: ['White', 'Brown', 'Black', 'Gray'], correctAnswer: 'Brown', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'reading-comprehension', timeLimit: 30 },
    { id: 'rc-2', instruction: 'Read and answer:', passage: 'Ram has a red ball. He plays with it every day. His dog likes to chase the ball.', stimulus: 'Ram has a red ball. He plays with it every day. His dog likes to chase the ball.What does Ram have?', question: 'What does Ram have?', options: ['A red ball', 'A blue kite', 'A green car', 'A yellow flower'], correctAnswer: 'A red ball', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'reading-comprehension', timeLimit: 30 },
    
    // Grade 3-4
    { id: 'rc-3', instruction: 'Read and answer:', passage: 'The farmer wakes up early every morning. He goes to his field and waters the plants. His crops grow tall and green because he takes good care of them.', stimulus: 'The farmer wakes up early every morning. He goes to his field and waters the plants. His crops grow tall and green because he takes good care of them.Why do the farmer\'s crops grow well?', question: 'Why do the farmer\'s crops grow well?', options: ['Because it rains a lot', 'Because he takes good care of them', 'Because the soil is special', 'Because he uses magic'], correctAnswer: 'Because he takes good care of them', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'reading-comprehension', timeLimit: 45 },
    
    // Grade 5-6
    { id: 'rc-4', instruction: 'Read and answer:', passage: 'India became independent on August 15, 1947. Before that, India was ruled by the British for nearly 200 years. Many freedom fighters sacrificed their lives so that we could live in a free country.', stimulus: 'India became independent on August 15, 1947. Before that, India was ruled by the British for nearly 200 years. Many freedom fighters sacrificed their lives so that we could live in a free country.How long was India ruled by the British?', question: 'How long was India ruled by the British?', options: ['50 years', '100 years', 'Nearly 200 years', '300 years'], correctAnswer: 'Nearly 200 years', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'reading-comprehension', timeLimit: 60 },

    // Grade 7-8: Inference-based comprehension
    { id: 'rc-5', instruction: 'Read and answer:', passage: 'Deforestation leads to soil erosion, which in turn causes floods during monsoons. The absence of tree roots means the soil cannot absorb rainwater effectively. This creates a chain reaction affecting agriculture, wildlife, and human settlements.', stimulus: 'Deforestation leads to soil erosion, which in turn causes floods during monsoons. The absence of tree roots means the soil cannot absorb rainwater effectively. This creates a chain reaction affecting agriculture, wildlife, and human settlements.What is the primary cause of floods mentioned in the passage?', question: 'What is the primary cause of floods mentioned in the passage?', options: ['Heavy rainfall', 'Soil erosion from deforestation', 'Climate change', 'River overflow'], correctAnswer: 'Soil erosion from deforestation', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'reading-comprehension', timeLimit: 60 },
    { id: 'rc-6', instruction: 'Read and answer:', passage: 'The Mughal Empire reached its peak under Akbar, who promoted religious tolerance through his Din-i-Ilahi. However, Aurangzeb\'s policies of religious intolerance weakened the empire from within, making it vulnerable to external threats.', stimulus: 'The Mughal Empire reached its peak under Akbar, who promoted religious tolerance through his Din-i-Ilahi. However, Aurangzeb\'s policies of religious intolerance weakened the empire from within, making it vulnerable to external threats.', question: 'What contrast does the passage draw between Akbar and Aurangzeb?', options: ['Military vs diplomatic', 'Tolerance vs intolerance', 'Rich vs poor', 'Urban vs rural'], correctAnswer: 'Tolerance vs intolerance', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'reading-comprehension', timeLimit: 60 },

    // Grade 9-10: Critical analysis and inference
    { id: 'rc-7', instruction: 'Read and answer:', passage: 'The paradox of thrift suggests that while individual saving is prudent, if everyone saves simultaneously during an economic downturn, aggregate demand falls, leading to reduced production and ultimately lower incomes for all. This counterintuitive relationship between individual virtue and collective harm illustrates the fallacy of composition in economics.', stimulus: 'The paradox of thrift suggests that while individual saving is prudent, if everyone saves simultaneously during an economic downturn, aggregate demand falls, leading to reduced production and ultimately lower incomes for all. This counterintuitive relationship between individual virtue and collective harm illustrates the fallacy of composition in economics.What does the "fallacy of composition" mean in this context?', question: 'What does the "fallacy of composition" mean in this context?', options: ['What is true for individuals is true for groups', 'What benefits one person may harm the group', 'Saving money is always good', 'Economics is paradoxical'], correctAnswer: 'What benefits one person may harm the group', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'reading-comprehension', timeLimit: 90 },
    { id: 'rc-8', instruction: 'Read and answer:', passage: 'Biomagnification occurs when toxins like DDT accumulate at higher concentrations as they move up the food chain. A small fish may contain trace amounts, but a predatory bird consuming hundreds of fish will have dangerous levels. Rachel Carson\'s Silent Spring documented this phenomenon, catalyzing the environmental movement.', stimulus: 'Biomagnification occurs when toxins like DDT accumulate at higher concentrations as they move up the food chain. A small fish may contain trace amounts, but a predatory bird consuming hundreds of fish will have dangerous levels. Rachel Carson\'s Silent Spring documented this phenomenon, catalyzing the environmental movement.Why do predatory birds have higher toxin levels than small fish?', question: 'Why do predatory birds have higher toxin levels than small fish?', options: ['They produce toxins', 'They accumulate toxins from many prey', 'They live longer', 'They drink contaminated water'], correctAnswer: 'They accumulate toxins from many prey', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'reading-comprehension', timeLimit: 90 },
  ],
  hi: [
    { id: 'rc-hi-1', instruction: 'पढ़ें और उत्तर दें:', passage: 'बिल्ली मैट पर बैठी थी। वह भूरी बिल्ली थी। बिल्ली सो रही थी।', stimulus: 'बिल्ली मैट पर बैठी थी। वह भूरी बिल्ली थी। बिल्ली सो रही थी।', question: 'बिल्ली किस रंग की थी?', options: ['सफेद', 'भूरी', 'काली', 'ग्रे'], correctAnswer: 'भूरी', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'reading-comprehension', timeLimit: 30 },
    { id: 'rc-hi-2', instruction: 'पढ़ें और उत्तर दें:', passage: 'किसान हर सुबह जल्दी उठता है। वह अपने खेत में जाता है और पौधों को पानी देता है। उसकी फसलें अच्छी होती हैं क्योंकि वह उनकी देखभाल करता है।', stimulus: 'किसान हर सुबह जल्दी उठता है। वह अपने खेत में जाता है और पौधों को पानी देता है। उसकी फसलें अच्छी होती हैं क्योंकि वह उनकी देखभाल करता है।', question: 'किसान की फसलें अच्छी क्यों होती हैं?', options: ['बारिश होती है', 'वह देखभाल करता है', 'मिट्टी अच्छी है', 'जादू करता है'], correctAnswer: 'वह देखभाल करता है', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'reading-comprehension', timeLimit: 45 },
  ],
};

// 5. Verbal Working Memory Test
export interface WorkingMemoryQuestion extends TestQuestion {
  sequence: string[];
  direction: 'forward' | 'backward';
}

export const verbalWorkingMemoryData: Record<string, WorkingMemoryQuestion[]> = {
  en: [
    // Forward recall - Grade 1-2
    { id: 'wm-1', instruction: 'Listen and repeat these numbers in the same order:', stimulus: ['3', '7', '2'], sequence: ['3', '7', '2'], correctAnswer: ['3', '7', '2'], direction: 'forward', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'working-memory', timeLimit: 20 },
    { id: 'wm-2', instruction: 'Listen and repeat these numbers in the same order:', stimulus: ['5', '1', '8', '4'], sequence: ['5', '1', '8', '4'], correctAnswer: ['5', '1', '8', '4'], direction: 'forward', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'working-memory', timeLimit: 25 },
    { id: 'wm-3', instruction: 'Listen and repeat these words in the same order:', stimulus: ['cat', 'sun', 'ball'], sequence: ['cat', 'sun', 'ball'], correctAnswer: ['cat', 'sun', 'ball'], direction: 'forward', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'working-memory', timeLimit: 20 },
    
    // Forward recall - Grade 3-4
    { id: 'wm-4', instruction: 'Listen and repeat these numbers in the same order:', stimulus: ['2', '9', '4', '6', '1'], sequence: ['2', '9', '4', '6', '1'], correctAnswer: ['2', '9', '4', '6', '1'], direction: 'forward', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'working-memory', timeLimit: 30 },
    { id: 'wm-5', instruction: 'Listen and repeat these words in the same order:', stimulus: ['tree', 'house', 'river', 'bird', 'flower'], sequence: ['tree', 'house', 'river', 'bird', 'flower'], correctAnswer: ['tree', 'house', 'river', 'bird', 'flower'], direction: 'forward', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'working-memory', timeLimit: 30 },
    
    // Backward recall - Grade 5-6
    { id: 'wm-6', instruction: 'Listen and repeat these numbers in REVERSE order:', stimulus: ['4', '7', '2'], sequence: ['4', '7', '2'], correctAnswer: ['2', '7', '4'], direction: 'backward', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'working-memory', timeLimit: 30 },
    { id: 'wm-7', instruction: 'Listen and repeat these numbers in REVERSE order:', stimulus: ['3', '1', '8', '5'], sequence: ['3', '1', '8', '5'], correctAnswer: ['5', '8', '1', '3'], direction: 'backward', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'working-memory', timeLimit: 35 },
    { id: 'wm-8', instruction: 'Listen and repeat these words in REVERSE order:', stimulus: ['dog', 'car', 'moon'], sequence: ['dog', 'car', 'moon'], correctAnswer: ['moon', 'car', 'dog'], direction: 'backward', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'working-memory', timeLimit: 35 },
  ],
  hi: [
    { id: 'wm-hi-1', instruction: 'सुनें और इन संख्याओं को उसी क्रम में दोहराएं:', stimulus: ['३', '७', '२'], sequence: ['३', '७', '२'], correctAnswer: ['३', '७', '२'], direction: 'forward', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'working-memory', timeLimit: 20 },
    { id: 'wm-hi-2', instruction: 'सुनें और इन शब्दों को उसी क्रम में दोहराएं:', stimulus: ['बिल्ली', 'सूरज', 'गेंद'], sequence: ['बिल्ली', 'सूरज', 'गेंद'], correctAnswer: ['बिल्ली', 'सूरज', 'गेंद'], direction: 'forward', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'working-memory', timeLimit: 20 },
    { id: 'wm-hi-3', instruction: 'सुनें और इन संख्याओं को उल्टे क्रम में दोहराएं:', stimulus: ['४', '७', '२'], sequence: ['४', '७', '२'], correctAnswer: ['२', '७', '४'], direction: 'backward', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'working-memory', timeLimit: 30 },
  ],
};

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

export const magnitudeComparisonData: Record<string, MagnitudeQuestion[]> = {
  en: [
    // Grade 1-2: Single digit comparison
    { id: 'mc-1', instruction: 'Which number is larger? (No counting allowed)', stimulus: ['5', '3'], numbers: [5, 3], options: ['5', '3'], correctAnswer: '5', taskType: 'comparison', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'number-sense', timeLimit: 8 },
    { id: 'mc-2', instruction: 'Which number is larger? (No counting allowed)', stimulus: ['7', '9'], numbers: [7, 9], options: ['7', '9'], correctAnswer: '9', taskType: 'comparison', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'number-sense', timeLimit: 8 },
    { id: 'mc-3', instruction: 'Which number is larger?', stimulus: ['4', '6'], numbers: [4, 6], options: ['4', '6'], correctAnswer: '6', taskType: 'comparison', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'number-sense', timeLimit: 8 },
    
    // Grade 3-4: Two digit comparison
    { id: 'mc-4', instruction: 'Which number is larger?', stimulus: ['34', '43'], numbers: [34, 43], options: ['34', '43'], correctAnswer: '43', taskType: 'comparison', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'number-sense', timeLimit: 10 },
    { id: 'mc-5', instruction: 'Which number is larger?', stimulus: ['78', '87'], numbers: [78, 87], options: ['78', '87'], correctAnswer: '87', taskType: 'comparison', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'number-sense', timeLimit: 10 },
    
    // Number line placement
    { id: 'mc-6', instruction: 'Where would 37 go on a number line from 0 to 100?', stimulus: 'Place 37 between 0-100', targetNumber: 37, range: [0, 100], options: ['Near 0', 'Near 25', 'Near 50', 'Near 75', 'Near 100'], correctAnswer: 'Near 50', taskType: 'number-line', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'number-sense', timeLimit: 15 },
    { id: 'mc-7', instruction: 'Where would 72 go on a number line from 0 to 100?', stimulus: 'Place 72 between 0-100', targetNumber: 72, range: [0, 100], options: ['Near 0', 'Near 25', 'Near 50', 'Near 75', 'Near 100'], correctAnswer: 'Near 75', taskType: 'number-line', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'number-sense', timeLimit: 15 },
    
    // Grade 5-6: Larger numbers
    { id: 'mc-8', instruction: 'Which number is larger?', stimulus: ['1,234', '1,432'], numbers: [1234, 1432], options: ['1,234', '1,432'], correctAnswer: '1,432', taskType: 'comparison', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'number-sense', timeLimit: 12 },
    // Grade 7-8
    { id: 'mc-9', instruction: 'Which fraction is larger?', stimulus: ['3/7', '5/9'], options: ['3/7', '5/9'], correctAnswer: '5/9', taskType: 'comparison', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'number-sense', timeLimit: 15 },
    { id: 'mc-10', instruction: 'Which is larger: 0.45 or 0.405?', stimulus: ['0.45', '0.405'], options: ['0.45', '0.405'], correctAnswer: '0.45', taskType: 'comparison', difficulty: 3, gradeLevel: '7-8', dsm5Domain: 'number-sense', timeLimit: 12 },
    // Grade 9-10
    { id: 'mc-11', instruction: 'Which is larger: √50 or 7?', stimulus: ['√50', '7'], options: ['√50', '7'], correctAnswer: '√50', taskType: 'comparison', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'number-sense', timeLimit: 15 },
    { id: 'mc-12', instruction: 'Arrange in ascending order: 2/3, 0.65, 5/8', stimulus: ['2/3, 0.65, 5/8'], options: ['5/8 < 0.65 < 2/3', '0.65 < 5/8 < 2/3', '5/8 < 2/3 < 0.65', '2/3 < 5/8 < 0.65'], correctAnswer: '5/8 < 0.65 < 2/3', taskType: 'comparison', difficulty: 3, gradeLevel: '9-10', dsm5Domain: 'number-sense', timeLimit: 20 },
  ],
  hi: [
    { id: 'mc-hi-1', instruction: 'कौन सी संख्या बड़ी है? (गिनती नहीं करनी है)', stimulus: ['५', '३'], numbers: [5, 3], options: ['५', '३'], correctAnswer: '५', taskType: 'comparison', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'number-sense', timeLimit: 8 },
    { id: 'mc-hi-2', instruction: 'कौन सी संख्या बड़ी है?', stimulus: ['३४', '४३'], numbers: [34, 43], options: ['३४', '४३'], correctAnswer: '४३', taskType: 'comparison', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'number-sense', timeLimit: 10 },
  ],
};

// 2. Quantity Estimation (Non-Symbolic) - Dot Clusters
export interface DotClusterQuestion extends TestQuestion {
  leftDots: number;
  rightDots: number;
  displayTime: number; // milliseconds
}

export const quantityEstimationData: Record<string, DotClusterQuestion[]> = {
  en: [
    // Grade 1-2: Easy ratios (2:1 or greater)
    { id: 'qe-1', instruction: 'Which group has MORE dots? (Answer quickly!)', stimulus: ['●●●●', '●●'], leftDots: 4, rightDots: 2, displayTime: 1500, options: ['Left', 'Right'], correctAnswer: 'Left', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'approximate-number', timeLimit: 5 },
    { id: 'qe-2', instruction: 'Which group has MORE dots?', stimulus: ['●●●', '●●●●●●'], leftDots: 3, rightDots: 6, displayTime: 1500, options: ['Left', 'Right'], correctAnswer: 'Right', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'approximate-number', timeLimit: 5 },
    { id: 'qe-3', instruction: 'Which group has MORE dots?', stimulus: ['●●●●●●●', '●●●'], leftDots: 7, rightDots: 3, displayTime: 1500, options: ['Left', 'Right'], correctAnswer: 'Left', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'approximate-number', timeLimit: 5 },
    
    // Grade 3-4: Harder ratios (3:2)
    { id: 'qe-4', instruction: 'Which group has MORE dots?', stimulus: ['9 dots', '6 dots'], leftDots: 9, rightDots: 6, displayTime: 1200, options: ['Left', 'Right'], correctAnswer: 'Left', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'approximate-number', timeLimit: 4 },
    { id: 'qe-5', instruction: 'Which group has MORE dots?', stimulus: ['8 dots', '12 dots'], leftDots: 8, rightDots: 12, displayTime: 1200, options: ['Left', 'Right'], correctAnswer: 'Right', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'approximate-number', timeLimit: 4 },
    
    // Grade 5-6: Close ratios (4:3)
    { id: 'qe-6', instruction: 'Which group has MORE dots?', stimulus: ['16 dots', '12 dots'], leftDots: 16, rightDots: 12, displayTime: 1000, options: ['Left', 'Right'], correctAnswer: 'Left', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'approximate-number', timeLimit: 3 },
    { id: 'qe-7', instruction: 'Which group has MORE dots?', stimulus: ['15 dots', '20 dots'], leftDots: 15, rightDots: 20, displayTime: 1000, options: ['Left', 'Right'], correctAnswer: 'Right', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'approximate-number', timeLimit: 3 },
  ],
  hi: [
    { id: 'qe-hi-1', instruction: 'किस समूह में ज़्यादा बिंदु हैं?', stimulus: ['●●●●', '●●'], leftDots: 4, rightDots: 2, displayTime: 1500, options: ['बाएं', 'दाएं'], correctAnswer: 'बाएं', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'approximate-number', timeLimit: 5 },
    { id: 'qe-hi-2', instruction: 'किस समूह में ज़्यादा बिंदु हैं?', stimulus: ['9 बिंदु', '6 बिंदु'], leftDots: 9, rightDots: 6, displayTime: 1200, options: ['बाएं', 'दाएं'], correctAnswer: 'बाएं', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'approximate-number', timeLimit: 4 },
  ],
};

// 3. Arithmetic Reasoning (Conceptual)
export interface ArithmeticQuestion extends TestQuestion {
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
  context: string;
}

export const arithmeticReasoningData: Record<string, ArithmeticQuestion[]> = {
  en: [
    // Grade 1-2: Single-step addition/subtraction with context
    { id: 'ar-1', instruction: 'Solve this word problem:', stimulus: 'Priya has 5 apples. Her friend gives her 3 more apples. How many apples does Priya have now?', context: 'daily-life', operation: 'addition', options: ['6', '7', '8', '9'], correctAnswer: '8', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'math-reasoning', timeLimit: 30 },
    { id: 'ar-2', instruction: 'Solve this word problem:', stimulus: 'Rahul had 10 rupees. He spent 4 rupees on a pencil. How much money does he have left?', context: 'money', operation: 'subtraction', options: ['4', '5', '6', '7'], correctAnswer: '6', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'math-reasoning', timeLimit: 30 },
    { id: 'ar-3', instruction: 'Solve this word problem:', stimulus: 'There are 8 birds on a tree. 3 birds fly away. How many birds are left on the tree?', context: 'daily-life', operation: 'subtraction', options: ['3', '4', '5', '6'], correctAnswer: '5', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'math-reasoning', timeLimit: 30 },
    
    // Grade 3-4: Two-step problems
    { id: 'ar-4', instruction: 'Solve this word problem:', stimulus: 'A shopkeeper has 50 oranges. He sells 18 in the morning and 12 in the evening. How many oranges are left?', context: 'shopping', operation: 'mixed', options: ['18', '20', '22', '30'], correctAnswer: '20', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'math-reasoning', timeLimit: 45 },
    { id: 'ar-5', instruction: 'Solve this word problem:', stimulus: 'A bus can carry 45 passengers. If 28 passengers are already on the bus, how many more can get on?', context: 'transport', operation: 'subtraction', options: ['15', '17', '19', '23'], correctAnswer: '17', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'math-reasoning', timeLimit: 45 },
    { id: 'ar-6', instruction: 'Solve this word problem:', stimulus: 'Each row has 6 chairs. There are 5 rows. How many chairs are there in total?', context: 'classroom', operation: 'multiplication', options: ['11', '25', '30', '35'], correctAnswer: '30', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'math-reasoning', timeLimit: 45 },
    
    // Grade 5-6: Multi-step with larger numbers
    { id: 'ar-7', instruction: 'Solve this word problem:', stimulus: 'A train travels at 60 km per hour. How far will it travel in 4 hours?', context: 'distance', operation: 'multiplication', options: ['180 km', '200 km', '240 km', '280 km'], correctAnswer: '240 km', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'math-reasoning', timeLimit: 60 },
    { id: 'ar-8', instruction: 'Solve this word problem:', stimulus: 'A school has 480 students. They are divided equally into 8 classes. How many students are in each class?', context: 'school', operation: 'division', options: ['50', '55', '60', '65'], correctAnswer: '60', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'math-reasoning', timeLimit: 60 },
  ],
  hi: [
    { id: 'ar-hi-1', instruction: 'इस सवाल को हल करें:', stimulus: 'प्रिया के पास 5 सेब हैं। उसकी सहेली उसे 3 और सेब देती है। अब प्रिया के पास कितने सेब हैं?', context: 'daily-life', operation: 'addition', options: ['6', '7', '8', '9'], correctAnswer: '8', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'math-reasoning', timeLimit: 30 },
    { id: 'ar-hi-2', instruction: 'इस सवाल को हल करें:', stimulus: 'एक दुकानदार के पास 50 संतरे हैं। वह सुबह 18 और शाम को 12 बेचता है। कितने संतरे बचे?', context: 'shopping', operation: 'mixed', options: ['18', '20', '22', '30'], correctAnswer: '20', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'math-reasoning', timeLimit: 45 },
  ],
};

// 4. Symbol-Quantity Mapping
export interface SymbolMappingQuestion extends TestQuestion {
  taskType: 'number-to-dots' | 'dots-to-number' | 'spoken-to-written';
}

export const symbolMappingData: Record<string, SymbolMappingQuestion[]> = {
  en: [
    // Match number to dot group
    { id: 'sm-1', instruction: 'How many dots are there?', stimulus: '●●●●●', options: ['3', '4', '5', '6'], correctAnswer: '5', taskType: 'dots-to-number', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'symbol-mapping', timeLimit: 10 },
    { id: 'sm-2', instruction: 'How many dots are there?', stimulus: '●●●●●●●', options: ['5', '6', '7', '8'], correctAnswer: '7', taskType: 'dots-to-number', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'symbol-mapping', timeLimit: 10 },
    { id: 'sm-3', instruction: 'Which group shows the number 4?', stimulus: '4', options: ['●●●', '●●●●', '●●●●●', '●●'], correctAnswer: '●●●●', taskType: 'number-to-dots', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'symbol-mapping', timeLimit: 10 },
    
    // Spoken to written
    { id: 'sm-4', instruction: 'Which number is "twenty-three"?', stimulus: 'twenty-three', options: ['32', '23', '13', '33'], correctAnswer: '23', taskType: 'spoken-to-written', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'symbol-mapping', timeLimit: 12 },
    { id: 'sm-5', instruction: 'Which number is "forty-seven"?', stimulus: 'forty-seven', options: ['74', '47', '37', '57'], correctAnswer: '47', taskType: 'spoken-to-written', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'symbol-mapping', timeLimit: 12 },
    
    // Larger numbers
    { id: 'sm-6', instruction: 'Which number is "one thousand two hundred"?', stimulus: 'one thousand two hundred', options: ['1,002', '1,020', '1,200', '2,100'], correctAnswer: '1,200', taskType: 'spoken-to-written', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'symbol-mapping', timeLimit: 15 },
  ],
  hi: [
    { id: 'sm-hi-1', instruction: 'कितने बिंदु हैं?', stimulus: '●●●●●', options: ['३', '४', '५', '६'], correctAnswer: '५', taskType: 'dots-to-number', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'symbol-mapping', timeLimit: 10 },
    { id: 'sm-hi-2', instruction: '"तेईस" कौन सी संख्या है?', stimulus: 'तेईस', options: ['३२', '२३', '१३', '३३'], correctAnswer: '२३', taskType: 'spoken-to-written', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'symbol-mapping', timeLimit: 12 },
  ],
};

// 5. Sequential Logic Test
export interface SequenceQuestion extends TestQuestion {
  pattern: (number | string)[];
  missingIndex: number;
}

export const sequentialLogicData: Record<string, SequenceQuestion[]> = {
  en: [
    // Grade 1-2: Simple counting patterns
    { id: 'sl-1', instruction: 'What number comes next?', stimulus: ['1', '2', '3', '4', '?'], pattern: [1, 2, 3, 4], missingIndex: 4, options: ['5', '6', '7', '8'], correctAnswer: '5', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'sequential-logic', timeLimit: 15 },
    { id: 'sl-2', instruction: 'What number comes next?', stimulus: ['2', '4', '6', '8', '?'], pattern: [2, 4, 6, 8], missingIndex: 4, options: ['9', '10', '11', '12'], correctAnswer: '10', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'sequential-logic', timeLimit: 15 },
    { id: 'sl-3', instruction: 'What number is missing?', stimulus: ['5', '10', '?', '20', '25'], pattern: [5, 10, 15, 20, 25], missingIndex: 2, options: ['12', '13', '14', '15'], correctAnswer: '15', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'sequential-logic', timeLimit: 15 },
    
    // Grade 3-4: Skip counting patterns
    { id: 'sl-4', instruction: 'What number comes next?', stimulus: ['3', '6', '9', '12', '?'], pattern: [3, 6, 9, 12], missingIndex: 4, options: ['13', '14', '15', '16'], correctAnswer: '15', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'sequential-logic', timeLimit: 20 },
    { id: 'sl-5', instruction: 'What number is missing?', stimulus: ['4', '8', '?', '16', '20'], pattern: [4, 8, 12, 16, 20], missingIndex: 2, options: ['10', '11', '12', '13'], correctAnswer: '12', difficulty: 2, gradeLevel: '3-4', dsm5Domain: 'sequential-logic', timeLimit: 20 },
    
    // Grade 5-6: Complex patterns (doubling, etc.)
    { id: 'sl-6', instruction: 'What number comes next?', stimulus: ['2', '4', '8', '16', '?'], pattern: [2, 4, 8, 16], missingIndex: 4, options: ['24', '28', '32', '36'], correctAnswer: '32', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'sequential-logic', timeLimit: 25 },
    { id: 'sl-7', instruction: 'What number comes next?', stimulus: ['1', '3', '6', '10', '?'], pattern: [1, 3, 6, 10], missingIndex: 4, options: ['13', '14', '15', '16'], correctAnswer: '15', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'sequential-logic', timeLimit: 25 },
    { id: 'sl-8', instruction: 'What is the missing number?', stimulus: ['100', '90', '?', '70', '60'], pattern: [100, 90, 80, 70, 60], missingIndex: 2, options: ['75', '80', '85', '88'], correctAnswer: '80', difficulty: 3, gradeLevel: '5-6', dsm5Domain: 'sequential-logic', timeLimit: 25 },
  ],
  hi: [
    { id: 'sl-hi-1', instruction: 'अगली संख्या क्या है?', stimulus: ['१', '२', '३', '४', '?'], pattern: [1, 2, 3, 4], missingIndex: 4, options: ['५', '६', '७', '८'], correctAnswer: '५', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'sequential-logic', timeLimit: 15 },
    { id: 'sl-hi-2', instruction: 'अगली संख्या क्या है?', stimulus: ['२', '४', '६', '८', '?'], pattern: [2, 4, 6, 8], missingIndex: 4, options: ['९', '१०', '११', '१२'], correctAnswer: '१०', difficulty: 1, gradeLevel: '1-2', dsm5Domain: 'sequential-logic', timeLimit: 15 },
  ],
};

// Helper function to get questions by grade
export function getQuestionsByGrade<T extends TestQuestion>(
  questions: T[],
  gradeNum: number
): T[] {
  const gradeLevel = gradeNum <= 2 ? '1-2' : gradeNum <= 4 ? '3-4' : gradeNum <= 6 ? '5-6' : gradeNum <= 8 ? '7-8' : '9-10';
  
  // Primary: get questions at the student's grade level
  let gradeQuestions = questions.filter(q => q.gradeLevel === gradeLevel);
  
  // If not enough questions at this level, include adjacent lower level
  if (gradeQuestions.length < 3) {
    const fallbackLevel = gradeNum <= 2 ? '1-2' : gradeNum <= 4 ? '1-2' : gradeNum <= 6 ? '3-4' : gradeNum <= 8 ? '5-6' : '7-8';
    const fallbackQuestions = questions.filter(q => q.gradeLevel === fallbackLevel && !gradeQuestions.includes(q));
    gradeQuestions = [...gradeQuestions, ...fallbackQuestions];
  }
  
  return gradeQuestions;
}

// Get test data for a language with fallback to English
export function getTestData(langCode: string) {
  const lang = ['en', 'hi'].includes(langCode) ? langCode : 'en';
  
  return {
    dyslexia: {
      phonologicalAwareness: phonologicalAwarenessData[lang] || phonologicalAwarenessData.en,
      pseudowordDecoding: pseudowordDecodingData[lang] || pseudowordDecodingData.en,
      visualConfusion: visualConfusionData[lang] || visualConfusionData.en,
      readingComprehension: readingComprehensionData[lang] || readingComprehensionData.en,
      verbalWorkingMemory: verbalWorkingMemoryData[lang] || verbalWorkingMemoryData.en,
    },
    dyscalculia: {
      magnitudeComparison: magnitudeComparisonData[lang] || magnitudeComparisonData.en,
      quantityEstimation: quantityEstimationData[lang] || quantityEstimationData.en,
      arithmeticReasoning: arithmeticReasoningData[lang] || arithmeticReasoningData.en,
      symbolMapping: symbolMappingData[lang] || symbolMappingData.en,
      sequentialLogic: sequentialLogicData[lang] || sequentialLogicData.en,
    },
  };
}
