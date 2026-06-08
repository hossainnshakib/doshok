export function getCustomerPhone(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("doshok_customer_phone")
}

export function setCustomerPhone(phone: string) {
  localStorage.setItem("doshok_customer_phone", phone)
}

export function clearCustomerSession() {
  localStorage.removeItem("doshok_customer_phone")
}
