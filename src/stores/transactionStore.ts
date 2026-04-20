import { reactive } from "vue"
import type { Transaction } from "@/types/transaction"
import {
	BALANCE_ADJUSTMENT_CATEGORY_ID,
	BALANCE_ADJUSTMENT_CATEGORY_NAME,
	TRANSFER_CATEGORY_ID,
	TRANSFER_CATEGORY_LABEL
} from "@/stores/categoryStore"
import {
	createTransactionDoc,
	deleteTransactionDoc,
	deleteTransactionsByPeriodDoc,
	deleteTransactionsByWalletDoc,
	subscribeTransactions,
	updateTransactionDoc
} from "@/services/transactions"

const state = reactive({
	transactions: [] as Transaction[],
	isLoaded: false,
	error: ""
})
let unsubscribeTransactions: null | (() => void) = null

export function useTransactionStore() {
	function setTransactions(transactions: Transaction[]) {
		// Atualiza o cache local com o snapshot mais recente do Firestore.
		state.transactions.splice(0, state.transactions.length, ...transactions)
		state.isLoaded = true
	}

	function clearTransactions() {
		// Encerra listeners antigos antes de abrir uma nova sincronizacao.
		if (unsubscribeTransactions) {
			unsubscribeTransactions()
			unsubscribeTransactions = null
		}

		state.transactions.splice(0, state.transactions.length)
		state.isLoaded = false
		state.error = ""
	}

	function startTransactionsSync() {
		clearTransactions()

		// Mantem a lista sempre ordenada pela ordem de criacao no backend.
		unsubscribeTransactions = subscribeTransactions(
			transactions => {
				setTransactions(transactions)
			},
			error => {
				state.error = error.message
				state.isLoaded = true
			}
		)
	}

	async function createTransaction(data: Omit<Transaction, "id" | "createdAt">) {
		try {
			state.error = ""
			await createTransactionDoc(data)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to create transaction"
			throw error
		}
	}

	async function createAdjustmentTransaction(
		periodId: string,
		walletId: string,
		currentBalance: number,
		newBalance: number,
		description?: string
	) {
		const amount = Math.abs(newBalance - currentBalance)

		if (amount === 0) return

		// Ajuste vira uma transacao comum para registrar a diferenca de saldo.
		await createTransaction({
			type: "adjustment",
			periodId,
			amount,
			walletFrom: newBalance < currentBalance ? walletId : undefined,
			walletTo: newBalance > currentBalance ? walletId : undefined,
			category: BALANCE_ADJUSTMENT_CATEGORY_NAME,
			categoryId: BALANCE_ADJUSTMENT_CATEGORY_ID,
			description: description?.trim() || undefined,
			date: new Date(),
			paid: false
		})
	}

	async function createEntryTransaction({
		type,
		periodId,
		description,
		category,
		categoryId,
		walletId,
		targetWalletId,
		amount,
		date
	}: {
		type: "income" | "expense" | "transfer"
		periodId: string
		description?: string
		category: string
		categoryId?: string
		walletId: string
		targetWalletId?: string
		amount: number
		date: Date
	}) {
		const trimmedDescription = description?.trim() || undefined

		if (type === "income") {
			// Entrada credita a carteira de destino.
			await createTransaction({
				type,
				periodId,
				amount,
				walletTo: walletId,
				category,
				categoryId,
				description: trimmedDescription,
				date,
				paid: false
			})

			return
		}

		if (type === "expense") {
			// Saida debita a carteira de origem.
			await createTransaction({
				type,
				periodId,
				amount,
				walletFrom: walletId,
				category,
				categoryId,
				description: trimmedDescription,
				date,
				paid: false
			})

			return
		}

		// Transferencia move valor entre duas carteiras e ja nasce paga.
		await createTransaction({
			type,
			periodId,
			amount,
			walletFrom: walletId,
			walletTo: targetWalletId,
			category: TRANSFER_CATEGORY_LABEL,
			categoryId: TRANSFER_CATEGORY_ID,
			description: trimmedDescription,
			date,
			paid: true
		})
	}

	async function updateTransaction(id: string, data: Partial<Omit<Transaction, "id" | "createdAt">>) {
		try {
			state.error = ""
			await updateTransactionDoc(id, data)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to update transaction"
			throw error
		}
	}

	async function deleteTransaction(id: string) {
		try {
			state.error = ""
			await deleteTransactionDoc(id)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to delete transaction"
			throw error
		}
	}

	function getWalletBalance(walletId: string, initialBalance = 0) {
		// Saldo do resumo considera apenas transacoes pagas.
		return state.transactions.reduce((balance, transaction) => {
			if (!transaction.paid) {
				return balance
			}

			switch (transaction.type) {
				case "income":
					return transaction.walletTo === walletId
						? balance + transaction.amount
						: balance
				case "expense":
					return transaction.walletFrom === walletId
						? balance - transaction.amount
						: balance
				case "transfer":
					if (transaction.walletFrom === walletId) {
						return balance - transaction.amount
					}

					if (transaction.walletTo === walletId) {
						return balance + transaction.amount
					}

					return balance
				case "adjustment":
					if (transaction.walletFrom === walletId) {
						return balance - transaction.amount
					}

					if (transaction.walletTo === walletId) {
						return balance + transaction.amount
					}

					return balance
				default:
					return balance
			}
		}, initialBalance)
	}

	async function deleteTransactionsByWallet(walletId: string) {
		try {
			state.error = ""
			await deleteTransactionsByWalletDoc(walletId)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to delete transactions"
			throw error
		}
	}

	async function deleteTransactionsByPeriod(periodId: string) {
		try {
			state.error = ""
			await deleteTransactionsByPeriodDoc(periodId)
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to delete period transactions"
			throw error
		}
	}

	return {
		get transactions() {
			return state.transactions
		},
		get isLoaded() {
			return state.isLoaded
		},
		get error() {
			return state.error
		},
		startTransactionsSync,
		clearTransactions,
		createTransaction,
		createAdjustmentTransaction,
		createEntryTransaction,
		updateTransaction,
		deleteTransaction,
		deleteTransactionsByPeriod,
		deleteTransactionsByWallet,
		getWalletBalance
	}
}
