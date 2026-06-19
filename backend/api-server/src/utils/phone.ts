/**
 * Detects the mobile money provider from a Somali phone number prefix.
 * Returns the provider code matching providers.code in the database.
 * Returns null if the prefix is not recognised.
 */
export function detectProvider(phoneNumber: string): string | null {
  if (phoneNumber.startsWith("25261") || phoneNumber.startsWith("25277")) {
    return "evcplus"; // Hormuud EVC Plus
  }
  if (phoneNumber.startsWith("25262")) {
    return "edahab"; // Somtel eDahab
  }
  return null;
}