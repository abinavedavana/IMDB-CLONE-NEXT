const BLOCKED_WORDS = [
  "spam", "scam", "fake", "hate", "abuse",
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}

export function sanitizeContent(text: string): string {
  let result = text;
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(word, "gi");
    result = result.replace(regex, "*".repeat(word.length));
  }
  return result;
}