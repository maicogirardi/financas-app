import {
	doc,
	onSnapshot,
	serverTimestamp,
	setDoc
} from "firebase/firestore"
import { auth, db } from "@/firebase"

const DEFAULT_THEME = "light"
const THEME_DOC_PATH = ["preferences", "ui"]

function getThemeDocRef() {
	const user = auth.currentUser

	if (!user) {
		throw new Error("User must be authenticated to access theme preferences")
	}

	return doc(db, "users", user.uid, ...THEME_DOC_PATH)
}

export function subscribeThemePreference(callback, onError) {
	const themeDocRef = getThemeDocRef()

	return onSnapshot(
		themeDocRef,
		snapshot => {
			const data = snapshot.data()
			const theme = data?.theme === "dark" ? "dark" : DEFAULT_THEME
			callback(theme)
		},
		onError
	)
}

export async function saveThemePreference(theme) {
	const themeDocRef = getThemeDocRef()

	await setDoc(
		themeDocRef,
		{
			theme: theme === "dark" ? "dark" : DEFAULT_THEME,
			updatedAt: serverTimestamp()
		},
		{ merge: true }
	)
}
