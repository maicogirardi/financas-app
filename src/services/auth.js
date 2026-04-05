import {
	getRedirectResult,
	signInWithPopup,
	signOut,
	onAuthStateChanged
} from "firebase/auth"

import { auth, provider } from "../firebase"

export async function loginWithGoogle() {
	const result = await signInWithPopup(auth, provider)
	return result.user
}

export async function logout() {
	await signOut(auth)
}

export function onUserChanged(callback) {
	return onAuthStateChanged(auth, callback)
}

export async function resolveRedirectLogin() {
	const result = await getRedirectResult(auth)
	return result?.user ?? null
}
