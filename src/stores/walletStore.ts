import { reactive } from "vue"
import type { Wallet } from "@/types/wallet"
import {
	createWalletDoc,
	deleteWalletDoc,
	subscribeWallets,
	updateWalletDoc
} from "@/services/wallets"

const state = reactive({
	wallets: [] as Wallet[],
	isLoaded: false,
	error: ""
})
let unsubscribeWallets: null | (() => void) = null

export function useWalletStore() {
	function setWallets(wallets: Wallet[]) {
		// Atualiza o cache local com a ordem vinda do Firestore.
		state.wallets.splice(0, state.wallets.length, ...wallets)
		state.isLoaded = true
	}

	function clearWallets() {
		// Troca o listener e limpa qualquer estado anterior da lista.
		if (unsubscribeWallets) {
			unsubscribeWallets()
			unsubscribeWallets = null
		}

		state.wallets.splice(0, state.wallets.length)
		state.isLoaded = false
		state.error = ""
	}

	function startWalletsSync() {
		clearWallets()

		// Mantem as carteiras sincronizadas em tempo real por usuario logado.
		unsubscribeWallets = subscribeWallets(
			wallets => {
				setWallets(wallets)
			},
			error => {
				state.error = error.message
				state.isLoaded = true
			}
		)
	}

	async function createWallet(name: string, initialBalance: number, color: string) {
		// Nova carteira ja entra com saldo inicial, cor e ordem definidos.
		await createWalletDoc({
			name,
			color,
			initialBalance,
			order: state.wallets.length,
			archived: false
		})
	}

	async function updateWallet(id: string, data: Partial<Pick<Wallet, "name" | "color" | "order" | "archived">>) {
		await updateWalletDoc(id, data)
	}

	async function deleteWallet(id: string) {
		await deleteWalletDoc(id)
	}

	function getWallet(id: string) {
		return state.wallets.find(w => w.id === id)
	}

	return {
		get wallets() {
			return state.wallets
		},
		get isLoaded() {
			return state.isLoaded
		},
		get error() {
			return state.error
		},
		startWalletsSync,
		clearWallets,
		createWallet,
		updateWallet,
		deleteWallet,
		getWallet
	}
}
