import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { firebaseConfig, hasFirebaseConfig } from './firebaseConfig'

const app = hasFirebaseConfig
  ? getApps().length ? getApp() : initializeApp(firebaseConfig)
  : null

export const db = app ? getFirestore(app) : null
export const auth = app ? getAuth(app) : null
