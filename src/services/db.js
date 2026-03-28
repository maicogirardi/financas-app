import { db } from "../firebase"
import { auth } from "../firebase"

import {
	collection,
	addDoc,
	getDocs,
	query,
	where
} from "firebase/firestore"

export async function addExpense(data) {
	const user = auth.currentUser

	if (!user) return

	await addDoc(
		collection(db, "users", user.uid, "expenses"),
		data
	)
}

export async function getExpenses() {
	const user = auth.currentUser

	if (!user) return []

	const q = query(
		collection(db, "users", user.uid, "expenses")
	)

	const snapshot = await getDocs(q)

	return snapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}))
}