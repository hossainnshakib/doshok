"use client"

import { initializeApp, getApps } from "firebase/app"
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseApp() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK can only be used in the browser")
  }

  const existing = getApps()
  if (existing.length > 0) {
    return existing[0]
  }

  if (!firebaseConfig.apiKey) {
    throw new Error(
      "Firebase client config is missing. Set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  return initializeApp(firebaseConfig)
}

export function getFirebaseAuth() {
  const app = getFirebaseApp()
  return getAuth(app)
}

export function createRecaptchaVerifier(containerId: string) {
  const auth = getFirebaseAuth()
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  })
  return verifier
}

export async function sendFirebasePhoneOtp(
  phone: string,
  containerId: string
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth()
  const verifier = createRecaptchaVerifier(containerId)
  return signInWithPhoneNumber(auth, phone, verifier)
}

export async function confirmFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> {
  const result = await confirmationResult.confirm(code)
  const idToken = await result.user.getIdToken()
  return idToken
}
