import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BANGLADESH_COUNTRY_CODE = "+880"
export const BANGLADESH_COUNTRY_DIGITS = "880"
const LOCAL_PREFIX = "0"

function getLocalDigits(input: string): string {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith(BANGLADESH_COUNTRY_DIGITS)) {
    return digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1)
  }
  return digits.slice(0, 10)
}

export function getPhoneInputValue(phone: string): string {
  return getLocalDigits(phone).slice(0, 10)
}

export function getPhoneDisplayLocal(phone: string): string {
  return getPhoneDisplayE164(phone)
}

export function getPhoneDisplayFull(phone: string): string {
  return getPhoneDisplayE164(phone)
}

export function getPhoneDisplayE164(phone: string): string {
  return `${BANGLADESH_COUNTRY_CODE}${getLocalDigits(phone)}`
}

export function getPhoneServerValue(phone: string): string {
  return getPhoneDisplayE164(phone)
}

export function phonesEqual(a: string, b: string): boolean {
  return getPhoneDisplayE164(a) === getPhoneDisplayE164(b)
}

export function isValidBangladeshPhone(localNumber: string): boolean {
  const digits = localNumber.replace(/\D/g, "")
  return /^(01[3-9])/.test(digits) && digits.length === 10
}

export function toE164(localNumber: string): string {
  const digits = getLocalDigits(localNumber)
  return `${BANGLADESH_COUNTRY_CODE}${digits}`
}

export function maskBangladeshPhone(localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "")
  if (digits.length < 6) return `${BANGLADESH_COUNTRY_CODE}${digits}`
  return `${BANGLADESH_COUNTRY_CODE}${digits.slice(0, 3)}****${digits.slice(-3)}`
}

export function stripCountryCode(input: string): string {
  return getLocalDigits(input)
}

export function normalizeLocalPhone(input: string): string {
  return getLocalDigits(input)
}