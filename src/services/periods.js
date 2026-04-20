import {
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	setDoc
} from "firebase/firestore"
import { auth, db } from "@/firebase"

function getPeriodsCollection() {
	const user = auth.currentUser

	if (!user) {
		throw new Error("User must be authenticated to access periods")
	}

	return collection(db, "users", user.uid, "periods")
}

export function buildPeriodId(year, month) {
	// Usa um id previsivel para facilitar filtro e copia entre periodos.
	return `${year}-${String(month).padStart(2, "0")}`
}

export async function upsertPeriodDoc(id, data) {
	const periodsCollection = getPeriodsCollection()

	await setDoc(
		doc(periodsCollection, id),
		data,
		{ merge: true }
	)
}

export async function deletePeriodDoc(id) {
	const periodsCollection = getPeriodsCollection()

	await deleteDoc(doc(periodsCollection, id))
}

export function subscribePeriods(callback, onError) {
	const periodsCollection = getPeriodsCollection()

	return onSnapshot(
		periodsCollection,
		snapshot => {
			// Normaliza e ordena os periodos para o seletor de mes/ano.
			const periods = snapshot.docs
				.map(periodDoc => {
					const data = periodDoc.data()

					return {
						id: periodDoc.id,
						year: Number(data.year),
						month: Number(data.month),
						openingBalances: data.openingBalances ?? {},
						createdAt: data.createdAt?.toDate?.() ?? new Date()
					}
				})
				.sort((a, b) => {
					if (a.year !== b.year) return a.year - b.year
					return a.month - b.month
				})

			callback(periods)
		},
		onError
	)
}
