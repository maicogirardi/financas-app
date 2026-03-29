import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDocs,
	onSnapshot,
	query,
	serverTimestamp
} from "firebase/firestore"
import { auth, db } from "@/firebase"

function getTransactionsCollection() {
	const user = auth.currentUser

	if (!user) {
		throw new Error("User must be authenticated to access transactions")
	}

	return collection(db, "users", user.uid, "transactions")
}

export async function createTransactionDoc(data) {
	const transactionsCollection = getTransactionsCollection()

	await addDoc(transactionsCollection, {
		...data,
		date: data.date ?? new Date(),
		createdAt: serverTimestamp()
	})
}

export async function deleteTransactionsByWalletDoc(walletId) {
	const transactionsCollection = getTransactionsCollection()
	const snapshot = await getDocs(transactionsCollection)

	const matchingDocs = snapshot.docs.filter(transactionDoc => {
		const data = transactionDoc.data()
		return data.walletFrom === walletId || data.walletTo === walletId
	})

	await Promise.all(
		matchingDocs.map(transactionDoc =>
			deleteDoc(doc(transactionsCollection, transactionDoc.id))
		)
	)
}

export function subscribeTransactions(callback, onError) {
	const transactionsCollection = getTransactionsCollection()
	const transactionsQuery = query(transactionsCollection)

	return onSnapshot(
		transactionsQuery,
		snapshot => {
			const transactions = snapshot.docs.map(transactionDoc => {
				const data = transactionDoc.data()

				return {
					id: transactionDoc.id,
					type: data.type,
					amount: Number(data.amount ?? 0),
					walletFrom: data.walletFrom,
					walletTo: data.walletTo,
					category: data.category,
					tag: data.tag,
					description: data.description,
					date: data.date?.toDate?.() ?? new Date(),
					paid: Boolean(data.paid),
					createdAt: data.createdAt?.toDate?.() ?? new Date()
				}
			})

			callback(transactions)
		},
		onError
	)
}
