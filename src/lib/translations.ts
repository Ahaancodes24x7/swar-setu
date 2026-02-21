// Full website translation system for SWARSETU

export interface TranslationStrings {
  // Common
  getStarted: string;
  learnMore: string;
  whyItMatters: string;
  home: string;
  login: string;
  logout: string;
  save: string;
  cancel: string;
  next: string;
  back: string;
  submit: string;
  loading: string;
  error: string;
  success: string;
  
  // Auth
  parentPortal: string;
  teacherPortal: string;
  welcomeTo: string;
  choosePortal: string;
  parentLogin: string;
  teacherLogin: string;
  accessLinkedByTeacher: string;
  emailAddress: string;
  password: string;
  fullName: string;
  instituteName: string;
  selectGrades: string;
  signIn: string;
  signUp: string;
  createAccount: string;
  sendMagicLink: string;
  magicLinkSent: string;
  checkEmail: string;
  noPasswordRequired: string;
  emailNotLinked: string;
  contactSchool: string;
  useDifferentEmail: string;
  
  // Dashboard Common
  welcome: string;
  dashboard: string;
  students: string;
  reports: string;
  settings: string;
  profile: string;
  
  // Teacher Dashboard
  conductTests: string;
  addStudent: string;
  searchStudents: string;
  studentName: string;
  grade: string;
  parentEmail: string;
  status: string;
  actions: string;
  startVoiceTest: string;
  deleteStudent: string;
  noStudentsFound: string;
  totalStudents: string;
  flaggedStudents: string;
  testsThisWeek: string;
  linkedParents: string;
  
  // Parent Dashboard
  hereIsProgress: string;
  dayStreak: string;
  totalPoints: string;
  avgScore: string;
  testsDone: string;
  thisWeek: string;
  learningProgress: string;
  readingSkills: string;
  numberRecognition: string;
  phonemeAccuracy: string;
  aiLearningReport: string;
  viewFullReport: string;
  recentSessions: string;
  achievements: string;
  recommendedResources: string;
  
  // Tests
  dyslexiaTest: string;
  dyscalculiaTest: string;
  dysgraphiaTest: string;
  voiceTest: string;
  writtenTest: string;
  startTest: string;
  testComplete: string;
  overallScore: string;
  riskLevel: string;
  lowRisk: string;
  moderateRisk: string;
  highRisk: string;
  summary: string;
  recommendations: string;
  exportPdf: string;
  saveResults: string;
  newTest: string;
  
  // Voice Test
  readAloud: string;
  listening: string;
  doneReading: string;
  getReady: string;
  words: string;
  sentences: string;
  paragraphs: string;
  recording: string;
  yourResponse: string;
  responseRecorded: string;
  analyzing: string;
  
  // Dysgraphia
  drawingTest: string;
  draw: string;
  clear: string;
  strokes: string;
  pauses: string;
  time: string;
  
  // Chatbot
  aiTutor: string;
  typeMessage: string;
  send: string;
  
  // Home page
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  featureVoiceTitle: string;
  featureVoiceDesc: string;
  featureMultilingualTitle: string;
  featureMultilingualDesc: string;
  featureAITitle: string;
  featureAIDesc: string;
}

const translations: Record<string, TranslationStrings> = {
  en: {
    // Common
    getStarted: "Get Started",
    learnMore: "Learn More",
    whyItMatters: "Why It Matters",
    home: "Home",
    login: "Login",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    next: "Next",
    back: "Back",
    submit: "Submit",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    
    // Auth
    parentPortal: "Parent Portal",
    teacherPortal: "Teacher Portal",
    welcomeTo: "Welcome to SWARSETU",
    choosePortal: "Choose your portal to continue",
    parentLogin: "Parent Login",
    teacherLogin: "Teacher Login",
    accessLinkedByTeacher: "Access linked by your child's teacher",
    emailAddress: "Email Address",
    password: "Password",
    fullName: "Full Name",
    instituteName: "Institute Name",
    selectGrades: "Select Grades",
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create Account",
    sendMagicLink: "Send Magic Link",
    magicLinkSent: "Magic link sent!",
    checkEmail: "Check your email",
    noPasswordRequired: "No password required! We'll email you a secure sign-in link.",
    emailNotLinked: "This email is not linked to any student",
    contactSchool: "Contact the school if you haven't received access",
    useDifferentEmail: "Use a different email",
    
    // Dashboard Common
    welcome: "Welcome back!",
    dashboard: "Dashboard",
    students: "Students",
    reports: "Reports",
    settings: "Settings",
    profile: "Profile",
    
    // Teacher Dashboard
    conductTests: "Conduct Tests",
    addStudent: "Add Student",
    searchStudents: "Search students...",
    studentName: "Student Name",
    grade: "Grade",
    parentEmail: "Parent Email",
    status: "Status",
    actions: "Actions",
    startVoiceTest: "Start Voice Test",
    deleteStudent: "Delete Student",
    noStudentsFound: "No students found",
    totalStudents: "Total Students",
    flaggedStudents: "Flagged Students",
    testsThisWeek: "Tests This Week",
    linkedParents: "Linked Parents",
    
    // Parent Dashboard
    hereIsProgress: "Here's how your child is doing this week",
    dayStreak: "Day Streak!",
    totalPoints: "Total Points",
    avgScore: "Avg Score",
    testsDone: "Tests Done",
    thisWeek: "This Week",
    learningProgress: "Learning Progress",
    readingSkills: "Reading Skills",
    numberRecognition: "Number Recognition",
    phonemeAccuracy: "Phoneme Accuracy",
    aiLearningReport: "AI Learning Report",
    viewFullReport: "View Full Report",
    recentSessions: "Recent Sessions",
    achievements: "Achievements",
    recommendedResources: "Recommended Resources",
    
    // Tests
    dyslexiaTest: "Dyslexia Test",
    dyscalculiaTest: "Dyscalculia Test",
    dysgraphiaTest: "Dysgraphia Test",
    voiceTest: "Voice Test",
    writtenTest: "Written Test",
    startTest: "Start Test",
    testComplete: "Test Complete",
    overallScore: "Overall Score",
    riskLevel: "Risk Level",
    lowRisk: "Low Risk",
    moderateRisk: "Moderate Risk",
    highRisk: "High Risk",
    summary: "Summary",
    recommendations: "Recommendations",
    exportPdf: "Export PDF",
    saveResults: "Save Results",
    newTest: "New Test",
    
    // Voice Test
    readAloud: "Read aloud",
    listening: "Listening...",
    doneReading: "Done Reading",
    getReady: "Get ready to read...",
    words: "Words",
    sentences: "Sentences",
    paragraphs: "Paragraphs",
    recording: "Recording",
    yourResponse: "Your response",
    responseRecorded: "Response Recorded",
    analyzing: "Analyzing...",
    
    // Dysgraphia
    drawingTest: "Drawing Test",
    draw: "Draw",
    clear: "Clear",
    strokes: "Strokes",
    pauses: "Pauses",
    time: "Time",
    
    // Chatbot
    aiTutor: "AI Tutor",
    typeMessage: "Type your message...",
    send: "Send",
    
    // Home page
    heroTitle: "Empowering Every Child's Learning Journey",
    heroSubtitle: "Voice-First SLD Screening",
    heroDescription: "AI-powered screening for Dyslexia, Dyscalculia, and Dysgraphia in 11 Indian languages. Simple, accessible, and accurate.",
    featureVoiceTitle: "Voice-First Assessment",
    featureVoiceDesc: "Natural voice-based testing that children find easy and engaging",
    featureMultilingualTitle: "11 Indian Languages",
    featureMultilingualDesc: "Support for English and 10 major Indian languages",
    featureAITitle: "AI-Powered Analysis",
    featureAIDesc: "Advanced speech analysis for accurate SLD detection",
  },
  
  hi: {
    // Common
    getStarted: "शुरू करें",
    learnMore: "और जानें",
    whyItMatters: "यह क्यों मायने रखता है",
    home: "होम",
    login: "लॉगिन",
    logout: "लॉगआउट",
    save: "सहेजें",
    cancel: "रद्द करें",
    next: "अगला",
    back: "पीछे",
    submit: "जमा करें",
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    success: "सफलता",
    
    // Auth
    parentPortal: "अभिभावक पोर्टल",
    teacherPortal: "शिक्षक पोर्टल",
    welcomeTo: "स्वरसेतु में आपका स्वागत है",
    choosePortal: "जारी रखने के लिए अपना पोर्टल चुनें",
    parentLogin: "अभिभावक लॉगिन",
    teacherLogin: "शिक्षक लॉगिन",
    accessLinkedByTeacher: "आपके बच्चे के शिक्षक द्वारा लिंक किया गया एक्सेस",
    emailAddress: "ईमेल पता",
    password: "पासवर्ड",
    fullName: "पूरा नाम",
    instituteName: "संस्थान का नाम",
    selectGrades: "कक्षाएं चुनें",
    signIn: "साइन इन करें",
    signUp: "साइन अप करें",
    createAccount: "खाता बनाएं",
    sendMagicLink: "मैजिक लिंक भेजें",
    magicLinkSent: "मैजिक लिंक भेजा गया!",
    checkEmail: "अपना ईमेल जांचें",
    noPasswordRequired: "पासवर्ड की जरूरत नहीं! हम आपको एक सुरक्षित साइन-इन लिंक ईमेल करेंगे।",
    emailNotLinked: "यह ईमेल किसी छात्र से लिंक नहीं है",
    contactSchool: "अगर आपको एक्सेस नहीं मिला है तो स्कूल से संपर्क करें",
    useDifferentEmail: "अलग ईमेल का उपयोग करें",
    
    // Dashboard Common
    welcome: "वापसी पर स्वागत है!",
    dashboard: "डैशबोर्ड",
    students: "छात्र",
    reports: "रिपोर्ट",
    settings: "सेटिंग्स",
    profile: "प्रोफ़ाइल",
    
    // Teacher Dashboard
    conductTests: "परीक्षण करें",
    addStudent: "छात्र जोड़ें",
    searchStudents: "छात्र खोजें...",
    studentName: "छात्र का नाम",
    grade: "कक्षा",
    parentEmail: "अभिभावक ईमेल",
    status: "स्थिति",
    actions: "कार्रवाई",
    startVoiceTest: "वॉयस टेस्ट शुरू करें",
    deleteStudent: "छात्र हटाएं",
    noStudentsFound: "कोई छात्र नहीं मिला",
    totalStudents: "कुल छात्र",
    flaggedStudents: "चिह्नित छात्र",
    testsThisWeek: "इस सप्ताह के परीक्षण",
    linkedParents: "लिंक किए गए अभिभावक",
    
    // Parent Dashboard
    hereIsProgress: "इस सप्ताह आपके बच्चे की प्रगति",
    dayStreak: "दिन की लकीर!",
    totalPoints: "कुल अंक",
    avgScore: "औसत स्कोर",
    testsDone: "परीक्षण पूर्ण",
    thisWeek: "इस सप्ताह",
    learningProgress: "सीखने की प्रगति",
    readingSkills: "पढ़ने का कौशल",
    numberRecognition: "संख्या पहचान",
    phonemeAccuracy: "ध्वनि सटीकता",
    aiLearningReport: "AI सीखने की रिपोर्ट",
    viewFullReport: "पूरी रिपोर्ट देखें",
    recentSessions: "हाल के सत्र",
    achievements: "उपलब्धियां",
    recommendedResources: "अनुशंसित संसाधन",
    
    // Tests
    dyslexiaTest: "डिस्लेक्सिया परीक्षण",
    dyscalculiaTest: "डिसकैलकुलिया परीक्षण",
    dysgraphiaTest: "डिस्ग्राफिया परीक्षण",
    voiceTest: "वॉयस टेस्ट",
    writtenTest: "लिखित परीक्षण",
    startTest: "परीक्षण शुरू करें",
    testComplete: "परीक्षण पूर्ण",
    overallScore: "कुल स्कोर",
    riskLevel: "जोखिम स्तर",
    lowRisk: "कम जोखिम",
    moderateRisk: "मध्यम जोखिम",
    highRisk: "उच्च जोखिम",
    summary: "सारांश",
    recommendations: "सिफारिशें",
    exportPdf: "PDF निर्यात करें",
    saveResults: "परिणाम सहेजें",
    newTest: "नया परीक्षण",
    
    // Voice Test
    readAloud: "ज़ोर से पढ़ें",
    listening: "सुन रहा है...",
    doneReading: "पढ़ना पूरा",
    getReady: "पढ़ने के लिए तैयार हो जाएं...",
    words: "शब्द",
    sentences: "वाक्य",
    paragraphs: "पैराग्राफ",
    recording: "रिकॉर्डिंग",
    yourResponse: "आपका जवाब",
    responseRecorded: "जवाब रिकॉर्ड किया गया",
    analyzing: "विश्लेषण हो रहा है...",
    
    // Dysgraphia
    drawingTest: "ड्राइंग टेस्ट",
    draw: "ड्रा करें",
    clear: "साफ़ करें",
    strokes: "स्ट्रोक",
    pauses: "विराम",
    time: "समय",
    
    // Chatbot
    aiTutor: "AI ट्यूटर",
    typeMessage: "अपना संदेश लिखें...",
    send: "भेजें",
    
    // Home page
    heroTitle: "हर बच्चे की सीखने की यात्रा को सशक्त बनाना",
    heroSubtitle: "वॉयस-फर्स्ट SLD स्क्रीनिंग",
    heroDescription: "11 भारतीय भाषाओं में डिस्लेक्सिया, डिसकैलकुलिया, और डिस्ग्राफिया के लिए AI-पावर्ड स्क्रीनिंग। सरल, सुलभ, और सटीक।",
    featureVoiceTitle: "वॉयस-फर्स्ट मूल्यांकन",
    featureVoiceDesc: "प्राकृतिक वॉयस-आधारित परीक्षण जो बच्चों को आसान और आकर्षक लगता है",
    featureMultilingualTitle: "11 भारतीय भाषाएं",
    featureMultilingualDesc: "अंग्रेजी और 10 प्रमुख भारतीय भाषाओं के लिए समर्थन",
    featureAITitle: "AI-पावर्ड विश्लेषण",
    featureAIDesc: "सटीक SLD पहचान के लिए उन्नत भाषण विश्लेषण",
  },
  
  bn: {
    getStarted: "শুরু করুন",
    learnMore: "আরও জানুন",
    whyItMatters: "কেন এটা গুরুত্বপূর্ণ",
    home: "হোম",
    login: "লগইন",
    logout: "লগআউট",
    save: "সংরক্ষণ করুন",
    cancel: "বাতিল",
    next: "পরবর্তী",
    back: "পিছনে",
    submit: "জমা দিন",
    loading: "লোড হচ্ছে...",
    error: "ত্রুটি",
    success: "সফল",
    parentPortal: "অভিভাবক পোর্টাল",
    teacherPortal: "শিক্ষক পোর্টাল",
    welcomeTo: "স্বরসেতুতে স্বাগতম",
    choosePortal: "চালিয়ে যেতে আপনার পোর্টাল বেছে নিন",
    parentLogin: "অভিভাবক লগইন",
    teacherLogin: "শিক্ষক লগইন",
    accessLinkedByTeacher: "আপনার সন্তানের শিক্ষক দ্বারা লিঙ্ক করা অ্যাক্সেস",
    emailAddress: "ইমেইল ঠিকানা",
    password: "পাসওয়ার্ড",
    fullName: "পুরো নাম",
    instituteName: "প্রতিষ্ঠানের নাম",
    selectGrades: "শ্রেণী নির্বাচন করুন",
    signIn: "সাইন ইন",
    signUp: "সাইন আপ",
    createAccount: "অ্যাকাউন্ট তৈরি করুন",
    sendMagicLink: "ম্যাজিক লিঙ্ক পাঠান",
    magicLinkSent: "ম্যাজিক লিঙ্ক পাঠানো হয়েছে!",
    checkEmail: "আপনার ইমেইল চেক করুন",
    noPasswordRequired: "পাসওয়ার্ড প্রয়োজন নেই!",
    emailNotLinked: "এই ইমেইল কোনো ছাত্রের সাথে লিঙ্ক করা নেই",
    contactSchool: "আপনি অ্যাক্সেস না পেলে স্কুলে যোগাযোগ করুন",
    useDifferentEmail: "অন্য ইমেইল ব্যবহার করুন",
    welcome: "ফিরে এসে স্বাগতম!",
    dashboard: "ড্যাশবোর্ড",
    students: "ছাত্র",
    reports: "রিপোর্ট",
    settings: "সেটিংস",
    profile: "প্রোফাইল",
    conductTests: "পরীক্ষা নিন",
    addStudent: "ছাত্র যোগ করুন",
    searchStudents: "ছাত্র খুঁজুন...",
    studentName: "ছাত্রের নাম",
    grade: "শ্রেণী",
    parentEmail: "অভিভাবক ইমেইল",
    status: "অবস্থা",
    actions: "কার্যকলাপ",
    startVoiceTest: "ভয়েস টেস্ট শুরু করুন",
    deleteStudent: "ছাত্র মুছুন",
    noStudentsFound: "কোনো ছাত্র পাওয়া যায়নি",
    totalStudents: "মোট ছাত্র",
    flaggedStudents: "চিহ্নিত ছাত্র",
    testsThisWeek: "এই সপ্তাহের পরীক্ষা",
    linkedParents: "লিঙ্ক করা অভিভাবক",
    hereIsProgress: "এই সপ্তাহে আপনার সন্তানের অগ্রগতি",
    dayStreak: "দিনের ধারা!",
    totalPoints: "মোট পয়েন্ট",
    avgScore: "গড় স্কোর",
    testsDone: "পরীক্ষা সম্পন্ন",
    thisWeek: "এই সপ্তাহ",
    learningProgress: "শেখার অগ্রগতি",
    readingSkills: "পড়ার দক্ষতা",
    numberRecognition: "সংখ্যা চেনা",
    phonemeAccuracy: "ধ্বনি সঠিকতা",
    aiLearningReport: "AI শেখার রিপোর্ট",
    viewFullReport: "পুরো রিপোর্ট দেখুন",
    recentSessions: "সাম্প্রতিক সেশন",
    achievements: "অর্জন",
    recommendedResources: "প্রস্তাবিত সম্পদ",
    dyslexiaTest: "ডিসলেক্সিয়া পরীক্ষা",
    dyscalculiaTest: "ডিসক্যালকুলিয়া পরীক্ষা",
    dysgraphiaTest: "ডিসগ্রাফিয়া পরীক্ষা",
    voiceTest: "ভয়েস টেস্ট",
    writtenTest: "লিখিত পরীক্ষা",
    startTest: "পরীক্ষা শুরু করুন",
    testComplete: "পরীক্ষা সম্পন্ন",
    overallScore: "সামগ্রিক স্কোর",
    riskLevel: "ঝুঁকির মাত্রা",
    lowRisk: "কম ঝুঁকি",
    moderateRisk: "মাঝারি ঝুঁকি",
    highRisk: "উচ্চ ঝুঁকি",
    summary: "সারাংশ",
    recommendations: "সুপারিশ",
    exportPdf: "PDF রপ্তানি করুন",
    saveResults: "ফলাফল সংরক্ষণ করুন",
    newTest: "নতুন পরীক্ষা",
    readAloud: "জোরে পড়ুন",
    listening: "শুনছি...",
    doneReading: "পড়া শেষ",
    getReady: "পড়তে প্রস্তুত হন...",
    words: "শব্দ",
    sentences: "বাক্য",
    paragraphs: "অনুচ্ছেদ",
    recording: "রেকর্ডিং",
    yourResponse: "আপনার উত্তর",
    responseRecorded: "উত্তর রেকর্ড হয়েছে",
    analyzing: "বিশ্লেষণ করা হচ্ছে...",
    drawingTest: "অঙ্কন পরীক্ষা",
    draw: "আঁকুন",
    clear: "মুছুন",
    strokes: "স্ট্রোক",
    pauses: "বিরতি",
    time: "সময়",
    aiTutor: "AI টিউটর",
    typeMessage: "আপনার বার্তা লিখুন...",
    send: "পাঠান",
    heroTitle: "প্রতিটি শিশুর শেখার যাত্রাকে শক্তিশালী করা",
    heroSubtitle: "ভয়েস-ফার্স্ট SLD স্ক্রিনিং",
    heroDescription: "১১টি ভারতীয় ভাষায় ডিসলেক্সিয়া, ডিসক্যালকুলিয়া এবং ডিসগ্রাফিয়ার জন্য AI-চালিত স্ক্রিনিং।",
    featureVoiceTitle: "ভয়েস-ফার্স্ট মূল্যায়ন",
    featureVoiceDesc: "প্রাকৃতিক ভয়েস-ভিত্তিক পরীক্ষা যা শিশুদের সহজ মনে হয়",
    featureMultilingualTitle: "১১টি ভারতীয় ভাষা",
    featureMultilingualDesc: "ইংরেজি এবং ১০টি প্রধান ভারতীয় ভাষার সমর্থন",
    featureAITitle: "AI-চালিত বিশ্লেষণ",
    featureAIDesc: "সঠিক SLD সনাক্তকরণের জন্য উন্নত বাক বিশ্লেষণ",
  },
  
  ta: {
    getStarted: "தொடங்கு",
    learnMore: "மேலும் அறிய",
    whyItMatters: "ஏன் முக்கியம்",
    home: "முகப்பு",
    login: "உள்நுழை",
    logout: "வெளியேறு",
    save: "சேமி",
    cancel: "ரத்துசெய்",
    next: "அடுத்து",
    back: "பின்",
    submit: "சமர்ப்பி",
    loading: "ஏற்றுகிறது...",
    error: "பிழை",
    success: "வெற்றி",
    parentPortal: "பெற்றோர் போர்டல்",
    teacherPortal: "ஆசிரியர் போர்டல்",
    welcomeTo: "ஸ்வரசேதுவிற்கு வரவேற்கிறோம்",
    choosePortal: "தொடர உங்கள் போர்டலைத் தேர்ந்தெடுக்கவும்",
    parentLogin: "பெற்றோர் உள்நுழைவு",
    teacherLogin: "ஆசிரியர் உள்நுழைவு",
    accessLinkedByTeacher: "உங்கள் குழந்தையின் ஆசிரியரால் இணைக்கப்பட்ட அணுகல்",
    emailAddress: "மின்னஞ்சல் முகவரி",
    password: "கடவுச்சொல்",
    fullName: "முழு பெயர்",
    instituteName: "நிறுவன பெயர்",
    selectGrades: "வகுப்புகளைத் தேர்ந்தெடுக்கவும்",
    signIn: "உள்நுழை",
    signUp: "பதிவு செய்",
    createAccount: "கணக்கு உருவாக்கு",
    sendMagicLink: "மேஜிக் லிங்க் அனுப்பு",
    magicLinkSent: "மேஜிக் லிங்க் அனுப்பப்பட்டது!",
    checkEmail: "உங்கள் மின்னஞ்சலைச் சரிபார்க்கவும்",
    noPasswordRequired: "கடவுச்சொல் தேவையில்லை!",
    emailNotLinked: "இந்த மின்னஞ்சல் எந்த மாணவருடனும் இணைக்கப்படவில்லை",
    contactSchool: "அணுகல் கிடைக்கவில்லை என்றால் பள்ளியைத் தொடர்பு கொள்ளவும்",
    useDifferentEmail: "வேறு மின்னஞ்சலைப் பயன்படுத்தவும்",
    welcome: "மீண்டும் வரவேற்கிறோம்!",
    dashboard: "டாஷ்போர்டு",
    students: "மாணவர்கள்",
    reports: "அறிக்கைகள்",
    settings: "அமைப்புகள்",
    profile: "சுயவிவரம்",
    conductTests: "சோதனைகள் நடத்து",
    addStudent: "மாணவர் சேர்",
    searchStudents: "மாணவர்களைத் தேடு...",
    studentName: "மாணவர் பெயர்",
    grade: "வகுப்பு",
    parentEmail: "பெற்றோர் மின்னஞ்சல்",
    status: "நிலை",
    actions: "செயல்கள்",
    startVoiceTest: "குரல் சோதனை தொடங்கு",
    deleteStudent: "மாணவரை நீக்கு",
    noStudentsFound: "மாணவர்கள் இல்லை",
    totalStudents: "மொத்த மாணவர்கள்",
    flaggedStudents: "குறிக்கப்பட்ட மாணவர்கள்",
    testsThisWeek: "இந்த வார சோதனைகள்",
    linkedParents: "இணைக்கப்பட்ட பெற்றோர்",
    hereIsProgress: "இந்த வாரம் உங்கள் குழந்தையின் முன்னேற்றம்",
    dayStreak: "நாள் தொடர்!",
    totalPoints: "மொத்த புள்ளிகள்",
    avgScore: "சராசரி மதிப்பெண்",
    testsDone: "முடிந்த சோதனைகள்",
    thisWeek: "இந்த வாரம்",
    learningProgress: "கற்றல் முன்னேற்றம்",
    readingSkills: "படிக்கும் திறன்",
    numberRecognition: "எண் அடையாளம்",
    phonemeAccuracy: "ஒலி துல்லியம்",
    aiLearningReport: "AI கற்றல் அறிக்கை",
    viewFullReport: "முழு அறிக்கை பார்",
    recentSessions: "சமீபத்திய அமர்வுகள்",
    achievements: "சாதனைகள்",
    recommendedResources: "பரிந்துரைக்கப்பட்ட வளங்கள்",
    dyslexiaTest: "டிஸ்லெக்ஸியா சோதனை",
    dyscalculiaTest: "டிஸ்கால்குலியா சோதனை",
    dysgraphiaTest: "டிஸ்கிராபியா சோதனை",
    voiceTest: "குரல் சோதனை",
    writtenTest: "எழுத்து சோதனை",
    startTest: "சோதனை தொடங்கு",
    testComplete: "சோதனை முடிந்தது",
    overallScore: "மொத்த மதிப்பெண்",
    riskLevel: "ஆபத்து நிலை",
    lowRisk: "குறைந்த ஆபத்து",
    moderateRisk: "மிதமான ஆபத்து",
    highRisk: "அதிக ஆபத்து",
    summary: "சுருக்கம்",
    recommendations: "பரிந்துரைகள்",
    exportPdf: "PDF ஏற்றுமதி",
    saveResults: "முடிவுகள் சேமி",
    newTest: "புதிய சோதனை",
    readAloud: "சத்தமாக படி",
    listening: "கேட்கிறது...",
    doneReading: "படித்தாயிற்று",
    getReady: "படிக்க தயாராகு...",
    words: "வார்த்தைகள்",
    sentences: "வாக்கியங்கள்",
    paragraphs: "பத்திகள்",
    recording: "பதிவு செய்கிறது",
    yourResponse: "உங்கள் பதில்",
    responseRecorded: "பதில் பதிவாகியது",
    analyzing: "பகுப்பாய்வு...",
    drawingTest: "வரைதல் சோதனை",
    draw: "வரை",
    clear: "அழி",
    strokes: "கோடுகள்",
    pauses: "இடைநிறுத்தங்கள்",
    time: "நேரம்",
    aiTutor: "AI ஆசிரியர்",
    typeMessage: "உங்கள் செய்தியை தட்டச்சு செய்யவும்...",
    send: "அனுப்பு",
    heroTitle: "ஒவ்வொரு குழந்தையின் கற்றல் பயணத்தையும் வலுப்படுத்துதல்",
    heroSubtitle: "குரல்-முதல் SLD திரையிடல்",
    heroDescription: "11 இந்திய மொழிகளில் டிஸ்லெக்ஸியா, டிஸ்கால்குலியா மற்றும் டிஸ்கிராபியாவுக்கான AI-இயக்கப்படும் திரையிடல்.",
    featureVoiceTitle: "குரல்-முதல் மதிப்பீடு",
    featureVoiceDesc: "குழந்தைகளுக்கு எளிதான இயல்பான குரல் அடிப்படையிலான சோதனை",
    featureMultilingualTitle: "11 இந்திய மொழிகள்",
    featureMultilingualDesc: "ஆங்கிலம் மற்றும் 10 முக்கிய இந்திய மொழிகளுக்கான ஆதரவு",
    featureAITitle: "AI-இயக்கப்படும் பகுப்பாய்வு",
    featureAIDesc: "துல்லியமான SLD கண்டறிதலுக்கான மேம்பட்ட பேச்சு பகுப்பாய்வு",
  },
};

// Helper to get translations for a language, fallback to English
export function getTranslations(languageCode: string): TranslationStrings {
  return translations[languageCode] || translations.en;
}

// Hook usage helper
export function useTranslations(languageCode: string): TranslationStrings {
  return getTranslations(languageCode);
}
