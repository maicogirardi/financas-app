import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCEgHKreGib-2MYq2VxhRtL4xaRu0hfpZQ",
  authDomain: "financas-app-cc7e5.firebaseapp.com",
  projectId: "financas-app-cc7e5",
  storageBucket: "financas-app-cc7e5.firebasestorage.app",
  messagingSenderId: "239506356673",
  appId: "1:239506356673:web:902003a04766cb58169740"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)