import {
	doc,
	onSnapshot,
	serverTimestamp,
	setDoc
} from "firebase/firestore"
import { auth, db } from "@/firebase"

const DEFAULT_THEME = "light"
const DEFAULT_THEME_COLOR = "#aa3bff"
const THEME_DOC_PATH = ["preferences", "ui"]

function getThemeDocRef() {
	const user = auth.currentUser

	if (!user) {
		throw new Error("User must be authenticated to access theme preferences")
	}

	return doc(db, "users", user.uid, ...THEME_DOC_PATH)
}

function normalizeColor(value) {
	if (typeof value !== "string") return DEFAULT_THEME_COLOR
	const normalized = value.trim()
	return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : DEFAULT_THEME_COLOR
}

function normalizeStoredYear(value) {
	const normalized = Number(value)
	return Number.isInteger(normalized) && normalized >= 2000 ? normalized : null
}

function normalizeStoredMonth(value) {
	const normalized = Number(value)
	return Number.isInteger(normalized) && normalized >= 1 && normalized <= 12 ? normalized : null
}

export function subscribeThemePreference(callback, onError) {
	const themeDocRef = getThemeDocRef()

	return onSnapshot(
		themeDocRef,
		snapshot => {
			const data = snapshot.data() || {}
			const theme = data.theme === "dark" ? "dark" : DEFAULT_THEME
			const primaryColor = normalizeColor(data.primaryColor)
			const selectedYear = normalizeStoredYear(data.selectedYear)
			const selectedMonth = normalizeStoredMonth(data.selectedMonth)
			callback({ theme, primaryColor, selectedYear, selectedMonth })
		},
		onError
	)
}

export async function saveThemePreference(preferences) {
	const themeDocRef = getThemeDocRef()
	const payload = {}

	if (typeof preferences === "string") {
		payload.theme = preferences === "dark" ? "dark" : DEFAULT_THEME
	} else if (typeof preferences === "object" && preferences !== null) {
		payload.theme = preferences.theme === "dark" ? "dark" : DEFAULT_THEME
		if (preferences.primaryColor) {
			payload.primaryColor = normalizeColor(preferences.primaryColor)
		}
		if (preferences.selectedYear !== undefined) {
			payload.selectedYear = normalizeStoredYear(preferences.selectedYear)
		}
		if (preferences.selectedMonth !== undefined) {
			payload.selectedMonth = normalizeStoredMonth(preferences.selectedMonth)
		}
	}

	await setDoc(
		themeDocRef,
		{
			...payload,
			updatedAt: serverTimestamp()
		},
		{ merge: true }
	)
}
