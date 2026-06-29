// validation lives in one place, returning a translation key so the message shows in the user's language. The screens stay clean — they just call one function.


import { isValidPhone } from "./phone";

// Each returns the i18n key of the FIRST broken rule, or null if everything is valid.
export function validateRegister(fullName: string, phone: string, password: string): string | null {
  if (fullName.trim().length < 2) return "validation.name";
  if (!isValidPhone(phone)) return "validation.phone";
  if (password.length < 4) return "validation.password";
  return null;
}
export function validateLogin(phone: string, password: string): string | null {
  if (!isValidPhone(phone)) return "validation.phone";
  if (password.length < 4) return "validation.password";
  return null;
}
export function validateOtp(otp: string): string | null {
  if (otp.length !== 6) return "validation.otp";
  return null;
}

export function validateReset(otp: string, newPassword: string): string | null {
  if (otp.length !== 6) return "validation.otp";
  if (newPassword.length < 4) return "validation.password";
  return null;
}