// DSM-5 Compliant, NCERT-Aligned Test Prompts for SLD Screening
// Based on DSM-5 criteria for Specific Learning Disorders
// Progressive difficulty: Words → Sentences → Short paragraphs
// Grade-appropriate content from NCERT curriculum

export interface TestPrompt {
  text: string;
  difficulty: 1 | 2 | 3;
  category: "word" | "sentence" | "paragraph";
  gradeLevel: string;
  dsm5Domain?: "reading-accuracy" | "reading-fluency" | "reading-comprehension" | "number-sense" | "calculation" | "math-reasoning";
}

export interface DyslexiaPrompts {
  words: TestPrompt[];
  sentences: TestPrompt[];
  paragraphs: TestPrompt[];
}

export interface DyscalculiaPrompts {
  numberReading: TestPrompt[];
  numberSequence: TestPrompt[];
  wordProblems: TestPrompt[];
}

export interface TestPromptsByLanguage {
  dyslexia: DyslexiaPrompts;
  dyscalculia: DyscalculiaPrompts;
}

// ============================================
// ENGLISH DSM-5 & NCERT ALIGNED PROMPTS
// ============================================
const englishPrompts: TestPromptsByLanguage = {
  dyslexia: {
    words: [
      { text: "cat, bat, sun, red, big, run, sit, hop", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "reading-accuracy" },
      { text: "ball, tree, milk, book, hand, fish, bird, girl", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "reading-accuracy" },
      { text: "happy, mother, father, water, garden, sister", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "reading-accuracy" },
      { text: "beautiful, elephant, butterfly, umbrella, vegetable", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "reading-accuracy" },
      { text: "mountain, festival, celebrate, tomorrow, hospital", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "reading-accuracy" },
      { text: "important, different, wonderful, dangerous, interesting", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "reading-accuracy" },
      { text: "responsibility, environment, communication, technology", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "reading-accuracy" },
      { text: "independence, constitution, democracy, civilization", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "reading-accuracy" },
      { text: "photosynthesis, biodiversity, ecosystem, atmosphere", difficulty: 3, category: "word", gradeLevel: "7-8", dsm5Domain: "reading-accuracy" },
      { text: "parliamentary, infrastructure, archaeological, chronological", difficulty: 3, category: "word", gradeLevel: "7-8", dsm5Domain: "reading-accuracy" },
      { text: "thermodynamics, electromagnetism, stoichiometry, organic chemistry", difficulty: 3, category: "word", gradeLevel: "9-10", dsm5Domain: "reading-accuracy" },
      { text: "differentiation, integration, trigonometry, jurisprudence, macroeconomics", difficulty: 3, category: "word", gradeLevel: "11-12", dsm5Domain: "reading-accuracy" },
    ],
    sentences: [
      { text: "The cat sat on the mat.", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "I go to school every day.", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "My mother makes tasty food.", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "Birds fly in the blue sky.", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "The farmer works hard in his green field every morning.", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "My grandmother tells us wonderful stories about her village.", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "We should drink clean water and eat healthy food.", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "The children celebrated the festival of lights with their families and friends.", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "reading-fluency" },
      { text: "India became independent on the fifteenth of August, nineteen forty-seven.", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "reading-fluency" },
      { text: "The water cycle involves evaporation, condensation, and precipitation.", difficulty: 3, category: "sentence", gradeLevel: "7-8", dsm5Domain: "reading-fluency" },
      { text: "Photosynthesis converts light energy into chemical energy stored in glucose molecules.", difficulty: 3, category: "sentence", gradeLevel: "9-10", dsm5Domain: "reading-fluency" },
      { text: "The Constitution guarantees fundamental rights while prescribing fundamental duties for every citizen.", difficulty: 3, category: "sentence", gradeLevel: "11-12", dsm5Domain: "reading-fluency" },
    ],
    paragraphs: [
      { text: "The sun rises in the east. Birds wake up and sing. Children go to school.", difficulty: 1, category: "paragraph", gradeLevel: "1-2", dsm5Domain: "reading-comprehension" },
      { text: "I have a pet dog. His name is Tommy. He likes to play with me.", difficulty: 1, category: "paragraph", gradeLevel: "1-2", dsm5Domain: "reading-comprehension" },
      { text: "India is my country. It has many states and languages. People celebrate different festivals together. Unity in diversity makes India special.", difficulty: 2, category: "paragraph", gradeLevel: "3-4", dsm5Domain: "reading-comprehension" },
      { text: "Plants need sunlight, water, and air to grow. They make their own food. We should plant more trees. Trees give us fresh oxygen.", difficulty: 2, category: "paragraph", gradeLevel: "3-4", dsm5Domain: "reading-comprehension" },
      { text: "Trees are very important for our environment. They give us oxygen to breathe and shade to rest. They also provide homes for birds and animals. We should plant more trees and take care of them.", difficulty: 3, category: "paragraph", gradeLevel: "5-6", dsm5Domain: "reading-comprehension" },
      { text: "The Earth revolves around the Sun once every year. This movement causes the change of seasons. When the Northern Hemisphere tilts toward the Sun, it experiences summer. When it tilts away, winter arrives.", difficulty: 3, category: "paragraph", gradeLevel: "7-8", dsm5Domain: "reading-comprehension" },
      { text: "Democracy ensures participation of citizens in decision-making through elected representatives. The division of powers between legislature, executive, and judiciary prevents misuse of authority.", difficulty: 3, category: "paragraph", gradeLevel: "9-10", dsm5Domain: "reading-comprehension" },
      { text: "Sustainable development balances economic growth with ecological preservation. It aims to satisfy current human needs without compromising the ability of future generations to meet their own requirements.", difficulty: 3, category: "paragraph", gradeLevel: "11-12", dsm5Domain: "reading-comprehension" },
    ],
  },
  dyscalculia: {
    numberReading: [
      { text: "Read these numbers: 1, 5, 3, 8, 2, 9, 4, 7, 6, 10", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "number-sense" },
      { text: "Read these numbers: 11, 14, 16, 13, 18, 15, 12, 19, 17, 20", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "number-sense" },
      { text: "Read these numbers: 23, 47, 65, 89, 54, 31, 76, 92", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "number-sense" },
      { text: "Read these numbers: 105, 250, 399, 472, 618, 803", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "number-sense" },
      { text: "Read these numbers: 1,234  5,678  10,050  25,000", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "number-sense" },
      { text: "Read these numbers: 3.5, 12.75, 100.25, 0.5", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "number-sense" },
      { text: "Read: one lakh twenty thousand, five crore thirty lakh", difficulty: 3, category: "word", gradeLevel: "7-8", dsm5Domain: "number-sense" },
      { text: "Read: 3.14159, 1.6 × 10^-19, 6.022 × 10^23", difficulty: 3, category: "word", gradeLevel: "9-10", dsm5Domain: "number-sense" },
      { text: "Read: sin(π/2) = 1, lim x→0 (1/x), dy/dx = 2x", difficulty: 3, category: "word", gradeLevel: "11-12", dsm5Domain: "number-sense" },
    ],
    numberSequence: [
      { text: "Count from 1 to 20", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "Count from 10 to 1 backwards", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "Count by 2s from 2 to 20: two, four, six...", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "calculation" },
      { text: "Count by 5s from 5 to 50: five, ten, fifteen...", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "calculation" },
      { text: "Count backwards from 50 to 40", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "calculation" },
      { text: "Say the 7 times table: 7, 14, 21, 28...", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "calculation" },
      { text: "Count by 25s from 25 to 200", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "calculation" },
      { text: "What comes next: 2, 4, 8, 16, ?", difficulty: 3, category: "sentence", gradeLevel: "7-8", dsm5Domain: "calculation" },
      { text: "What comes next: 1, 1, 2, 3, 5, 8, ?", difficulty: 3, category: "sentence", gradeLevel: "9-10", dsm5Domain: "calculation" },
      { text: "Complete the geometric progression: 3, 9, 27, 81, ?", difficulty: 3, category: "sentence", gradeLevel: "11-12", dsm5Domain: "calculation" },
    ],
    wordProblems: [
      { text: "You have 5 apples. Your friend gives you 3 more. How many apples do you have now?", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "math-reasoning" },
      { text: "There are 8 birds on a tree. 2 birds fly away. How many birds are left?", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "math-reasoning" },
      { text: "Rani has 4 pencils. Raj has 5 pencils. How many pencils do they have together?", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "math-reasoning" },
      { text: "A farmer has 24 mangoes. He gives 8 to his neighbor and 6 to his children. How many mangoes are left?", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "math-reasoning" },
      { text: "There are 5 rows of chairs with 6 chairs in each row. How many chairs are there in total?", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "math-reasoning" },
      { text: "A book costs 45 rupees. How much will 3 books cost?", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "math-reasoning" },
      { text: "A shopkeeper sold 156 notebooks on Monday and 234 on Tuesday. He had 500 notebooks. How many are left?", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "math-reasoning" },
      { text: "A train travels at 60 kilometers per hour. How far will it travel in 3 hours?", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "math-reasoning" },
      { text: "If 12 workers can build a wall in 8 days, how many days will 6 workers take?", difficulty: 3, category: "sentence", gradeLevel: "7-8", dsm5Domain: "math-reasoning" },
      { text: "The ratio of boys to girls in a class is 3:2. If there are 30 students, how many are girls?", difficulty: 3, category: "sentence", gradeLevel: "7-8", dsm5Domain: "math-reasoning" },
      { text: "A loan of 10,000 rupees accrues simple interest at 5% per annum for 3 years. What is the total interest?", difficulty: 3, category: "sentence", gradeLevel: "9-10", dsm5Domain: "math-reasoning" },
      { text: "In a right-angled triangle, the base is 6 cm and hypotenuse is 10 cm. Find the perpendicular height.", difficulty: 3, category: "sentence", gradeLevel: "11-12", dsm5Domain: "math-reasoning" },
    ],
  },
};

// ============================================
// HINDI DSM-5 & NCERT ALIGNED PROMPTS
// ============================================
const hindiPrompts: TestPromptsByLanguage = {
  dyslexia: {
    words: [
      { text: "माँ, पानी, घर, फूल, पेड़, नाम, काम, बच्चा", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "reading-accuracy" },
      { text: "किताब, कमल, गमला, तितली, मछली, बिल्ली", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "reading-accuracy" },
      { text: "सुंदर, बगीचा, आसमान, तितली, हाथी, चिड़िया", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "reading-accuracy" },
      { text: "त्योहार, दीपावली, रंगोली, मिठाई, खुशियाँ", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "reading-accuracy" },
      { text: "अध्यापक, पर्यावरण, स्वतंत्रता, परिवार, विद्यालय", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "reading-accuracy" },
      { text: "लोकतंत्र, संविधान, नागरिकता, जिम्मेदारी", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "reading-accuracy" },
      { text: "प्रकाशसंश्लेषण, जैवविविधता, पारिस्थितिकी, वायुमंडल", difficulty: 3, category: "word", gradeLevel: "7-8", dsm5Domain: "reading-accuracy" },
    ],
    sentences: [
      { text: "राम स्कूल जाता है।", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "यह मेरा घर है।", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "माँ खाना बनाती है।", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "चिड़िया पेड़ पर बैठी है।", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "मेरी माँ बहुत अच्छा खाना बनाती हैं।", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "बच्चे बगीचे में खेल रहे हैं।", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "किसान खेत में फसल उगाता है।", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "हमारे देश में कई भाषाएँ बोली जाती हैं।", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "reading-fluency" },
      { text: "पंद्रह अगस्त उन्नीस सौ सैंतालीस को भारत स्वतंत्र हुआ।", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "reading-fluency" },
      { text: "जल चक्र में वाष्पीकरण, संघनन और वर्षण शामिल हैं।", difficulty: 3, category: "sentence", gradeLevel: "7-8", dsm5Domain: "reading-fluency" },
    ],
    paragraphs: [
      { text: "सूरज सुबह उगता है। पक्षी गाते हैं। बच्चे स्कूल जाते हैं।", difficulty: 1, category: "paragraph", gradeLevel: "1-2", dsm5Domain: "reading-comprehension" },
      { text: "मेरे पास एक कुत्ता है। उसका नाम टॉमी है। वह मेरे साथ खेलता है।", difficulty: 1, category: "paragraph", gradeLevel: "1-2", dsm5Domain: "reading-comprehension" },
      { text: "भारत एक बड़ा देश है। यहाँ अनेक त्योहार मनाए जाते हैं। सभी मिलकर खुशियाँ बाँटते हैं। अनेकता में एकता भारत की पहचान है।", difficulty: 2, category: "paragraph", gradeLevel: "3-4", dsm5Domain: "reading-comprehension" },
      { text: "पौधों को बढ़ने के लिए धूप, पानी और हवा चाहिए। वे अपना भोजन खुद बनाते हैं। पेड़ हमें ताज़ी हवा देते हैं।", difficulty: 2, category: "paragraph", gradeLevel: "3-4", dsm5Domain: "reading-comprehension" },
      { text: "पेड़ हमारे लिए बहुत महत्वपूर्ण हैं। वे हमें ऑक्सीजन देते हैं और छाया प्रदान करते हैं। वे पक्षियों और जानवरों का घर भी हैं। हमें अधिक पेड़ लगाने चाहिए।", difficulty: 3, category: "paragraph", gradeLevel: "5-6", dsm5Domain: "reading-comprehension" },
      { text: "पृथ्वी सूर्य की परिक्रमा एक वर्ष में करती है। इस गति से ऋतुएँ बदलती हैं। जब उत्तरी गोलार्ध सूर्य की ओर झुकता है, तब गर्मी होती है। जब दूर होता है, तब सर्दी आती है।", difficulty: 3, category: "paragraph", gradeLevel: "7-8", dsm5Domain: "reading-comprehension" },
    ],
  },
  dyscalculia: {
    numberReading: [
      { text: "इन संख्याओं को पढ़ें: एक, पाँच, तीन, आठ, दो, नौ, चार, सात, छह, दस", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "number-sense" },
      { text: "इन संख्याओं को पढ़ें: ग्यारह, चौदह, सोलह, तेरह, अठारह, पंद्रह, बारह", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "number-sense" },
      { text: "इन संख्याओं को पढ़ें: तेईस, सैंतालीस, पैंसठ, नवासी, चौवन", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "number-sense" },
      { text: "इन संख्याओं को पढ़ें: एक सौ पाँच, दो सौ पचास, तीन सौ निन्यानवे", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "number-sense" },
      { text: "इन संख्याओं को पढ़ें: एक हज़ार दो सौ चौंतीस, पाँच हज़ार छह सौ अठहत्तर", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "number-sense" },
      { text: "पढ़ें: एक लाख बीस हज़ार, पाँच करोड़ तीस लाख", difficulty: 3, category: "word", gradeLevel: "7-8", dsm5Domain: "number-sense" },
    ],
    numberSequence: [
      { text: "एक से बीस तक गिनती करें", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "दस से एक तक उल्टी गिनती करें", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "दो-दो की गिनती: दो, चार, छह... बीस तक", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "calculation" },
      { text: "पाँच-पाँच की गिनती: पाच, दस, पंद्रह... पचास तक", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "calculation" },
      { text: "सात का पहाड़ा बोलें: सात, चौदह, इक्कीस...", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "calculation" },
      { text: "अगला क्या आएगा: दो, चार, आठ, सोलह, ?", difficulty: 3, category: "sentence", gradeLevel: "7-8", dsm5Domain: "calculation" },
    ],
    wordProblems: [
      { text: "राम के पास 5 सेब हैं। उसे 3 और मिलते हैं। कुल कितने सेब हैं?", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "math-reasoning" },
      { text: "पेड़ पर 8 पक्षी हैं। 2 उड़ जाते हैं। कितने बचे?", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "math-reasoning" },
      { text: "एक किसान के पास 24 आम हैं। वह 8 पड़ोसी को और 6 बच्चों को देता है। कितने बचे?", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "math-reasoning" },
      { text: "5 पंक्तियों में 6-6 कुर्सियाँ हैं। कुल कितनी कुर्सियाँ हैं?", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "math-reasoning" },
      { text: "एक दुकानदार ने सोमवार को 156 और मंगलवार को 234 कॉपियाँ बेचीं। उसके पास 500 थीं। कितनी बचीं?", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "math-reasoning" },
      { text: "अगर 12 मज़दूर एक दीवार 8 दिन में बनाते हैं, तो 6 मज़दूर कितने दिन में बनाएँगे?", difficulty: 3, category: "sentence", gradeLevel: "7-8", dsm5Domain: "math-reasoning" },
    ],
  },
};

// ============================================
// BENGALI DSM-5 & NCERT ALIGNED PROMPTS
// ============================================
const bengaliPrompts: TestPromptsByLanguage = {
  dyslexia: {
    words: [
      { text: "মা, জল, ঘর, ফুল, গাছ, নাম, কাজ, বই", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "reading-accuracy" },
      { text: "সুন্দর, বাগান, আকাশ, প্রজাপতি, হাতি, পাখি", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "reading-accuracy" },
      { text: "শিক্ষক, পরিবেশ, স্বাধীনতা, পরিবার, বিদ্যালয়", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "reading-accuracy" },
    ],
    sentences: [
      { text: "এটা আমার বাড়ি।", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "পাখি গাছে বসে আছে।", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "আমার মা খুব ভালো রান্না করেন।", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "আমাদের দেশে অনেক ভাষা বলা হয়।", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "reading-fluency" },
    ],
    paragraphs: [
      { text: "সূর্য সকালে ওঠে। পাখি গান গায়। শিশুরা স্কুলে যায়।", difficulty: 1, category: "paragraph", gradeLevel: "1-2", dsm5Domain: "reading-comprehension" },
      { text: "ভারত একটি বড় দেশ। এখানে অনেক উৎসব পালিত হয়। সবাই মিলে খুশি ভাগ করে।", difficulty: 2, category: "paragraph", gradeLevel: "3-4", dsm5Domain: "reading-comprehension" },
      { text: "গাছ আমাদের জন্য খুব গুরুত্বপূর্ণ। তারা আমাদের অক্সিজেন দেয় এবং ছায়া দেয়। আমাদের আরও গাছ লাগানো উচিত।", difficulty: 3, category: "paragraph", gradeLevel: "5-6", dsm5Domain: "reading-comprehension" },
    ],
  },
  dyscalculia: {
    numberReading: [
      { text: "এই সংখ্যাগুলি পড়ুন: এক, দুই, তিন, চার, পাঁচ, ছয়, সাত, আট, নয়, দশ", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "number-sense" },
      { text: "এই সংখ্যাগুলি পড়ুন: তেইশ, সাতচল্লিশ, পঁয়ষট্টি, উননব্বই", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "number-sense" },
      { text: "এই সংখ্যাগুলি পড়ুন: এক হাজার দুইশো চৌত্রিশ, পাঁচ হাজার ছয়শো আটাত্তর", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "number-sense" },
    ],
    numberSequence: [
      { text: "এক থেকে কুড়ি পর্যন্ত গুনুন", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "দশ থেকে এক পর্যন্ত উল্টো গুনুন", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "পাঁচ করে গুনুন: পাঁচ, দশ, পনেরো... পঞ্চাশ পর্যন্ত", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "calculation" },
      { text: "সাতের নামতা বলুন: সাত, চৌদ্দ, একুশ...", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "calculation" },
    ],
    wordProblems: [
      { text: "রামের কাছে ৫টি আপেল আছে। সে আরও ৩টি পায়। মোট কটি আপেল?", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "math-reasoning" },
      { text: "একজন কৃষকের ২৪টি আম আছে। সে ৮টি প্রতিবেশীকে দেয়। কটি বাকি?", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "math-reasoning" },
      { text: "একজন দোকানদার সোমবার ১৫৬টি এবং মঙ্গলবার ২৩৪টি খাতা বিক্রি করলেন। মোট কটি?", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "math-reasoning" },
    ],
  },
};

// ============================================
// TAMIL DSM-5 & NCERT ALIGNED PROMPTS
// ============================================
const tamilPrompts: TestPromptsByLanguage = {
  dyslexia: {
    words: [
      { text: "அம்மா, தண்ணீர், வீடு, பூ, மரம், பெயர், வேலை, புத்தகம்", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "reading-accuracy" },
      { text: "அழகான, தோட்டம், வானம், பட்டாம்பூச்சி, யானை, பறவை", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "reading-accuracy" },
      { text: "ஆசிரியர், சுற்றுச்சூழல், சுதந்திரம், குடும்பம், பள்ளிக்கூடம்", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "reading-accuracy" },
    ],
    sentences: [
      { text: "இது என் வீடு.", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "பறவை மரத்தில் அமர்ந்துள்ளது.", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "reading-fluency" },
      { text: "என் அம்மா நன்றாக சமைப்பார்.", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "reading-fluency" },
      { text: "நம் நாட்டில் பல மொழிகள் பேசப்படுகின்றன.", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "reading-fluency" },
    ],
    paragraphs: [
      { text: "சூரியன் காலையில் உதிக்கும். பறவைகள் பாடும். குழந்தைகள் பள்ளிக்குச் செல்வர்.", difficulty: 1, category: "paragraph", gradeLevel: "1-2", dsm5Domain: "reading-comprehension" },
      { text: "இந்தியா ஒரு பெரிய நாடு. இங்கே பல திருவிழாக்கள் கொண்டாடப்படுகின்றன. அனைவரும் சேர்ந்து மகிழ்ச்சியைப் பகிர்வர்.", difficulty: 2, category: "paragraph", gradeLevel: "3-4", dsm5Domain: "reading-comprehension" },
      { text: "மரங்கள் நமக்கு மிக முக்கியமானவை. அவை நமக்கு ஆக்சிஜன் தருகின்றன மற்றும் நிழல் அளிக்கின்றன. நாம் மேலும் மரங்களை நட வேண்டும்.", difficulty: 3, category: "paragraph", gradeLevel: "5-6", dsm5Domain: "reading-comprehension" },
    ],
  },
  dyscalculia: {
    numberReading: [
      { text: "இந்த எண்களைப் படிக்கவும்: ஒன்று, இரண்டு, மூன்று, நான்கு, ஐந்து, ஆறு, ஏழு, எட்டு, ஒன்பது, பத்து", difficulty: 1, category: "word", gradeLevel: "1-2", dsm5Domain: "number-sense" },
      { text: "இந்த எண்களைப் படிக்கவும்: இருபத்திமூன்று, நாற்பத்தேழு, அறுபத்தைந்து", difficulty: 2, category: "word", gradeLevel: "3-4", dsm5Domain: "number-sense" },
      { text: "இந்த எண்களைப் படிக்கவும்: ஆயிரத்து இருநூற்று முப்பத்திநான்கு", difficulty: 3, category: "word", gradeLevel: "5-6", dsm5Domain: "number-sense" },
    ],
    numberSequence: [
      { text: "ஒன்று முதல் இருபது வரை எண்ணுங்கள்", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "பத்து முதல் ஒன்று வரை பின்னோக்கி எண்ணுங்கள்", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "calculation" },
      { text: "ஐந்து ஐந்தாக எண்ணுங்கள்: ஐந்து, பத்து, பதினைந்து... ஐம்பது வரை", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "calculation" },
      { text: "ஏழு பெருக்கல் வாய்ப்பாடு சொல்லுங்கள்", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "calculation" },
    ],
    wordProblems: [
      { text: "ராமுவிடம் 5 ஆப்பிள்கள் உள்ளன. அவனுக்கு மேலும் 3 கிடைக்கின்றன. மொத்தம் எத்தனை?", difficulty: 1, category: "sentence", gradeLevel: "1-2", dsm5Domain: "math-reasoning" },
      { text: "ஒரு விவசாயியிடம் 24 மாம்பழங்கள் உள்ளன. அவர் 8 ஐ அண்டை வீட்டாருக்குக் கொடுக்கிறார். எத்தனை மீதமுள்ளன?", difficulty: 2, category: "sentence", gradeLevel: "3-4", dsm5Domain: "math-reasoning" },
      { text: "ஒரு கடைக்காரர் திங்களன்று 156 நோட்புக்குகளையும் செவ்வாயன்று 234 ஐயும் விற்றார். மொத்தம் எத்தனை?", difficulty: 3, category: "sentence", gradeLevel: "5-6", dsm5Domain: "math-reasoning" },
    ],
  },
};

// ============================================
// ALL LANGUAGE PROMPTS EXPORT
// ============================================
export const ncertPromptsByLanguage: Record<string, TestPromptsByLanguage> = {
  en: englishPrompts,
  hi: hindiPrompts,
  bn: bengaliPrompts,
  ta: tamilPrompts,
  te: englishPrompts,
  mr: hindiPrompts,
  gu: hindiPrompts,
  kn: englishPrompts,
  ml: englishPrompts,
  pa: hindiPrompts,
  or: englishPrompts,
};

// ============================================
// DYSGRAPHIA PROMPTS
// ============================================
export interface DysgraphiaPrompt {
  type: "letter" | "word" | "shape" | "figure";
  prompt: string;
  reference?: string;
  difficulty: 1 | 2 | 3;
  gradeLevel: string;
  dsm5Domain?: "letter-formation" | "spelling" | "visual-motor";
}

export const dysgraphiaPrompts: Record<string, DysgraphiaPrompt[]> = {
  en: [
    { type: "letter", prompt: "Write the letter 'A'", reference: "A", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "letter-formation" },
    { type: "letter", prompt: "Write the letter 'b'", reference: "b", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "letter-formation" },
    { type: "letter", prompt: "Write the letter 'D'", reference: "D", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "letter-formation" },
    { type: "letter", prompt: "Write the letter 'g'", reference: "g", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "letter-formation" },
    { type: "word", prompt: "Write the word 'cat'", reference: "cat", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'dog'", reference: "dog", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'sun'", reference: "sun", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'happy'", reference: "happy", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'school'", reference: "school", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'friend'", reference: "friend", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'beautiful'", reference: "beautiful", difficulty: 3, gradeLevel: "5-6", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'environment'", reference: "environment", difficulty: 3, gradeLevel: "5-6", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the word 'parliamentary'", reference: "parliamentary", difficulty: 3, gradeLevel: "7-8", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write the sentence: 'The water cycle involves evaporation and condensation.'", reference: "The water cycle involves evaporation and condensation.", difficulty: 3, gradeLevel: "7-8", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write this sentence from dictation: 'Archaeological evidence suggests ancient civilizations were advanced.'", reference: "Archaeological evidence suggests ancient civilizations were advanced.", difficulty: 3, gradeLevel: "7-8", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write: 'Education helps us build a better future.'", reference: "Education helps us build a better future.", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write: 'Technology has changed the way we communicate.'", reference: "Technology has changed the way we communicate.", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write: 'The environment must be protected for future generations.'", reference: "The environment must be protected for future generations.", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write: 'Hard work and discipline lead to success.'", reference: "Hard work and discipline lead to success.", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write: 'Science and innovation are important for national development.'", reference: "Science and innovation are important for national development.", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write: 'Thermodynamics governs heat and energy transfer in physical systems.'", reference: "Thermodynamics governs heat and energy transfer in physical systems.", difficulty: 3, gradeLevel: "11-12", dsm5Domain: "spelling" },
    { type: "word", prompt: "Write: 'Sustainable development ensures ecological balance for future generations.'", reference: "Sustainable development ensures ecological balance for future generations.", difficulty: 3, gradeLevel: "11-12", dsm5Domain: "spelling" },
    { type: "shape", prompt: "Draw a circle", reference: "○", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "visual-motor" },
    { type: "shape", prompt: "Draw a triangle", reference: "△", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "visual-motor" },
    { type: "shape", prompt: "Draw a square", reference: "□", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "visual-motor" },
    { type: "shape", prompt: "Draw a rectangle", reference: "▭", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a simple house", reference: "🏠", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a tree with branches", reference: "🌳", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Copy this pattern: △□○△□○", reference: "△□○△□○", difficulty: 3, gradeLevel: "5-6", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a 3D cube", reference: "⬡", difficulty: 3, gradeLevel: "7-8", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a flowchart with 3 boxes connected by arrows", reference: "□→□→□", difficulty: 3, gradeLevel: "7-8", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a labeled diagram of a plant cell (nucleus, cell wall, chloroplast)", reference: "Cell diagram", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a geometric proof diagram: two parallel lines cut by a transversal", reference: "Parallel lines", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a sine wave diagram showing amplitude and wavelength", reference: "Sine wave", difficulty: 3, gradeLevel: "11-12", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "Draw a schematic diagram of a simple electric circuit with battery, resistor, and switch", reference: "Electric circuit", difficulty: 3, gradeLevel: "11-12", dsm5Domain: "visual-motor" },
  ],
  hi: [
    { type: "letter", prompt: "अक्षर 'अ' लिखें", reference: "अ", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "letter-formation" },
    { type: "letter", prompt: "अक्षर 'क' लिखें", reference: "क", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "letter-formation" },
    { type: "letter", prompt: "अक्षर 'म' लिखें", reference: "म", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "letter-formation" },
    { type: "word", prompt: "'माँ' शब्द लिखें", reference: "माँ", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "spelling" },
    { type: "word", prompt: "'पानी' शब्द लिखें", reference: "पानी", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "spelling" },
    { type: "word", prompt: "'विद्यालय' शब्द लिखें", reference: "विद्यालय", difficulty: 3, gradeLevel: "5-6", dsm5Domain: "spelling" },
    { type: "word", prompt: "'प्रकाशसंश्लेषण' शब्द लिखें", reference: "प्रकाशसंश्लेषण", difficulty: 3, gradeLevel: "7-8", dsm5Domain: "spelling" },
    { type: "word", prompt: "वाक्य लिखें: 'संविधान संशोधन के लिए संसद में दो-तिहाई बहुमत आवश्यक है।'", reference: "संविधान संशोधन के लिए संसद में दो-तिहाई बहुमत आवश्यक है।", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "spelling" },
    { type: "shape", prompt: "एक गोला बनाएँ", reference: "○", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "visual-motor" },
    { type: "shape", prompt: "एक त्रिभुज बनाएँ", reference: "△", difficulty: 1, gradeLevel: "1-2", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "एक सरल घर बनाएँ", reference: "🏠", difficulty: 2, gradeLevel: "3-4", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "एक त्रि-आयामी घन बनाएँ", reference: "⬡", difficulty: 3, gradeLevel: "7-8", dsm5Domain: "visual-motor" },
    { type: "figure", prompt: "पौधे की कोशिका का चित्र बनाएँ (केन्द्रक, कोशिका भित्ति, हरितलवक)", reference: "Cell diagram", difficulty: 3, gradeLevel: "9-10", dsm5Domain: "visual-motor" },
  ],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getNcertPrompts(languageCode: string): TestPromptsByLanguage {
  return ncertPromptsByLanguage[languageCode] || ncertPromptsByLanguage.en;
}

export function getDysgraphiaPrompts(languageCode: string, gradeNum?: number): DysgraphiaPrompt[] {
  const allPrompts = dysgraphiaPrompts[languageCode] || dysgraphiaPrompts.en;
  
  if (gradeNum === undefined) return allPrompts;
  
  const targetTier = gradeNum <= 2 ? '1-2' : gradeNum <= 4 ? '3-4' : gradeNum <= 6 ? '5-6' : gradeNum <= 8 ? '7-8' : gradeNum <= 10 ? '9-10' : '11-12';
  
  const tierRank: Record<string, number> = {
    '1-2': 1,
    '3-4': 2,
    '5-6': 3,
    '7-8': 4,
    '9-10': 5,
    '11-12': 6,
  };

  const targetRank = tierRank[targetTier] || 5;

  const sorted = [...allPrompts].sort((a, b) => {
    const rankA = tierRank[a.gradeLevel] || 3;
    const rankB = tierRank[b.gradeLevel] || 3;
    return Math.abs(rankA - targetRank) - Math.abs(rankB - targetRank);
  });

  let filtered = sorted.filter(p => p.gradeLevel === targetTier || (targetTier === '11-12' && p.gradeLevel === '9-10'));
  
  if (filtered.length < 3) {
    const remaining = sorted.filter(p => !filtered.includes(p));
    filtered = [...filtered, ...remaining.slice(0, 5 - filtered.length)];
  }
  
  return filtered;
}

export function getPromptsByDifficulty(
  prompts: TestPrompt[],
  difficulty: 1 | 2 | 3
): TestPrompt[] {
  return prompts.filter(p => p.difficulty <= difficulty);
}

export function getPromptsByGrade(
  prompts: TestPrompt[],
  grade: number
): TestPrompt[] {
  const gradeRanges: Record<string, number[]> = {
    "1-2": [1, 2],
    "3-4": [3, 4],
    "5-6": [5, 6],
    "7-8": [7, 8],
    "9-10": [9, 10],
    "11-12": [11, 12],
  };
  
  const matching = prompts.filter(p => {
    const range = gradeRanges[p.gradeLevel];
    if (!range) return false;
    return grade >= range[0] && grade <= range[1];
  });

  if (matching.length > 0) return matching;

  // Fallback to highest available grade tier for upper grades (9-12)
  if (grade >= 9) {
    return prompts.filter(p => p.gradeLevel === "9-10" || p.gradeLevel === "11-12" || p.gradeLevel === "7-8");
  }

  return prompts;
}

export function getDifficultyForGrade(grade: number): 1 | 2 | 3 {
  if (grade <= 2) return 1;
  if (grade <= 4) return 2;
  return 3;
}
