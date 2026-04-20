import { reactive } from "vue"
import type { Category } from "@/types/category"
import {
	createCategoryDoc,
	deleteCategoryDoc,
	ensureCategoryDoc,
	subscribeCategories,
	updateCategoryDoc
} from "@/services/categories"
import { updateTransactionsCategoryDocs } from "@/services/transactions"

const DEFAULT_CATEGORY_NAMES = [
	"Entradas",
	"Despesas Fixas",
	"Despesas Diversas",
	"Cart\u00f5es de Cr\u00e9dito"
]

// Categorias internas que o usuario nao deve editar como categorias normais.
export const TRANSFER_CATEGORY_ID = "system-transfer"
export const TRANSFER_CATEGORY_NAME = "Transferencias"
export const TRANSFER_CATEGORY_LABEL = "Transfer\u00eancias"
export const BALANCE_ADJUSTMENT_CATEGORY_ID = "system-balance-adjustment"
export const BALANCE_ADJUSTMENT_CATEGORY_NAME = "Ajuste de Saldo"

const state = reactive({
	categories: [] as Category[],
	isLoaded: false,
	error: ""
})

let unsubscribeCategories: null | (() => void) = null

export function useCategoryStore() {
	function isTransferCategory(category: Category) {
		// Garante que transferencias fiquem fora da manutencao manual.
		return (
			category.id === TRANSFER_CATEGORY_ID ||
			category.name === TRANSFER_CATEGORY_NAME ||
			category.name === TRANSFER_CATEGORY_LABEL
		)
	}

	function setCategories(categories: Category[]) {
		// Quando a colecao vem vazia, o fluxo repoe as categorias base.
		state.categories.splice(0, state.categories.length, ...categories)
		state.isLoaded = true

		if (categories.length === 0) {
			void ensureDefaultCategories()
		}
	}

	function clearCategories() {
		if (unsubscribeCategories) {
			unsubscribeCategories()
			unsubscribeCategories = null
		}

		state.categories.splice(0, state.categories.length)
		state.isLoaded = false
		state.error = ""
	}

	function startCategoriesSync() {
		clearCategories()

		// A UI depende do snapshot inicial para liberar as telas de lancamento.
		unsubscribeCategories = subscribeCategories(
			categories => {
				setCategories(categories)
			},
			error => {
				state.error = error.message
				state.isLoaded = true
			}
		)
	}

	async function createCategory(name: string) {
		try {
			state.error = ""
			await createCategoryDoc({
				name,
				order: state.categories.length,
				hidden: false
			})
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to create category"
			throw error
		}
	}

	async function updateCategory(id: string, name: string) {
		const category = state.categories.find(item => item.id === id)

		if (!category) return

		try {
			state.error = ""
			// Atualiza lancamentos antigos para manter o nome da categoria consistente.
			await updateCategoryDoc(id, { name })
			await updateTransactionsCategoryDocs(id, category.name, name)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to update category"
			throw error
		}
	}

	async function deleteCategory(id: string) {
		try {
			state.error = ""
			await deleteCategoryDoc(id)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to delete category"
			throw error
		}
	}

	async function moveCategory(id: string, direction: "up" | "down") {
		// Reordena somente categorias visiveis e nao-sistema.
		const categories = state.categories.filter(category => !category.hidden && !isTransferCategory(category))
		const currentIndex = categories.findIndex(category => category.id === id)

		if (currentIndex < 0) return

		const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

		if (targetIndex < 0 || targetIndex >= categories.length) return

		const currentCategory = categories[currentIndex]
		const targetCategory = categories[targetIndex]

		try {
			state.error = ""
			const currentOrder = currentCategory.order ?? currentIndex
			const targetOrder = targetCategory.order ?? targetIndex

			await Promise.all([
				updateCategoryDoc(currentCategory.id, { order: targetOrder }),
				updateCategoryDoc(targetCategory.id, { order: currentOrder })
			])
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to move category"
			throw error
		}
	}

	async function reorderCategories(categoryIds: string[]) {
		try {
			state.error = ""

			// Replica a nova ordem tanto no cache local quanto no Firestore.
			for (const category of state.categories) {
				const nextOrder = categoryIds.findIndex(id => id === category.id)

				if (nextOrder >= 0) {
					category.order = nextOrder
				}
			}

			await Promise.all(
				categoryIds.map((id, index) =>
					updateCategoryDoc(id, { order: index })
				)
			)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to reorder categories"
			throw error
		}
	}

	async function ensureDefaultCategories() {
		if (!state.isLoaded) return

		const visibleCount = state.categories.filter(category => !category.hidden).length

		if (visibleCount === 0) {
			// Cria as categorias padrao apenas quando o usuario ainda nao possui nenhuma visivel.
			for (let index = 0; index < DEFAULT_CATEGORY_NAMES.length; index += 1) {
				const name = DEFAULT_CATEGORY_NAMES[index]

				await ensureCategoryDoc(`default-${index}`, {
					name,
					order: index,
					hidden: false
				})
			}
		}

		// As categorias internas ficam escondidas, mas continuam disponiveis nas transacoes.
		await ensureCategoryDoc(TRANSFER_CATEGORY_ID, {
			name: TRANSFER_CATEGORY_LABEL,
			order: DEFAULT_CATEGORY_NAMES.length,
			hidden: true
		})

		await ensureCategoryDoc(BALANCE_ADJUSTMENT_CATEGORY_ID, {
			name: BALANCE_ADJUSTMENT_CATEGORY_NAME,
			order: DEFAULT_CATEGORY_NAMES.length + 1,
			hidden: true
		})
	}

	function getCategoryByName(name: string) {
		return state.categories.find(category => category.name === name)
	}

	function getCategoryById(id: string) {
		return state.categories.find(category => category.id === id)
	}

	return {
		get categories() {
			return state.categories
		},
		get entryCategories() {
			return state.categories.filter(category => !category.hidden && !isTransferCategory(category))
		},
		get manageableCategories() {
			return state.categories.filter(category => !category.hidden && !isTransferCategory(category))
		},
		get isLoaded() {
			return state.isLoaded
		},
		get error() {
			return state.error
		},
		startCategoriesSync,
		clearCategories,
		createCategory,
		updateCategory,
		deleteCategory,
		moveCategory,
		reorderCategories,
		ensureDefaultCategories,
		getCategoryByName,
		getCategoryById
	}
}
