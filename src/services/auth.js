import {
	signInWithRedirect,
	signInWithPopup,
	signOut,
	onAuthStateChanged
} from "firebase/auth"

import { auth, provider } from "../firebase"

function isStandaloneMode() {
	if (typeof window === "undefined") return false

	return window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
		window.navigator.standalone === true
}

export async function loginWithGoogle() {
	if (isStandaloneMode()) {
		await signInWithRedirect(auth, provider)
		return null
	}

	const result = await signInWithPopup(auth, provider)
	return result.user
}

export async function logout() {
	await signOut(auth)
}

export function onUserChanged(callback) {
	return onAuthStateChanged(auth, callback)
}
