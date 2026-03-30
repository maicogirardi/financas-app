import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	updateDoc
} from "firebase/firestore"
import { auth, db } from "@/firebase"

function getWalletsCollection() {
	const user = auth.currentUser

	if (!user) {
		throw new Error("User must be authenticated to access wallets")
	}

	return collection(db, "users", user.uid, "wallets")
}

export async function createWalletDoc(data) {
	const walletsCollection = getWalletsCollection()

	await addDoc(walletsCollection, {
		...data,
		createdAt: serverTimestamp()
	})
}

export async function updateWalletDoc(id, data) {
	const walletsCollection = getWalletsCollection()

	await updateDoc(doc(walletsCollection, id), data)
}

export async function deleteWalletDoc(id) {
	const walletsCollection = getWalletsCollection()

	await deleteDoc(doc(walletsCollection, id))
}

export function subscribeWallets(callback, onError) {
	const walletsCollection = getWalletsCollection()
	const walletsQuery = query(walletsCollection, orderBy("order", "asc"))

	return onSnapshot(
		walletsQuery,
		snapshot => {
			const wallets = snapshot.docs.map(walletDoc => {
				const data = walletDoc.data()

				return {
					id: walletDoc.id,
					name: data.name ?? "",
					color: data.color ?? "#aa3bff",
					initialBalance: Number(data.initialBalance ?? 0),
					order: data.order,
					archived: data.archived ?? false,
					createdAt: data.createdAt?.toDate?.() ?? new Date()
				}
			})

			callback(wallets)
		},
		onError
	)
}
