// Turning a spoken (speech-to-text) answer into a list of recalled items for the span task.
// Handles the ways ASR writes the same answer: "3 7 2", "372", "three seven two",
// Devanagari digits "३ ७ २" and Hindi number words "तीन सात दो".

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", to: "2", too: "2", three: "3", four: "4", for: "4", five: "5",
  six: "6", seven: "7", eight: "8", ate: "8", nine: "9", ten: "10",
  "शून्य": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4", "पांच": "5", "पाँच": "5",
  "छह": "6", "छः": "6", "छे": "6", "सात": "7", "आठ": "8", "नौ": "9", "दस": "10",
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** Canonical form of one recalled item (digit, number word or word). */
export function normalizeItem(item: string): string {
  const t = (item || "").toLowerCase().trim().replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
  return NUMBER_WORDS[t] ?? t;
}

/** Split a transcript into items; a run of digits is split into single digits when the
 *  expected items are all single digits (ASR often writes "3 7 2" as "372" or "3,7,2"). */
export function tokenizeResponse(response: string, expected: string[]): string[] {
  const singleDigits = expected.every((e) => /^\d$/.test(normalizeItem(e)));
  const tokens = response.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).map(normalizeItem);
  return singleDigits ? tokens.flatMap((t) => (/^\d+$/.test(t) ? t.split("") : [t])) : tokens;
}
