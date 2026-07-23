import { createContext, useContext, useState, ReactNode } from "react";

export interface Language {
  code: string;
  name: string;
  native: string;
  elevenLabsCode: string; // ElevenLabs language code
}

export const languages: Language[] = [
  { code: "en", name: "English", native: "English", elevenLabsCode: "eng" },
  { code: "hi", name: "Hindi", native: "हिन्दी", elevenLabsCode: "hin" },
  { code: "bn", name: "Bengali", native: "বাংলা", elevenLabsCode: "ben" },
  { code: "te", name: "Telugu", native: "తెలుగు", elevenLabsCode: "tel" },
  { code: "mr", name: "Marathi", native: "मराठी", elevenLabsCode: "mar" },
  { code: "ta", name: "Tamil", native: "தமிழ்", elevenLabsCode: "tam" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", elevenLabsCode: "guj" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", elevenLabsCode: "kan" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", elevenLabsCode: "mal" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", elevenLabsCode: "pan" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", elevenLabsCode: "ori" },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(languages[0]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
