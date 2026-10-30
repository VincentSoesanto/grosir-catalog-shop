// Connection to the shop's Firebase project. The values come from Vite env vars (see .env.example).
// The web config is not a secret (every Firebase website exposes it); access is protected by firestore.rules.
// Without the env vars the site runs in "demo mode": it reads the catalog from public/data and the admin is off.
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore/lite'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-catalog-shop',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/** true when a real Firebase project is set in the env vars */
export const firebaseConfigured = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID)

export const firebaseApp = initializeApp(firebaseConfig)

// "Lite" Firestore: smaller download for customers (we only need simple reads/writes, no live updates).
// When the admin is logged in (firebase/auth, loaded only on the admin page), requests carry the admin's login.
export const db = getFirestore(firebaseApp)
