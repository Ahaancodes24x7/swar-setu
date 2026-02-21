import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations, TranslationStrings } from "@/lib/translations";

export function useTranslations(): TranslationStrings {
  const { language } = useLanguage();
  return getTranslations(language.code);
}
