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
import { setDoc } from "firebase/firestore"
import { auth, db } from "@/firebase"

function getCategoriesCollection() {
	const user = auth.currentUser

	if (!user) {
		throw new Error("User must be authenticated to access categories")
	}

	return collection(db, "users", user.uid, "categories")
}

export async function createCategoryDoc(data) {
	const categoriesCollection = getCategoriesCollection()

	await addDoc(categoriesCollection, {
		...data,
		createdAt: serverTimestamp()
	})
}

export async function ensureCategoryDoc(id, data) {
	const categoriesCollection = getCategoriesCollection()

	await setDoc(
		doc(categoriesCollection, id),
		{
			...data,
			createdAt: serverTimestamp()
		},
		{ merge: true }
	)
}

export async function updateCategoryDoc(id, data) {
	const categoriesCollection = getCategoriesCollection()

	await updateDoc(doc(categoriesCollection, id), data)
}

export async function deleteCategoryDoc(id) {
	const categoriesCollection = getCategoriesCollection()

	await deleteDoc(doc(categoriesCollection, id))
}

export function subscribeCategories(callback, onError) {
	const categoriesCollection = getCategoriesCollection()
	const categoriesQuery = query(categoriesCollection, orderBy("order", "asc"))

	return onSnapshot(
		categoriesQuery,
		snapshot => {
			const categories = snapshot.docs.map(categoryDoc => {
				const data = categoryDoc.data()

				return {
					id: categoryDoc.id,
					name: data.name ?? "",
					order: data.order,
					hidden: Boolean(data.hidden),
					createdAt: data.createdAt?.toDate?.() ?? new Date()
				}
			})

			callback(categories)
		},
		onError
	)
}
