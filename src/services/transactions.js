import {
	addDoc,
	collection,
	deleteField,
	deleteDoc,
	doc,
	getDocs,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	updateDoc
} from "firebase/firestore"
import { auth, db } from "@/firebase"

function removeUndefinedFields(data) {
	return Object.fromEntries(
		Object.entries(data).filter(([, value]) => value !== undefined)
	)
}

function prepareUpdateFields(data) {
	return Object.fromEntries(
		Object.entries(data).map(([key, value]) => [
			key,
			value === undefined ? deleteField() : value
		])
	)
}

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
		...removeUndefinedFields(data),
		date: data.date ?? new Date(),
		createdAt: serverTimestamp()
	})
}

export async function updateTransactionDoc(id, data) {
	const transactionsCollection = getTransactionsCollection()

	await updateDoc(doc(transactionsCollection, id), prepareUpdateFields(data))
}

export async function deleteTransactionDoc(id) {
	const transactionsCollection = getTransactionsCollection()

	await deleteDoc(doc(transactionsCollection, id))
}

export async function updateTransactionsCategoryDocs(categoryId, oldName, newName) {
	const transactionsCollection = getTransactionsCollection()
	const snapshot = await getDocs(transactionsCollection)

	const matchingDocs = snapshot.docs.filter(transactionDoc => {
		const data = transactionDoc.data()
		return data.categoryId === categoryId || data.category === oldName
	})

	await Promise.all(
		matchingDocs.map(transactionDoc =>
			updateDoc(doc(transactionsCollection, transactionDoc.id), removeUndefinedFields({
				categoryId,
				category: newName
			}))
		)
	)
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

export async function deleteTransactionsByPeriodDoc(periodId) {
	const transactionsCollection = getTransactionsCollection()
	const snapshot = await getDocs(transactionsCollection)

	const matchingDocs = snapshot.docs.filter(transactionDoc => {
		const data = transactionDoc.data()
		return data.periodId === periodId
	})

	await Promise.all(
		matchingDocs.map(transactionDoc =>
			deleteDoc(doc(transactionsCollection, transactionDoc.id))
		)
	)
}

export function subscribeTransactions(callback, onError) {
	const transactionsCollection = getTransactionsCollection()
	const transactionsQuery = query(transactionsCollection, orderBy("createdAt", "desc"))

	return onSnapshot(
		transactionsQuery,
		snapshot => {
			const transactions = snapshot.docs.map(transactionDoc => {
				const data = transactionDoc.data()

				return {
					id: transactionDoc.id,
					type: data.type,
					periodId: data.periodId,
					amount: Number(data.amount ?? 0),
					walletFrom: data.walletFrom,
					walletTo: data.walletTo,
					category: data.category,
					categoryId: data.categoryId,
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
