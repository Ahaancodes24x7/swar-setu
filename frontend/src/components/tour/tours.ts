// Product tour definitions. Each step points at an element marked with data-tour="<target>".
// Steps whose element is not on screen are skipped automatically, so a tour adapts to the
// current page state (e.g. the AI result step only appears after a screening has run).

export type TourText = { en: string; hi: string };

export interface TourStep {
  target: string;
  title: TourText;
  body: TourText;
  side?: "top" | "bottom" | "left" | "right";
}

export interface TourDefinition {
  id: string;
  version: number; // bump to show an updated tour again to returning users
  match: (pathname: string) => boolean;
  steps: TourStep[];
}

export const TOURS: TourDefinition[] = [
  {
    id: "landing",
    version: 1,
    match: (p) => p === "/",
    steps: [
      { target: "brand", side: "bottom",
        title: { en: "Welcome to SwarSetu", hi: "स्वरसेतु में आपका स्वागत है" },
        body: { en: "Early screening for reading, maths and writing difficulties, in one short tablet session.",
                hi: "पढ़ने, गणित और लिखने की कठिनाइयों की शुरुआती जाँच, एक छोटे सत्र में।" } },
      { target: "nav", side: "bottom",
        title: { en: "Explore", hi: "जानें" },
        body: { en: "Learn how screening works and why early support matters.",
                hi: "जानें कि जाँच कैसे होती है और शुरुआती सहायता क्यों ज़रूरी है।" } },
      { target: "language", side: "bottom",
        title: { en: "Your language", hi: "आपकी भाषा" },
        body: { en: "Switch the app and the tests to Hindi or another Indian language at any time.",
                hi: "किसी भी समय ऐप और टेस्ट को हिंदी या किसी अन्य भारतीय भाषा में बदलें।" } },
      { target: "theme", side: "bottom",
        title: { en: "Light or dark", hi: "लाइट या डार्क" },
        body: { en: "Choose the display that is most comfortable for the child.",
                hi: "बच्चे के लिए सबसे आरामदायक डिस्प्ले चुनें।" } },
      { target: "hero-cta", side: "top",
        title: { en: "Start here", hi: "यहाँ से शुरू करें" },
        body: { en: "Teachers, parents and principals sign in here to begin.",
                hi: "शिक्षक, अभिभावक और प्रधानाचार्य यहाँ साइन इन करके शुरू करें।" } },
    ],
  },
  {
    id: "teacher",
    version: 1,
    match: (p) => p === "/dashboard/teacher",
    steps: [
      { target: "teacher-title", side: "bottom",
        title: { en: "Your Learning Forest", hi: "आपका लर्निंग फ़ॉरेस्ट" },
        body: { en: "Each student is a tree. Their growth reflects their screening and practice progress.",
                hi: "हर छात्र एक पेड़ है। उसकी बढ़त जाँच और अभ्यास की प्रगति दिखाती है।" } },
      { target: "add-student", side: "bottom",
        title: { en: "Add a student", hi: "छात्र जोड़ें" },
        body: { en: "Add students with their grade and age. Age and home language make the screening fairer.",
                hi: "छात्रों को कक्षा और उम्र के साथ जोड़ें। उम्र और घर की भाषा से जाँच अधिक निष्पक्ष होती है।" } },
      { target: "teacher-stats", side: "bottom",
        title: { en: "Class at a glance", hi: "कक्षा एक नज़र में" },
        body: { en: "See how many students are screened and how many may need a closer look.",
                hi: "देखें कितने छात्रों की जाँच हुई और किन्हें ध्यान देने की ज़रूरत हो सकती है।" } },
      { target: "teacher-tabs", side: "bottom",
        title: { en: "Students, tests and reports", hi: "छात्र, टेस्ट और रिपोर्ट" },
        body: { en: "Run reading, maths and handwriting screens from Conduct Tests; results appear in Reports.",
                hi: "'टेस्ट करें' से पढ़ने, गणित और लिखावट की जाँच करें; परिणाम 'रिपोर्ट' में दिखते हैं।" } },
      { target: "ai-result", side: "top",
        title: { en: "Screening result", hi: "जाँच का परिणाम" },
        body: { en: "The likelihood, the main skills behind it, and a plain-language explanation. It is a screen, not a diagnosis.",
                hi: "संभावना, उसके पीछे के मुख्य कौशल और सरल व्याख्या। यह जाँच है, निदान नहीं।" } },
      { target: "teacher-resources", side: "left",
        title: { en: "Learning resources", hi: "सीखने के संसाधन" },
        body: { en: "Assign targeted activities to students who need extra support.",
                hi: "जिन छात्रों को अतिरिक्त सहायता चाहिए, उन्हें गतिविधियाँ दें।" } },
      { target: "teacher-help", side: "bottom",
        title: { en: "Need help?", hi: "मदद चाहिए?" },
        body: { en: "Guides for running screenings and talking to parents about results.",
                hi: "जाँच करने और अभिभावकों से परिणामों पर बात करने के लिए मार्गदर्शिका।" } },
    ],
  },
  {
    id: "parent",
    version: 1,
    match: (p) => p === "/dashboard/parent",
    steps: [
      { target: "parent-welcome", side: "bottom",
        title: { en: "Your child's space", hi: "आपके बच्चे का पेज" },
        body: { en: "Follow your child's screenings, practice and progress here.",
                hi: "यहाँ अपने बच्चे की जाँच, अभ्यास और प्रगति देखें।" } },
      { target: "parent-summary", side: "bottom",
        title: { en: "Progress summary", hi: "प्रगति सारांश" },
        body: { en: "A quick view of recent activity and achievements.",
                hi: "हाल की गतिविधि और उपलब्धियों की झलक।" } },
      { target: "saathi", side: "bottom",
        title: { en: "Ask Saathi", hi: "साथी से पूछें" },
        body: { en: "Saathi answers questions about learning differences and suggests activities to do at home.",
                hi: "साथी सीखने की भिन्नताओं के बारे में सवालों के जवाब देता है और घर पर करने की गतिविधियाँ सुझाता है।" } },
      { target: "parent-logout", side: "left",
        title: { en: "Sign out", hi: "साइन आउट" },
        body: { en: "Sign out when you are using a shared device.", hi: "साझा डिवाइस पर साइन आउट करना न भूलें।" } },
    ],
  },
  {
    id: "principal",
    version: 1,
    match: (p) => p === "/dashboard/principal",
    steps: [
      { target: "principal-title", side: "bottom",
        title: { en: "School overview", hi: "विद्यालय का अवलोकन" },
        body: { en: "School-wide screening coverage and support needs.", hi: "पूरे विद्यालय में जाँच और सहायता की ज़रूरतें।" } },
      { target: "principal-filter", side: "bottom",
        title: { en: "Filter by grade", hi: "कक्षा के अनुसार देखें" },
        body: { en: "Focus the analytics on a single grade.", hi: "किसी एक कक्षा पर ध्यान केंद्रित करें।" } },
      { target: "principal-tabs", side: "bottom",
        title: { en: "Analyses", hi: "विश्लेषण" },
        body: { en: "Compare grades, teachers and cohorts, and follow trends over time.",
                hi: "कक्षाओं, शिक्षकों और समूहों की तुलना करें और समय के साथ रुझान देखें।" } },
    ],
  },
];

export const TOUR_UI: Record<"en" | "hi", { next: string; prev: string; done: string; replay: string; progress: string }> = {
  en: { next: "Next", prev: "Back", done: "Done", replay: "Take a tour", progress: "{{current}} of {{total}}" },
  hi: { next: "आगे", prev: "पीछे", done: "पूरा", replay: "टूर देखें", progress: "{{current}} / {{total}}" },
};
