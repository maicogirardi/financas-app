<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import {
	BALANCE_ADJUSTMENT_CATEGORY_ID,
	BALANCE_ADJUSTMENT_CATEGORY_NAME,
	TRANSFER_CATEGORY_ID,
	TRANSFER_CATEGORY_NAME,
	TRANSFER_CATEGORY_LABEL,
	useCategoryStore
} from "@/stores/categoryStore"
import { buildPeriodId } from "@/services/periods"
import { usePeriodStore } from "@/stores/periodStore"
import { useTransactionStore } from "@/stores/transactionStore"
import { useWalletStore } from "@/stores/walletStore"
import { loginWithGoogle, logout, onUserChanged } from "@/services/auth"

const walletStore = useWalletStore()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const periodStore = usePeriodStore()

const user = ref(null)
const authReady = ref(false)
const isSubmitting = ref(false)
const currentPage = ref("dashboard")

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

const walletName = ref("")
const walletBalance = ref(0)

const adjustingWalletId = ref("")
const adjustmentBalance = ref(0)
const adjustmentDescription = ref("")

const deleteWalletId = ref("")
const deleteCategoryId = ref("")
const deleteTransactionId = ref("")
const deletePeriodId = ref("")

const isCategoryModalOpen = ref(false)
const editingCategoryId = ref("")
const categoryName = ref("")
const draggedCategoryId = ref("")
const dragOverCategoryId = ref("")

const isPeriodModalOpen = ref(false)
const periodModalYear = ref(new Date().getFullYear())
const periodModalMonth = ref(new Date().getMonth() + 1)

const isEntryModalOpen = ref(false)
const editingTransactionId = ref("")
const entryDescription = ref("")
const entryType = ref("expense")
const entryCategoryId = ref("")
const entryWalletId = ref("")
const entryTargetWalletId = ref("")
const entryAmount = ref(0)
const entryDate = ref("")
const entryAdjustmentDirection = ref("increase")
const entryFormError = ref("")

const isDataReady = computed(() =>
	authReady.value &&
	(!user.value || (
		walletStore.isLoaded &&
		transactionStore.isLoaded &&
		categoryStore.isLoaded &&
		periodStore.isLoaded
	))
)

const appError = computed(() =>
	walletStore.error || transactionStore.error || categoryStore.error || periodStore.error || ""
)

const availableYears = computed(() => {
	const years = Array.from(new Set(periodStore.periods.map(period => period.year))).sort((a, b) => b - a)
	return years.length > 0 ? years : [selectedYear.value]
})

const monthOptions = [
	{ value: 1, label: "01" },
	{ value: 2, label: "02" },
	{ value: 3, label: "03" },
	{ value: 4, label: "04" },
	{ value: 5, label: "05" },
	{ value: 6, label: "06" },
	{ value: 7, label: "07" },
	{ value: 8, label: "08" },
	{ value: 9, label: "09" },
	{ value: 10, label: "10" },
	{ value: 11, label: "11" },
	{ value: 12, label: "12" }
]

const availableMonths = computed(() => {
	const months = periodStore.periods
		.filter(period => period.year === selectedYear.value)
		.map(period => period.month)
		.sort((a, b) => a - b)

	if (months.length === 0) {
		return monthOptions.filter(option => option.value === selectedMonth.value)
	}

	return monthOptions.filter(option => months.includes(option.value))
})

const selectedPeriodId = computed(() => buildPeriodId(selectedYear.value, selectedMonth.value))
const selectedPeriod = computed(() => periodStore.getPeriodById(selectedPeriodId.value))

const selectedPeriodStart = computed(() =>
	new Date(selectedYear.value, selectedMonth.value - 1, 1)
)

const selectedPeriodEnd = computed(() =>
	new Date(selectedYear.value, selectedMonth.value, 0)
)

const entryMinDate = computed(() => formatDateInput(selectedPeriodStart.value))
const entryMaxDate = computed(() => formatDateInput(selectedPeriodEnd.value))

const filteredTransactions = computed(() =>
	transactionStore.transactions.filter(transaction => {
		if (transaction.periodId) {
			return transaction.periodId === selectedPeriodId.value
		}

		const date = new Date(transaction.date)
		return date.getFullYear() === selectedYear.value && date.getMonth() + 1 === selectedMonth.value
	})
)

const groupedTransactions = computed(() => {
	return categoryStore.categories
		.filter(category =>
			category.id === TRANSFER_CATEGORY_ID ||
			(category.name !== TRANSFER_CATEGORY_NAME && category.name !== TRANSFER_CATEGORY_LABEL)
		)
		.map(category => ({
		id: category.id,
		title: category.name,
		items: filteredTransactions.value.filter(transaction =>
			transaction.categoryId
				? transaction.categoryId === category.id
				: transaction.category === category.name
		)
	}))
})

const dashboardWallets = computed(() =>
	walletStore.wallets.map(wallet => ({
		...wallet,
		balance: getWalletBalanceForPeriod(wallet)
	}))
)

let stopAuthListener = null

onMounted(() => {
	stopAuthListener = onUserChanged(currentUser => {
		user.value = currentUser
		authReady.value = true

		if (currentUser) {
			walletStore.startWalletsSync()
			transactionStore.startTransactionsSync()
			categoryStore.startCategoriesSync()
			periodStore.startPeriodsSync()
			return
		}

		walletStore.clearWallets()
		transactionStore.clearTransactions()
		categoryStore.clearCategories()
		periodStore.clearPeriods()
		closeAllModals()
	})
})

onBeforeUnmount(() => {
	if (stopAuthListener) {
		stopAuthListener()
	}

	walletStore.clearWallets()
	transactionStore.clearTransactions()
	categoryStore.clearCategories()
	periodStore.clearPeriods()
})

watch(
	() => ({
		walletsLoaded: walletStore.isLoaded,
		periodsLoaded: periodStore.isLoaded,
		hasUser: Boolean(user.value)
	}),
	async state => {
		if (!state.hasUser || !state.walletsLoaded || !state.periodsLoaded) return

		const currentYear = new Date().getFullYear()
		const currentMonth = new Date().getMonth() + 1
		const currentPeriod = periodStore.getPeriodByYearMonth(currentYear, currentMonth)

		if (!currentPeriod) {
			const openingBalances = Object.fromEntries(
				walletStore.wallets.map(wallet => [wallet.id, wallet.initialBalance])
			)

			await periodStore.ensurePeriod(currentYear, currentMonth, openingBalances)
			selectedYear.value = currentYear
			selectedMonth.value = currentMonth
			return
		}

		if (!periodStore.getPeriodByYearMonth(selectedYear.value, selectedMonth.value)) {
			const latestPeriod = periodStore.periods[periodStore.periods.length - 1]

			if (latestPeriod) {
				selectedYear.value = latestPeriod.year
				selectedMonth.value = latestPeriod.month
			}
		}
	},
	{ immediate: true }
)

watch(selectedYear, year => {
	const hasSelectedMonth = periodStore.getPeriodByYearMonth(year, selectedMonth.value)

	if (hasSelectedMonth) return

	const firstMonth = availableMonths.value[0]

	if (firstMonth) {
		selectedMonth.value = firstMonth.value
	}
})

function closeAllModals() {
	closeAdjustmentModal()
	closeCategoryModal()
	closeEntryModal()
	closeDeleteWalletModal()
	closeDeleteCategoryModal()
	closeDeleteTransactionModal()
	closePeriodModal()
	closeDeletePeriodModal()
}

function formatDateInput(date) {
	const current = new Date(date)
	const year = current.getFullYear()
	const month = `${current.getMonth() + 1}`.padStart(2, "0")
	const day = `${current.getDate()}`.padStart(2, "0")
	return `${year}-${month}-${day}`
}

function getSelectedCategory() {
	return categoryStore.entryCategories.find(category => category.id === entryCategoryId.value)
}

function isDateInSelectedPeriod(date) {
	return (
		date.getFullYear() === selectedYear.value &&
		date.getMonth() + 1 === selectedMonth.value
	)
}

function getOpeningBalance(wallet) {
	return selectedPeriod.value?.openingBalances?.[wallet.id] ?? wallet.initialBalance
}

function buildNextPeriodDate(year, month) {
	return month === 12
		? { year: year + 1, month: 1 }
		: { year, month: month + 1 }
}

function buildPreviousPeriodDate(year, month) {
	return month === 1
		? { year: year - 1, month: 12 }
		: { year, month: month - 1 }
}

function buildClonedDateForNextPeriod(date, nextYear, nextMonth) {
	const original = new Date(date)
	const day = original.getDate()
	const lastDay = new Date(nextYear, nextMonth, 0).getDate()
	return new Date(nextYear, nextMonth - 1, Math.min(day, lastDay), 12, 0, 0)
}

function getWalletBalanceForPeriod(wallet) {
	const openingBalance = getOpeningBalance(wallet)

	return transactionStore.transactions.reduce((balance, transaction) => {
		const belongsToSelectedPeriod = transaction.periodId
			? transaction.periodId === selectedPeriodId.value
			: isDateInSelectedPeriod(new Date(transaction.date))

		if (!belongsToSelectedPeriod || !transaction.paid) {
			return balance
		}

		switch (transaction.type) {
			case "income":
				return transaction.walletTo === wallet.id ? balance + transaction.amount : balance
			case "expense":
				return transaction.walletFrom === wallet.id ? balance - transaction.amount : balance
			case "transfer":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			case "adjustment":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			default:
				return balance
		}
	}, openingBalance)
}

function getWalletBalanceForPeriodId(wallet, periodId) {
	const period = periodStore.getPeriodById(periodId)
	const openingBalance = period?.openingBalances?.[wallet.id] ?? wallet.initialBalance

	return transactionStore.transactions.reduce((balance, transaction) => {
		if (transaction.periodId !== periodId || !transaction.paid) {
			return balance
		}

		switch (transaction.type) {
			case "income":
				return transaction.walletTo === wallet.id ? balance + transaction.amount : balance
			case "expense":
				return transaction.walletFrom === wallet.id ? balance - transaction.amount : balance
			case "transfer":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			case "adjustment":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			default:
				return balance
		}
	}, openingBalance)
}

function getTransactionsForPeriod(periodId) {
	return transactionStore.transactions.filter(transaction => {
		if (transaction.periodId) {
			return transaction.periodId === periodId
		}

		const date = new Date(transaction.date)
		return buildPeriodId(date.getFullYear(), date.getMonth() + 1) === periodId
	})
}

function getWalletName(walletId) {
	return walletStore.getWallet(walletId)?.name ?? "-"
}

function getTransactionWalletLabel(transaction) {
	if (transaction.type === "income") {
		return getWalletName(transaction.walletTo)
	}

	if (transaction.type === "expense") {
		return getWalletName(transaction.walletFrom)
	}

	if (transaction.type === "transfer") {
		return `${getWalletName(transaction.walletFrom)} -> ${getWalletName(transaction.walletTo)}`
	}

	return getWalletName(transaction.walletTo || transaction.walletFrom)
}

function handleCategoryDragStart(categoryId, event) {
	draggedCategoryId.value = categoryId

	if (event?.dataTransfer) {
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("text/plain", categoryId)
	}
}

function handleCategoryDragOver(categoryId, event) {
	if (!draggedCategoryId.value || draggedCategoryId.value === categoryId) return

	event.preventDefault()
	dragOverCategoryId.value = categoryId

	if (event?.dataTransfer) {
		event.dataTransfer.dropEffect = "move"
	}
}

async function handleCategoryDrop(targetCategoryId) {
	if (!draggedCategoryId.value || draggedCategoryId.value === targetCategoryId) {
		dragOverCategoryId.value = ""
		return
	}

	const orderedIds = categoryStore.manageableCategories.map(category => category.id)
	const fromIndex = orderedIds.findIndex(id => id === draggedCategoryId.value)
	const toIndex = orderedIds.findIndex(id => id === targetCategoryId)

	if (fromIndex < 0 || toIndex < 0) {
		draggedCategoryId.value = ""
		dragOverCategoryId.value = ""
		return
	}

	const [movedId] = orderedIds.splice(fromIndex, 1)
	orderedIds.splice(toIndex, 0, movedId)

	isSubmitting.value = true

	try {
		await categoryStore.reorderCategories(orderedIds)
	} finally {
		isSubmitting.value = false
		draggedCategoryId.value = ""
		dragOverCategoryId.value = ""
	}
}

function handleCategoryDragEnd() {
	draggedCategoryId.value = ""
	dragOverCategoryId.value = ""
}

async function handleLogin() {
	isSubmitting.value = true

	try {
		await loginWithGoogle()
	} finally {
		isSubmitting.value = false
	}
}

async function handleLogout() {
	isSubmitting.value = true

	try {
		await logout()
	} finally {
		isSubmitting.value = false
	}
}

function openPeriodModal() {
	const nextPeriod = selectedPeriod.value
		? buildNextPeriodDate(selectedYear.value, selectedMonth.value)
		: { year: selectedYear.value, month: selectedMonth.value }

	periodModalYear.value = nextPeriod.year
	periodModalMonth.value = nextPeriod.month
	isPeriodModalOpen.value = true
}

function closePeriodModal() {
	isPeriodModalOpen.value = false
}

async function savePeriod() {
	const existingPeriod = periodStore.getPeriodByYearMonth(periodModalYear.value, periodModalMonth.value)

	if (existingPeriod) {
		selectedYear.value = existingPeriod.year
		selectedMonth.value = existingPeriod.month
		closePeriodModal()
		return
	}

	const previousPeriodDate = buildPreviousPeriodDate(periodModalYear.value, periodModalMonth.value)
	const previousPeriod = periodStore.getPeriodByYearMonth(previousPeriodDate.year, previousPeriodDate.month)
	const newPeriodId = buildPeriodId(periodModalYear.value, periodModalMonth.value)

	isSubmitting.value = true

	try {
		const openingBalances = previousPeriod
			? Object.fromEntries(
				walletStore.wallets.map(wallet => [
					wallet.id,
					getWalletBalanceForPeriodId(wallet, previousPeriod.id)
				])
			)
			: Object.fromEntries(
				walletStore.wallets.map(wallet => [wallet.id, wallet.initialBalance])
			)

		await periodStore.ensurePeriod(periodModalYear.value, periodModalMonth.value, openingBalances)

		if (previousPeriod) {
			for (const transaction of getTransactionsForPeriod(previousPeriod.id)) {
				if (transaction.type === "adjustment") continue

				await transactionStore.createTransaction({
					type: transaction.type,
					periodId: newPeriodId,
					amount: transaction.amount,
					walletFrom: transaction.walletFrom,
					walletTo: transaction.walletTo,
					category: transaction.category,
					categoryId: transaction.categoryId,
					description: transaction.description,
					date: buildClonedDateForNextPeriod(transaction.date, periodModalYear.value, periodModalMonth.value),
					paid: false
				})
			}
		}

		selectedYear.value = periodModalYear.value
		selectedMonth.value = periodModalMonth.value
		closePeriodModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeletePeriodModal() {
	if (!selectedPeriod.value) return

	deletePeriodId.value = selectedPeriod.value.id
}

function closeDeletePeriodModal() {
	deletePeriodId.value = ""
}

async function confirmDeletePeriod() {
	if (!deletePeriodId.value) return

	const periodToDelete = periodStore.getPeriodById(deletePeriodId.value)

	isSubmitting.value = true

	try {
		await transactionStore.deleteTransactionsByPeriod(deletePeriodId.value)
		await periodStore.deletePeriod(deletePeriodId.value)

		closeDeletePeriodModal()

		if (periodToDelete?.id === selectedPeriodId.value) {
			const remainingPeriods = periodStore.periods.filter(period => period.id !== deletePeriodId.value)
			const lastPeriod = remainingPeriods[remainingPeriods.length - 1]

			if (lastPeriod) {
				selectedYear.value = lastPeriod.year
				selectedMonth.value = lastPeriod.month
			} else {
				selectedYear.value = new Date().getFullYear()
				selectedMonth.value = new Date().getMonth() + 1
			}
		}
	} finally {
		isSubmitting.value = false
	}
}

async function addWallet() {
	const trimmedName = walletName.value.trim()

	if (!trimmedName) return

	isSubmitting.value = true

	try {
		await walletStore.createWallet(trimmedName, walletBalance.value)
		walletName.value = ""
		walletBalance.value = 0
	} finally {
		isSubmitting.value = false
	}
}

function openAdjustmentModal(wallet) {
	adjustingWalletId.value = wallet.id
	adjustmentBalance.value = getWalletBalanceForPeriod(wallet)
	adjustmentDescription.value = ""
}

function closeAdjustmentModal() {
	adjustingWalletId.value = ""
	adjustmentBalance.value = 0
	adjustmentDescription.value = ""
}

async function saveAdjustment() {
	const wallet = walletStore.getWallet(adjustingWalletId.value)

	if (!wallet) return

	isSubmitting.value = true

	try {
		await transactionStore.createAdjustmentTransaction(
			selectedPeriodId.value,
			wallet.id,
			getWalletBalanceForPeriod(wallet),
			adjustmentBalance.value,
			adjustmentDescription.value
		)

		closeAdjustmentModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeleteWalletModal(wallet) {
	deleteWalletId.value = wallet.id
}

function closeDeleteWalletModal() {
	deleteWalletId.value = ""
}

async function confirmDeleteWallet() {
	if (!deleteWalletId.value) return

	isSubmitting.value = true

	try {
		await transactionStore.deleteTransactionsByWallet(deleteWalletId.value)
		await walletStore.deleteWallet(deleteWalletId.value)
		closeDeleteWalletModal()
	} finally {
		isSubmitting.value = false
	}
}

function openCategoryModal(category = null) {
	isCategoryModalOpen.value = true
	editingCategoryId.value = category?.id ?? ""
	categoryName.value = category?.name ?? ""
}

function closeCategoryModal() {
	isCategoryModalOpen.value = false
	editingCategoryId.value = ""
	categoryName.value = ""
}

async function saveCategory() {
	const trimmedName = categoryName.value.trim()

	if (!trimmedName) return

	isSubmitting.value = true

	try {
		if (editingCategoryId.value) {
			await categoryStore.updateCategory(editingCategoryId.value, trimmedName)
		} else {
			await categoryStore.createCategory(trimmedName)
		}

		closeCategoryModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeleteCategoryModal(category) {
	deleteCategoryId.value = category.id
}

function closeDeleteCategoryModal() {
	deleteCategoryId.value = ""
}

async function confirmDeleteCategory() {
	if (!deleteCategoryId.value) return

	isSubmitting.value = true

	try {
		await categoryStore.deleteCategory(deleteCategoryId.value)
		closeDeleteCategoryModal()
	} finally {
		isSubmitting.value = false
	}
}

function resetEntryForm() {
	editingTransactionId.value = ""
	entryDescription.value = ""
	entryType.value = "expense"
	entryCategoryId.value = categoryStore.entryCategories[0]?.id ?? ""
	entryWalletId.value = walletStore.wallets[0]?.id ?? ""
	entryTargetWalletId.value = ""
	entryAmount.value = 0
	entryDate.value = formatDateInput(new Date(selectedYear.value, selectedMonth.value - 1, 1))
	entryAdjustmentDirection.value = "increase"
	entryFormError.value = ""
}

function openCreateEntryModal() {
	resetEntryForm()
	isEntryModalOpen.value = true
}

function openEditEntryModal(transaction) {
	isEntryModalOpen.value = true
	entryFormError.value = ""
	editingTransactionId.value = transaction.id
	entryDescription.value = transaction.description ?? ""
	entryType.value = transaction.type
	entryCategoryId.value =
		transaction.categoryId ||
		categoryStore.entryCategories.find(category => category.name === transaction.category)?.id ||
		""
	entryWalletId.value = transaction.walletFrom || transaction.walletTo || ""
	entryTargetWalletId.value = transaction.type === "transfer" ? transaction.walletTo || "" : ""
	entryAmount.value = transaction.amount
	entryDate.value = formatDateInput(transaction.date)
	entryAdjustmentDirection.value = transaction.walletTo ? "increase" : "decrease"
}

function closeEntryModal() {
	isEntryModalOpen.value = false
	resetEntryForm()
}

async function saveEntry() {
	const selectedCategory = getSelectedCategory()
	const existingTransaction = editingTransactionId.value
		? transactionStore.transactions.find(transaction => transaction.id === editingTransactionId.value)
		: null
	const normalizedDate = entryDate.value ? new Date(`${entryDate.value}T12:00:00`) : new Date()

	entryFormError.value = ""

	if (!entryWalletId.value || entryAmount.value <= 0) return
	if (!isDateInSelectedPeriod(normalizedDate)) {
		entryFormError.value = "A data da entrada deve estar dentro do mes e ano selecionados."
		return
	}

	if (entryType.value !== "adjustment" && entryType.value !== "transfer" && !selectedCategory) return
	if (entryType.value === "transfer" && !entryTargetWalletId.value) return
	if (entryType.value === "transfer" && entryWalletId.value === entryTargetWalletId.value) return

	const baseData = {
		type: entryType.value,
		periodId: selectedPeriodId.value,
		amount: entryAmount.value,
		category: entryType.value === "adjustment"
			? BALANCE_ADJUSTMENT_CATEGORY_NAME
			: entryType.value === "transfer"
				? TRANSFER_CATEGORY_LABEL
				: selectedCategory?.name,
		categoryId: entryType.value === "adjustment"
			? BALANCE_ADJUSTMENT_CATEGORY_ID
			: entryType.value === "transfer"
				? TRANSFER_CATEGORY_ID
				: selectedCategory?.id,
		description: entryDescription.value.trim() || undefined,
		date: normalizedDate,
		paid: existingTransaction?.paid,
		walletFrom: undefined,
		walletTo: undefined
	}

	if (entryType.value === "income") {
		baseData.walletTo = entryWalletId.value
	}

	if (entryType.value === "expense") {
		baseData.walletFrom = entryWalletId.value
	}

	if (entryType.value === "transfer") {
		baseData.walletFrom = entryWalletId.value
		baseData.walletTo = entryTargetWalletId.value
	}

	if (entryType.value === "adjustment") {
		if (entryAdjustmentDirection.value === "increase") {
			baseData.walletTo = entryWalletId.value
		} else {
			baseData.walletFrom = entryWalletId.value
		}
	}

	isSubmitting.value = true

	try {
		if (editingTransactionId.value) {
			await transactionStore.updateTransaction(editingTransactionId.value, baseData)
		} else {
			await transactionStore.createEntryTransaction({
				type: entryType.value,
				periodId: selectedPeriodId.value,
				description: entryDescription.value,
				category: entryType.value === "transfer" ? TRANSFER_CATEGORY_LABEL : baseData.category,
				categoryId: entryType.value === "transfer" ? TRANSFER_CATEGORY_ID : baseData.categoryId,
				walletId: entryWalletId.value,
				targetWalletId: entryType.value === "transfer" ? entryTargetWalletId.value : undefined,
				amount: entryAmount.value,
				date: normalizedDate
			})
		}

		closeEntryModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeleteTransactionModal(transaction) {
	deleteTransactionId.value = transaction.id
}

function closeDeleteTransactionModal() {
	deleteTransactionId.value = ""
}

async function confirmDeleteTransaction() {
	if (!deleteTransactionId.value) return

	isSubmitting.value = true

	try {
		await transactionStore.deleteTransaction(deleteTransactionId.value)
		closeDeleteTransactionModal()
	} finally {
		isSubmitting.value = false
	}
}

async function toggleTransactionPaid(transaction) {
	isSubmitting.value = true

	try {
		await transactionStore.updateTransaction(transaction.id, {
			paid: !transaction.paid
		})
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
<div class="app-page">
	<h1>Financas</h1>

	<div v-if="!authReady">
		Carregando autenticacao...
	</div>

	<template v-else-if="!user">
		<button :disabled="isSubmitting" @click="handleLogin">
			Entrar com Google
		</button>
	</template>

	<template v-else-if="!isDataReady">
		<div>Conectando dados online...</div>
	</template>

	<template v-else>
		<div class="topbar">
			<div>Logado: {{ user.email }}</div>

			<div class="toolbar">
				<select v-model.number="selectedYear">
					<option v-for="year in availableYears" :key="year" :value="year">
						{{ year }}
					</option>
				</select>

				<select v-model.number="selectedMonth">
					<option v-for="month in availableMonths" :key="month.value" :value="month.value">
						{{ month.label }}
					</option>
				</select>

				<button :disabled="isSubmitting" @click="openPeriodModal">
					+
				</button>

				<button :disabled="isSubmitting || !selectedPeriod" @click="openDeletePeriodModal">
					Remover mes
				</button>

				<button :disabled="isSubmitting" @click="handleLogout">
					Sair
				</button>
			</div>
		</div>

		<div class="tabs">
			<button
				:class="{ active: currentPage === 'dashboard' }"
				@click="currentPage = 'dashboard'"
			>
				Principal
			</button>

			<button
				:class="{ active: currentPage === 'wallets' }"
				@click="currentPage = 'wallets'"
			>
				Carteiras
			</button>

			<button
				:class="{ active: currentPage === 'categories' }"
				@click="currentPage = 'categories'"
			>
				Categorias
			</button>
		</div>

		<div v-if="appError" class="error-box">
			{{ appError }}
		</div>

		<section v-if="currentPage === 'dashboard'" class="page-section">
			<div class="toolbar">
				<button :disabled="isSubmitting || !selectedPeriod" @click="openCreateEntryModal">
					Nova entrada
				</button>
			</div>

			<div class="wallet-summary-list">
				<div
					v-for="wallet in dashboardWallets"
					:key="wallet.id"
					class="wallet-summary-row"
				>
					<span>{{ wallet.name }}</span>
					<strong>{{ wallet.balance }}</strong>
				</div>
			</div>

			<div class="transaction-sections">
				<div
					v-for="group in groupedTransactions"
					:key="group.id"
					class="transaction-section"
				>
					<div class="section-header">
						<h2>{{ group.title }}</h2>
						<div v-if="false" class="section-actions">
							<button
								class="icon-button"
								:disabled="isSubmitting || !canMoveCategory(group.id, 'up')"
								@click="moveCategory(group.id, 'up')"
							>
								↑
							</button>
							<button
								class="icon-button"
								:disabled="isSubmitting || !canMoveCategory(group.id, 'down')"
								@click="moveCategory(group.id, 'down')"
							>
								↓
							</button>
						</div>
					</div>

					<div class="entry-list">
						<div class="entry-list-head">
							<span>Descricao</span>
							<span>Tipo</span>
							<span>Carteira</span>
							<span>Data</span>
							<span>Valor</span>
							<span>Pago</span>
							<span>Acoes</span>
						</div>

						<div v-if="group.items.length === 0" class="entry-empty">
							Sem entradas
						</div>

						<div
							v-for="transaction in group.items"
							:key="transaction.id"
							class="entry-row"
							:class="{ 'paid-row': transaction.paid }"
						>
							<span>{{ transaction.description || transaction.type }}</span>
							<span>{{ transaction.type }}</span>
							<span>{{ getTransactionWalletLabel(transaction) }}</span>
							<span>{{ formatDateInput(transaction.date) }}</span>
							<span>{{ transaction.amount }}</span>
							<span>
								<input
									type="checkbox"
									:checked="transaction.paid"
									:disabled="isSubmitting"
									@change="toggleTransactionPaid(transaction)"
								/>
							</span>
							<span class="row-actions">
								<button :disabled="isSubmitting" @click="openEditEntryModal(transaction)">
									Editar
								</button>

								<button
									class="danger-button"
									:disabled="isSubmitting"
									@click="openDeleteTransactionModal(transaction)"
								>
									Excluir
								</button>
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section v-if="currentPage === 'wallets'" class="page-section">
			<div class="toolbar">
				<input v-model="walletName" placeholder="Nome" />
				<input v-model.number="walletBalance" type="number" placeholder="Saldo inicial" />

				<button :disabled="isSubmitting" @click="addWallet">
					Criar carteira
				</button>
			</div>

			<div class="simple-list">
				<div v-for="wallet in walletStore.wallets" :key="wallet.id" class="simple-list-row">
					<span>{{ wallet.name }}</span>
					<span>{{ getWalletBalanceForPeriod(wallet) }}</span>
					<span class="row-actions">
						<button :disabled="isSubmitting" @click="openAdjustmentModal(wallet)">
							Ajustar saldo
						</button>

						<button
							class="danger-button"
							:disabled="isSubmitting"
							@click="openDeleteWalletModal(wallet)"
						>
							Excluir
						</button>
					</span>
				</div>
			</div>
		</section>

		<section v-if="currentPage === 'categories'" class="page-section">
			<div class="toolbar">
				<button :disabled="isSubmitting" @click="openCategoryModal()">
					Criar categoria
				</button>
			</div>

			<div class="simple-list">
				<div
					v-for="category in categoryStore.manageableCategories"
					:key="category.id"
					class="simple-list-row"
					:class="{ 'drag-over-row': dragOverCategoryId === category.id }"
					@dragover="handleCategoryDragOver(category.id, $event)"
					@drop.prevent="handleCategoryDrop(category.id)"
				>
					<span>{{ category.name }}</span>
					<span class="row-actions">
						<button
							class="icon-button"
							:disabled="isSubmitting"
							draggable="true"
							title="Arrastar categoria"
							@dragstart="handleCategoryDragStart(category.id, $event)"
							@dragend="handleCategoryDragEnd"
						>
							::
						</button>

						<button :disabled="isSubmitting" @click="openCategoryModal(category)">
							Editar
						</button>

						<button
							class="danger-button"
							:disabled="isSubmitting"
							@click="openDeleteCategoryModal(category)"
						>
							Excluir
						</button>
					</span>
				</div>
			</div>
		</section>
	</template>

	<div v-if="adjustingWalletId" class="modal-backdrop">
		<div class="modal">
			<h3>Ajustar saldo</h3>

			<input v-model.number="adjustmentBalance" type="number" placeholder="Novo saldo" />
			<textarea v-model="adjustmentDescription" rows="4" placeholder="Descricao do ajuste" />

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="saveAdjustment">
					Salvar ajuste
				</button>

				<button :disabled="isSubmitting" @click="closeAdjustmentModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="isCategoryModalOpen" class="modal-backdrop">
		<div class="modal">
			<h3>{{ editingCategoryId ? "Editar categoria" : "Criar categoria" }}</h3>

			<input v-model="categoryName" placeholder="Nome da categoria" />

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="saveCategory">
					Salvar
				</button>

				<button :disabled="isSubmitting" @click="closeCategoryModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="isPeriodModalOpen" class="modal-backdrop">
		<div class="modal">
			<h3>Criar mes</h3>

			<input v-model.number="periodModalYear" type="number" placeholder="Ano" />

			<select v-model.number="periodModalMonth">
				<option v-for="month in monthOptions" :key="month.value" :value="month.value">
					{{ month.label }}
				</option>
			</select>

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="savePeriod">
					Salvar
				</button>

				<button :disabled="isSubmitting" @click="closePeriodModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="isEntryModalOpen" class="modal-backdrop">
		<div class="modal">
			<h3>{{ editingTransactionId ? "Editar entrada" : "Nova entrada" }}</h3>

			<input v-model="entryDescription" placeholder="Descricao" />

			<select v-model="entryType">
				<option value="expense">Despesa</option>
				<option value="income">Entrada</option>
				<option value="transfer">Transferencia</option>
				<option v-if="editingTransactionId" value="adjustment">Ajuste</option>
			</select>

			<select v-if="entryType !== 'adjustment' && entryType !== 'transfer'" v-model="entryCategoryId">
				<option disabled value="">Selecione a categoria</option>
				<option
					v-for="category in categoryStore.entryCategories"
					:key="category.id"
					:value="category.id"
				>
					{{ category.name }}
				</option>
			</select>

			<select v-model="entryWalletId">
				<option disabled value="">Selecione a carteira</option>
				<option
					v-for="wallet in walletStore.wallets"
					:key="wallet.id"
					:value="wallet.id"
				>
					{{ wallet.name }}
				</option>
			</select>

			<select v-if="entryType === 'transfer'" v-model="entryTargetWalletId">
				<option disabled value="">Selecione a carteira de destino</option>
				<option
					v-for="wallet in walletStore.wallets"
					:key="wallet.id"
					:value="wallet.id"
				>
					{{ wallet.name }}
				</option>
			</select>

			<select v-if="entryType === 'adjustment'" v-model="entryAdjustmentDirection">
				<option value="increase">Aumenta saldo</option>
				<option value="decrease">Diminui saldo</option>
			</select>

			<input
				v-model="entryDate"
				type="date"
				:min="entryMinDate"
				:max="entryMaxDate"
			/>
			<input v-model.number="entryAmount" type="number" placeholder="Valor" />

			<div v-if="entryFormError" class="error-text">
				{{ entryFormError }}
			</div>

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="saveEntry">
					Salvar
				</button>

				<button :disabled="isSubmitting" @click="closeEntryModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deleteWalletId" class="modal-backdrop">
		<div class="modal">
			<h3>Excluir carteira</h3>
			<p>Tem certeza que deseja excluir esta carteira?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteWallet">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeleteWalletModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deleteCategoryId" class="modal-backdrop">
		<div class="modal">
			<h3>Excluir categoria</h3>
			<p>Tem certeza que deseja excluir esta categoria?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteCategory">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeleteCategoryModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deleteTransactionId" class="modal-backdrop">
		<div class="modal">
			<h3>Excluir entrada</h3>
			<p>Tem certeza que deseja excluir esta entrada?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteTransaction">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeleteTransactionModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deletePeriodId" class="modal-backdrop">
		<div class="modal">
			<h3>Excluir mes</h3>
			<p>Tem certeza que deseja excluir este mes e todas as entradas dele?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeletePeriod">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeletePeriodModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>
</div>
</template>

<style scoped>
.app-page {
	display: grid;
	gap: 16px;
	padding: 24px;
	max-width: 1180px;
	margin: 0 auto;
	text-align: left;
}

.topbar,
.toolbar,
.tabs,
.row-actions {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	align-items: center;
}

.page-section,
.transaction-section,
.simple-list,
.wallet-summary-list,
.error-box {
	display: grid;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--bg);
	box-shadow: var(--shadow);
}

.wallet-summary-row,
.simple-list-row,
.entry-list-head,
.entry-row {
	display: grid;
	grid-template-columns: minmax(140px, 2fr) minmax(100px, 1fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(100px, 1fr) 80px minmax(140px, 1.4fr);
	gap: 12px;
	align-items: center;
}

.wallet-summary-row {
	grid-template-columns: minmax(160px, 2fr) minmax(120px, 1fr);
}

.simple-list-row {
	grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) minmax(180px, 1.6fr);
}

.entry-list {
	display: grid;
	gap: 8px;
}

.entry-list-head {
	font-weight: 700;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--border);
}

.entry-row,
.wallet-summary-row,
.simple-list-row {
	padding: 8px 0;
	border-bottom: 1px solid var(--border);
}

.entry-row:last-child,
.wallet-summary-row:last-child,
.simple-list-row:last-child {
	border-bottom: 0;
}

.paid-row {
	background: rgba(34, 197, 94, 0.14);
	border-radius: 8px;
	padding-inline: 8px;
}

.entry-empty {
	padding: 8px 0;
}

.transaction-sections {
	display: grid;
	gap: 16px;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--border);
}

.section-header h2 {
	margin: 0;
}

.section-actions {
	display: flex;
	gap: 6px;
}

.icon-button {
	width: 32px;
	height: 32px;
	padding: 0;
	display: inline-grid;
	place-items: center;
	border-radius: 999px;
}

.drag-over-row {
	outline: 2px dashed var(--accent-border);
	outline-offset: 6px;
	border-radius: 10px;
}

input,
textarea,
button,
select {
	font: inherit;
}

input,
textarea,
select {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--border);
	border-radius: 10px;
	box-sizing: border-box;
	background: var(--bg);
	color: var(--text);
}

button {
	padding: 10px 14px;
	border: 0;
	border-radius: 10px;
	background: var(--accent);
	color: white;
	cursor: pointer;
}

button.active {
	outline: 2px solid var(--accent-border);
}

button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.danger-button {
	background: #c2410c;
}

.error-text {
	color: #b91c1c;
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: grid;
	place-items: center;
	padding: 20px;
}

.modal {
	width: min(100%, 460px);
	display: grid;
	gap: 16px;
	padding: 20px;
	border-radius: 16px;
	background: var(--bg);
	box-shadow: var(--shadow);
}
</style>
