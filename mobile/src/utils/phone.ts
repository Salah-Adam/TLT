// Build the full 2526… number from the local part typed after the fixed "252" prefix.

// the single trustworthy place for the phone rule; 
// turns any local input into the canonical 2526… the backend expects (strips a re-typed 252 and leading zeros). 
// // One rule, one place.

export function normalizePhone(localPart: string): string {
  let digits = localPart.replace(/[^0-9]/g, "");
  if (digits.startsWith("252")) digits = digits.slice(3);
  digits = digits.replace(/^0+/, "");
  return "252" + digits;
}

// Valid Somali mobile-money number: 252 + provider prefix (61/62/77) + 7 digits = 12 digits total.
export function isValidPhone(normalized: string): boolean {
  return /^252(61|62|77)\d{7}$/.test(normalized);
}
