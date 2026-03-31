<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import BottomTabs from "@/components/navigation/BottomTabs.vue"
import ConfiguracoesView from "@/views/ConfiguracoesView.vue"
import ResumoView from "@/views/ResumoView.vue"
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
import { saveThemePreference, subscribeThemePreference } from "@/services/themePreferences"

const walletStore = useWalletStore()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const periodStore = usePeriodStore()

const user = ref(null)
const authReady = ref(false)
const isSubmitting = ref(false)
const currentPage = ref("dashboard")
const theme = ref("light")

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

const walletName = ref("")
const walletColor = ref("#aa3bff")
const walletBalance = ref(0)
const walletBalanceInput = ref("")
const isWalletModalOpen = ref(false)
const editingWalletId = ref("")

const adjustingWalletId = ref("")
const adjustmentBalance = ref(0)
const adjustmentBalanceInput = ref("")
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
const entryAmountInput = ref("")
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
	{ value: 1, label: "Janeiro" },
	{ value: 2, label: "Fevereiro" },
	{ value: 3, label: "Março" },
	{ value: 4, label: "Abril" },
	{ value: 5, label: "Maio" },
	{ value: 6, label: "Junho" },
	{ value: 7, label: "Julho" },
	{ value: 8, label: "Agosto" },
	{ value: 9, label: "Setembro" },
	{ value: 10, label: "Outubro" },
	{ value: 11, label: "Novembro" },
	{ value: 12, label: "Dezembro" }
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
const isEditingWallet = computed(() => Boolean(editingWalletId.value))

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
})

const entryMinDate = computed(() => formatDateValue(new Date(selectedYear.value, selectedMonth.value - 1, 1)))
const entryMaxDate = computed(() => formatDateValue(new Date(selectedYear.value, selectedMonth.value, 0)))

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
		.map(category => {
			const items = filteredTransactions.value.filter(transaction =>
				transaction.categoryId
					? transaction.categoryId === category.id
					: transaction.category === category.name
			)

			return {
				id: category.id,
				title: category.name,
				items
			}
		})
		.filter(group =>
			(group.id !== TRANSFER_CATEGORY_ID && group.id !== BALANCE_ADJUSTMENT_CATEGORY_ID) ||
			group.items.length > 0
		)
})

const dashboardWallets = computed(() =>
	walletStore.wallets.map(wallet => ({
		...wallet,
		balance: getWalletBalanceForPeriod(wallet)
	}))
)

const totalWalletBalance = computed(() =>
	dashboardWallets.value.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0)
)

let stopAuthListener = null
let unsubscribeThemePreference = null

const navigationTabs = [
	{ value: "dashboard", label: "Home", icon: "home" },
	{ value: "wallets", label: "Carteiras", icon: "wallet" },
	{ value: "categories", label: "Categorias", icon: "grid" },
	{ value: "settings", label: "Configurações", icon: "settings" }
]

onMounted(() => {
	applyTheme("light")
	window.addEventListener("keydown", handleModalKeydown)

	stopAuthListener = onUserChanged(currentUser => {
		user.value = currentUser
		authReady.value = true

		if (unsubscribeThemePreference) {
			unsubscribeThemePreference()
			unsubscribeThemePreference = null
		}

		if (currentUser) {
			unsubscribeThemePreference = subscribeThemePreference(
				nextTheme => {
					applyTheme(nextTheme)
				},
				() => {
					applyTheme("light")
				}
			)
			walletStore.startWalletsSync()
			transactionStore.startTransactionsSync()
			categoryStore.startCategoriesSync()
			periodStore.startPeriodsSync()
			return
		}

		applyTheme("light")
		walletStore.clearWallets()
		transactionStore.clearTransactions()
		categoryStore.clearCategories()
		periodStore.clearPeriods()
		closeAllModals()
	})
})

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleModalKeydown)

	if (unsubscribeThemePreference) {
		unsubscribeThemePreference()
	}

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

watch(entryType, nextType => {
	if (nextType === "income") {
		entryCategoryId.value = getIncomeEntryCategoryId()
		return
	}

	if (
		nextType === "expense" &&
		(!entryCategoryId.value || entryCategoryId.value === getIncomeEntryCategoryId())
	) {
		entryCategoryId.value = getPreferredEntryCategoryId()
	}
})

function closeAllModals() {
	closeWalletModal()
	closeAdjustmentModal()
	closeCategoryModal()
	closeEntryModal()
	closeDeleteWalletModal()
	closeDeleteCategoryModal()
	closeDeleteTransactionModal()
	closePeriodModal()
	closeDeletePeriodModal()
}

function formatDateDisplay(date) {
	const current = new Date(date)
	const day = `${current.getDate()}`.padStart(2, "0")
	const month = `${current.getMonth() + 1}`.padStart(2, "0")
	return `${day}/${month}`
}

function applyTheme(nextTheme) {
	theme.value = nextTheme
	document.documentElement.setAttribute("data-theme", nextTheme)
}

async function updateTheme(nextTheme) {
	applyTheme(nextTheme)

	if (!user.value) return

	try {
		await saveThemePreference(nextTheme)
	} catch (error) {
		console.error("Failed to save theme preference", error)
	}
}

function handleFabClick() {
	if (currentPage.value !== "dashboard" || !selectedPeriod.value || isSubmitting.value) return

	openCreateEntryModal()
}

function formatDateValue(date) {
	const current = new Date(date)
	const year = current.getFullYear()
	const month = `${current.getMonth() + 1}`.padStart(2, "0")
	const day = `${current.getDate()}`.padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatCurrency(value) {
	return currencyFormatter.format(Number(value ?? 0))
}

function normalizeCurrencyText(value) {
	const raw = String(value ?? "").replace("R$ ", "")
	const sanitized = raw.replace(/[^\d,]/g, "")
	const firstCommaIndex = sanitized.indexOf(",")

	if (firstCommaIndex < 0) {
		const integerOnly = sanitized.replace(/^0+(?=\d)/, "")
		return integerOnly
	}

	const integerPart = sanitized.slice(0, firstCommaIndex).replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "")
	const decimalPart = sanitized.slice(firstCommaIndex + 1).replace(/[^\d]/g, "").slice(0, 2)

	return `${integerPart || "0"},${decimalPart}`
}

function parseCurrencyInput(value) {
	const normalized = normalizeCurrencyText(value)
	const [integerPart = "0", decimalPart = ""] = normalized.split(",")
	const integerValue = Number(integerPart || "0")
	const fractionValue = Number(decimalPart.padEnd(2, "0") || "0")
	return integerValue + (fractionValue / 100)
}

function getCurrencyField(field) {
	switch (field) {
		case "wallet":
			return { model: walletBalance, input: walletBalanceInput }
		case "adjustment":
			return { model: adjustmentBalance, input: adjustmentBalanceInput }
		case "entry":
			return { model: entryAmount, input: entryAmountInput }
		default:
			return null
	}
}

function syncCurrencyInput(model, input, event) {
	const target = event?.target instanceof HTMLInputElement ? event.target : null
	const rawValue = target?.value ?? ""
	const normalizedInput = normalizeCurrencyText(rawValue)
	const parsedValue = parseCurrencyInput(normalizedInput)
	const displayValue = normalizedInput ? `R$ ${normalizedInput}` : "R$ "

	model.value = parsedValue
	input.value = displayValue

	if (target && target.value !== displayValue) {
		target.value = displayValue
	}
}

function syncCurrencyFieldInput(field, event) {
	const currencyField = getCurrencyField(field)

	if (!currencyField) return

	syncCurrencyInput(currencyField.model, currencyField.input, event)
}

function setCurrencyInput(model, input, value) {
	model.value = Number(value ?? 0)
	input.value = formatCurrency(model.value)
}

function parseDateInput(value) {
	if (!value) return null

	const date = new Date(`${value}T12:00:00`)
	return Number.isNaN(date.getTime()) ? null : date
}

function buildDefaultEntryDate() {
	const now = new Date()
	const currentDay = now.getDate()
	const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate()

	return new Date(
		selectedYear.value,
		selectedMonth.value - 1,
		Math.min(currentDay, lastDay),
		12,
		0,
		0
	)
}

function getActiveModalActions() {
	if (isWalletModalOpen.value) {
		return {
			confirm: addWallet,
			cancel: closeWalletModal
		}
	}

	if (adjustingWalletId.value) {
		return {
			confirm: saveAdjustment,
			cancel: closeAdjustmentModal
		}
	}

	if (isCategoryModalOpen.value) {
		return {
			confirm: saveCategory,
			cancel: closeCategoryModal
		}
	}

	if (isPeriodModalOpen.value) {
		return {
			confirm: savePeriod,
			cancel: closePeriodModal
		}
	}

	if (isEntryModalOpen.value) {
		return {
			confirm: saveEntry,
			cancel: closeEntryModal
		}
	}

	if (deleteWalletId.value) {
		return {
			confirm: confirmDeleteWallet,
			cancel: closeDeleteWalletModal
		}
	}

	if (deleteCategoryId.value) {
		return {
			confirm: confirmDeleteCategory,
			cancel: closeDeleteCategoryModal
		}
	}

	if (deleteTransactionId.value) {
		return {
			confirm: confirmDeleteTransaction,
			cancel: closeDeleteTransactionModal
		}
	}

	if (deletePeriodId.value) {
		return {
			confirm: confirmDeletePeriod,
			cancel: closeDeletePeriodModal
		}
	}

	return null
}

function handleModalKeydown(event) {
	if (isSubmitting.value) return

	const modalActions = getActiveModalActions()

	if (!modalActions) return

	if (event.key === "Escape") {
		event.preventDefault()
		modalActions.cancel()
		return
	}

	if (event.key !== "Enter" || event.shiftKey) return

	const activeTag = document.activeElement?.tagName

	if (activeTag === "TEXTAREA") return

	event.preventDefault()
	void modalActions.confirm()
}

function handleModalEnter(action, event) {
	if (isSubmitting.value) return

	if (event?.target instanceof HTMLTextAreaElement) return

	event?.preventDefault?.()

	switch (action) {
		case "wallet":
			void addWallet()
			return
		case "adjustment":
			void saveAdjustment()
			return
		case "category":
			void saveCategory()
			return
		case "period":
			void savePeriod()
			return
		case "entry":
			void saveEntry()
			return
		case "delete-wallet":
			void confirmDeleteWallet()
			return
		case "delete-category":
			void confirmDeleteCategory()
			return
		case "delete-transaction":
			void confirmDeleteTransaction()
			return
		case "delete-period":
			void confirmDeletePeriod()
			return
		default:
			return
	}
}

function handleCurrencyFocus(model, input, event) {
	const target = event?.target

	if (model.value === 0) {
		input.value = "R$ "

		if (target instanceof HTMLInputElement) {
			target.value = "R$ "
			requestAnimationFrame(() => {
				target.setSelectionRange(target.value.length, target.value.length)
			})
		}
	}
}

function handleCurrencyFieldFocus(field, event) {
	const currencyField = getCurrencyField(field)

	if (!currencyField) return

	handleCurrencyFocus(currencyField.model, currencyField.input, event)
}

function handleCurrencyBlur(model, input) {
	setCurrencyInput(model, input, model.value)
}

function handleCurrencyFieldBlur(field) {
	const currencyField = getCurrencyField(field)

	if (!currencyField) return

	handleCurrencyBlur(currencyField.model, currencyField.input)
}

function handleCurrencyKeydown(event) {
	const allowedKeys = [
		"Backspace",
		"Delete",
		"Tab",
		"Enter",
		"Escape",
		"ArrowLeft",
		"ArrowRight",
		"ArrowUp",
		"ArrowDown",
		"Home",
		"End"
	]

	if (
		event.ctrlKey ||
		event.metaKey ||
		allowedKeys.includes(event.key) ||
		/^\d$/.test(event.key) ||
		event.key === ","
	) {
		return
	}

	event.preventDefault()
}

function hasText(value) {
	return String(value ?? "").trim().length > 0
}

function isAdjustmentBalanceMissing() {
	return adjustmentBalance.value <= 0
}

function isWalletNameMissing() {
	return !hasText(walletName.value)
}

function isWalletColorMissing() {
	return !/^#[\da-fA-F]{6}$/.test(walletColor.value)
}

function isWalletBalanceMissing() {
	return walletBalance.value <= 0
}

function isAdjustmentDescriptionMissing() {
	return !hasText(adjustmentDescription.value)
}

function isCategoryNameMissing() {
	return !hasText(categoryName.value)
}

function isPeriodYearMissing() {
	return !Number.isFinite(periodModalYear.value) || periodModalYear.value <= 0
}

function isEntryCategoryMissing() {
	return entryType.value !== "adjustment" && entryType.value !== "transfer" && !entryCategoryId.value
}

function isEntryWalletMissing() {
	return !entryWalletId.value
}

function isEntryTargetWalletMissing() {
	return entryType.value === "transfer" && !entryTargetWalletId.value
}

function isEntryDateMissing() {
	return !entryDate.value
}

function isEntryAmountMissing() {
	return entryAmount.value <= 0
}

function isEntryDescriptionMissing() {
	return !hasText(entryDescription.value)
}

setCurrencyInput(walletBalance, walletBalanceInput, 0)
setCurrencyInput(adjustmentBalance, adjustmentBalanceInput, 0)
setCurrencyInput(entryAmount, entryAmountInput, 0)

function getPreferredEntryCategoryId() {
	return (
		categoryStore.entryCategories.find(category => category.name === "Despesas Fixas")?.id ||
		categoryStore.entryCategories[0]?.id ||
		""
	)
}

function getIncomeEntryCategoryId() {
	return categoryStore.entryCategories.find(category => category.name === "Entradas")?.id || ""
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

function getWalletColor(walletId) {
	return walletStore.getWallet(walletId)?.color || "var(--color-primary)"
}

function getTransactionWallets(transaction) {
	if (transaction.type === "income") {
		return [{ id: transaction.walletTo, name: getWalletName(transaction.walletTo), color: getWalletColor(transaction.walletTo) }]
	}

	if (transaction.type === "expense") {
		return [{ id: transaction.walletFrom, name: getWalletName(transaction.walletFrom), color: getWalletColor(transaction.walletFrom) }]
	}

	if (transaction.type === "transfer") {
		return [
			{ id: transaction.walletFrom, name: getWalletName(transaction.walletFrom), color: getWalletColor(transaction.walletFrom) },
			{ id: transaction.walletTo, name: getWalletName(transaction.walletTo), color: getWalletColor(transaction.walletTo) }
		]
	}

	const fallbackWalletId = transaction.walletTo || transaction.walletFrom
	return [{ id: fallbackWalletId, name: getWalletName(fallbackWalletId), color: getWalletColor(fallbackWalletId) }]
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

	const sourcePeriod = selectedPeriod.value
	const newPeriodId = buildPeriodId(periodModalYear.value, periodModalMonth.value)

	isSubmitting.value = true

	try {
		const openingBalances = sourcePeriod
			? Object.fromEntries(
				walletStore.wallets.map(wallet => [
					wallet.id,
					getWalletBalanceForPeriodId(wallet, sourcePeriod.id)
				])
			)
			: Object.fromEntries(
				walletStore.wallets.map(wallet => [wallet.id, wallet.initialBalance])
			)

		await periodStore.ensurePeriod(periodModalYear.value, periodModalMonth.value, openingBalances)

		if (sourcePeriod) {
			for (const transaction of getTransactionsForPeriod(sourcePeriod.id)) {
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
	if (isWalletColorMissing()) return
	if (!isEditingWallet.value && isWalletBalanceMissing()) return

	isSubmitting.value = true

	try {
		if (isEditingWallet.value) {
			await walletStore.updateWallet(editingWalletId.value, {
				name: trimmedName,
				color: walletColor.value
			})
		} else {
			await walletStore.createWallet(trimmedName, walletBalance.value, walletColor.value)
		}

		closeWalletModal()
	} finally {
		isSubmitting.value = false
	}
}

function openWalletModal(wallet = null) {
	isWalletModalOpen.value = true
	editingWalletId.value = wallet?.id ?? ""
	walletName.value = wallet?.name ?? ""
	walletColor.value = wallet?.color ?? "#aa3bff"
	setCurrencyInput(walletBalance, walletBalanceInput, wallet?.initialBalance ?? 0)
}

function closeWalletModal() {
	isWalletModalOpen.value = false
	editingWalletId.value = ""
	walletName.value = ""
	walletColor.value = "#aa3bff"
	setCurrencyInput(walletBalance, walletBalanceInput, 0)
}

function openAdjustmentModal(wallet) {
	adjustingWalletId.value = wallet.id
	setCurrencyInput(adjustmentBalance, adjustmentBalanceInput, getWalletBalanceForPeriod(wallet))
	adjustmentDescription.value = ""
}

function closeAdjustmentModal() {
	adjustingWalletId.value = ""
	setCurrencyInput(adjustmentBalance, adjustmentBalanceInput, 0)
	adjustmentDescription.value = ""
}

async function saveAdjustment() {
	const wallet = walletStore.getWallet(adjustingWalletId.value)

	if (!wallet) return
	if (isAdjustmentBalanceMissing() || isAdjustmentDescriptionMissing()) return

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
	entryCategoryId.value = getPreferredEntryCategoryId()
	entryWalletId.value = walletStore.wallets[0]?.id ?? ""
	entryTargetWalletId.value = ""
	setCurrencyInput(entryAmount, entryAmountInput, 0)
	entryDate.value = formatDateValue(buildDefaultEntryDate())
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
	setCurrencyInput(entryAmount, entryAmountInput, transaction.amount)
	entryDate.value = formatDateValue(transaction.date)
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
	const normalizedDate = parseDateInput(entryDate.value)

	entryFormError.value = ""

	if (isEntryDescriptionMissing()) return
	if (!entryWalletId.value || entryAmount.value <= 0) return
	if (!normalizedDate) {
		entryFormError.value = "Selecione uma data valida."
		return
	}
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
		<h1 class="tittle">Minhas Finanças</h1>

		<div v-if="!authReady">
			Carregando autenticação...
		</div>

		<template v-else-if="!user">
			<ConfiguracoesView :theme="theme" :is-authenticated="false" :is-submitting="isSubmitting"
				@update-theme="updateTheme" @login="handleLogin" />
		</template>

		<template v-else-if="!isDataReady">
			<div>Conectando dados online...</div>
		</template>

		<template v-else>
			<section v-if="currentPage === 'dashboard'" class="filter-card">
				<div class="filter-row">
					<div class="filter-selects">
						<select v-model.number="selectedYear" class="year-filter">
							<option v-for="year in availableYears" :key="year" :value="year">
								{{ year }}
							</option>
						</select>

						<select v-model.number="selectedMonth">
							<option v-for="month in availableMonths" :key="month.value" :value="month.value">
								{{ month.label }}
							</option>
						</select>
					</div>

					<div class="filter-spacer" />

					<div class="filter-actions">
						<button :disabled="isSubmitting" @click="openPeriodModal">
							+
						</button>

						<button class="danger-button month-remove-button" :disabled="isSubmitting || !selectedPeriod"
							@click="openDeletePeriodModal">
							-
						</button>
					</div>
				</div>
			</section>

			<BottomTabs :tabs="navigationTabs" :current-tab="currentPage" @select="currentPage = $event" />

			<div v-if="appError" class="error-box">
				{{ appError }}
			</div>

			<ResumoView v-if="currentPage === 'dashboard'" :show-fab="true" @fab-click="handleFabClick">
				<div class="wallet-summary-card">
					<div class="wallet-summary-hero">
						<span class="summary-eyebrow">Saldo total</span>
						<strong class="wallet-summary-total">{{ formatCurrency(totalWalletBalance) }}</strong>
					</div>

					<div class="wallet-summary-list">
						<div v-for="wallet in dashboardWallets" :key="wallet.id" class="wallet-summary-row">
							<div class="wallet-summary-meta">
								<span class="wallet-summary-dot"
									:style="{ background: wallet.color || 'var(--color-primary)' }" />
								<span>{{ wallet.name }}</span>
							</div>
							<strong>{{ formatCurrency(wallet.balance) }}</strong>
						</div>
					</div>
				</div>

				<div class="transaction-sections">
					<div v-for="group in groupedTransactions" :key="group.id" class="transaction-section">
						<div class="section-header">
							<h2>{{ group.title }}</h2>
							<div v-if="false" class="section-actions">
								<button class="icon-button" :disabled="isSubmitting || !canMoveCategory(group.id, 'up')"
									@click="moveCategory(group.id, 'up')">
									?
								</button>
								<button class="icon-button"
									:disabled="isSubmitting || !canMoveCategory(group.id, 'down')"
									@click="moveCategory(group.id, 'down')">
									?
								</button>
							</div>
						</div>

						<div class="entry-list">
							<div class="entry-list-head">
						<span class="descTittle">Descrição</span>
						<span class="centerTittle">Carteira</span>
						<span class="centerTittle">Data</span>
						<span class="centerTittle">Valor</span>
						<span class="centerTittle">Pago</span>
						<span class="actionTittle">Ações</span>
					</div>
							<div v-if="group.items.length === 0" class="entry-empty">
								Sem entradas
							</div>

							<div v-for="transaction in group.items" :key="transaction.id" class="entry-row"
								:class="{ 'paid-row': transaction.paid }">
								<span>{{ transaction.description || transaction.type }}</span>
								<span class="entry-wallets">
									<template v-for="(wallet, index) in getTransactionWallets(transaction)"
										:key="`${transaction.id}-${wallet.id || index}`">
										<span class="wallet-summary-meta entry-wallet-meta">
											<span class="wallet-summary-dot" :style="{ background: wallet.color }" />
											<span>{{ wallet.name }}</span>
										</span>
										<span v-if="transaction.type === 'transfer' && index === 0"
											class="entry-wallet-arrow">
											?
										</span>
									</template>
								</span>
								<span>{{ formatDateDisplay(transaction.date) }}</span>
								<span>{{ formatCurrency(transaction.amount) }}</span>
								<span>
									<input type="checkbox" :checked="transaction.paid" :disabled="isSubmitting"
										@change="toggleTransactionPaid(transaction)" />
								</span>
								<span class="row-actions">
									<button :disabled="isSubmitting" @click="openEditEntryModal(transaction)">
										<span class="button-icon button-icon-edit" >📝</span>
									</button>

									<button class="danger-button" :disabled="isSubmitting"
										@click="openDeleteTransactionModal(transaction)">
										<span class="button-icon button-icon-delete" aria-hidden="true">❌</span>
									</button>
								</span>
							</div>
						</div>
					</div>
				</div>
			</ResumoView>

			<section v-if="currentPage === 'wallets'" class="page-section">
				<div class="toolbar">
					<button :disabled="isSubmitting" @click="openWalletModal">
						<span class="button-icon button-icon-plus" aria-hidden="true" />
						<span>Criar carteira</span>
					</button>
				</div>

				<div class="simple-list">
					<div v-for="wallet in walletStore.wallets" :key="wallet.id" class="simple-list-row">
						<span>{{ wallet.name }}</span>
						<span>{{ formatCurrency(getWalletBalanceForPeriod(wallet)) }}</span>
						<span class="row-actions">
							<button :disabled="isSubmitting" @click="openWalletModal(wallet)">
								<span class="button-icon button-icon-edit" aria-hidden="true">📝</span>
							</button>

							<button :disabled="isSubmitting" @click="openAdjustmentModal(wallet)">
								<span class="button-icon button-icon-adjust" aria-hidden="true">✏️</span>
							</button>

							<button class="danger-button" :disabled="isSubmitting"
								@click="openDeleteWalletModal(wallet)">
								<span class="button-icon button-icon-delete" aria-hidden="true">❌</span>
							</button>
						</span>
					</div>
				</div>
			</section>

			<section v-if="currentPage === 'categories'" class="page-section">
				<div class="toolbar">
					<button :disabled="isSubmitting" @click="openCategoryModal()">
						<span class="button-icon button-icon-plus" aria-hidden="true" />
						<span>Criar categoria</span>
					</button>
				</div>

				<div class="simple-list">
					<div v-for="category in categoryStore.manageableCategories" :key="category.id"
						class="simple-list-row" :class="{ 'drag-over-row': dragOverCategoryId === category.id }"
						@dragover="handleCategoryDragOver(category.id, $event)"
						@drop.prevent="handleCategoryDrop(category.id)">
						<span>{{ category.name }}</span>
						<span class="row-actions">
							<button class="icon-button" :disabled="isSubmitting" draggable="true"
								title="Arrastar categoria" @dragstart="handleCategoryDragStart(category.id, $event)"
								@dragend="handleCategoryDragEnd">
								<span>✊</span>
							</button>

							<button :disabled="isSubmitting" @click="openCategoryModal(category)">
								<span class="button-icon button-icon-edit" aria-hidden="true">📝</span>
							</button>

							<button class="danger-button" :disabled="isSubmitting"
								@click="openDeleteCategoryModal(category)">
								<span class="button-icon button-icon-delete" aria-hidden="true">❌</span>
							</button>
						</span>
					</div>
				</div>
			</section>

			<ConfiguracoesView v-if="currentPage === 'settings'" :theme="theme" :user-email="user?.email || ''"
				:is-authenticated="Boolean(user)" :is-submitting="isSubmitting" @update-theme="updateTheme"
				@login="handleLogin" @logout="handleLogout" />
		</template>

		<div v-if="isWalletModalOpen" class="modal-backdrop">
			<div class="modal" @keydown.enter="handleModalEnter('wallet', $event)">
				<h3>{{ isEditingWallet ? "Editar carteira" : "Criar carteira" }}</h3>

				<div class="field-group">
					<label class="field-label">Nome</label>
					<input v-model="walletName" :class="{ 'required-empty': isWalletNameMissing() }"
						placeholder="Nome" />
				</div>
				<div class="field-group">
					<label class="field-label">Cor</label>
					<div class="color-field" :class="{ 'required-empty': isWalletColorMissing() }">
						<input v-model="walletColor" class="color-picker" type="color" />
						<input v-model="walletColor" class="color-code-input" type="text" placeholder="#AA3BFF"
							maxlength="7" />
					</div>
				</div>
				<div class="field-group">
					<label class="field-label">Valor</label>
					<input v-if="!isEditingWallet" :class="{ 'required-empty': isWalletBalanceMissing() }"
						:value="walletBalanceInput" type="text" inputmode="decimal" placeholder="R$ 0,00"
						@keydown="handleCurrencyKeydown($event)" @focus="handleCurrencyFieldFocus('wallet', $event)"
						@input="syncCurrencyFieldInput('wallet', $event)" @blur="handleCurrencyFieldBlur('wallet')" />
					<div v-else class="field-note">O saldo continua sendo alterado apenas por ajuste de saldo.</div>
				</div>

				<div class="toolbar">
					<button :disabled="isSubmitting" @click="addWallet">
						Salvar
					</button>

					<button :disabled="isSubmitting" @click="closeWalletModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="adjustingWalletId" class="modal-backdrop">
			<div class="modal" @keydown.enter="handleModalEnter('adjustment', $event)">
				<h3>Ajustar saldo</h3>

				<div class="field-group">
					<label class="field-label">Valor</label>
					<input :class="{ 'required-empty': isAdjustmentBalanceMissing() }" :value="adjustmentBalanceInput"
						type="text" inputmode="decimal" placeholder="R$ 0,00" @keydown="handleCurrencyKeydown($event)"
						@focus="handleCurrencyFieldFocus('adjustment', $event)"
						@input="syncCurrencyFieldInput('adjustment', $event)"
						@blur="handleCurrencyFieldBlur('adjustment')" />
				</div>
				<div class="field-group">
					<label class="field-label">Descrição</label>
					<textarea v-model="adjustmentDescription"
						:class="{ 'required-empty': isAdjustmentDescriptionMissing() }" rows="4"
						placeholder="Descrição do ajuste" />
				</div>

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
			<div class="modal" @keydown.enter="handleModalEnter('category', $event)">
				<h3>{{ editingCategoryId ? "Editar categoria" : "Criar categoria" }}</h3>

				<div class="field-group">
					<label class="field-label">Nome</label>
					<input v-model="categoryName" :class="{ 'required-empty': isCategoryNameMissing() }"
						placeholder="Nome da categoria" />
				</div>

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
			<div class="modal" @keydown.enter="handleModalEnter('period', $event)">
				<h3>Criar mes</h3>

				<div class="field-group">
					<label class="field-label">Ano</label>
					<input v-model.number="periodModalYear" :class="{ 'required-empty': isPeriodYearMissing() }"
						type="number" placeholder="Ano" />
				</div>

				<div class="field-group">
					<label class="field-label">Mes</label>
					<select v-model.number="periodModalMonth" :class="{ 'required-empty': !periodModalMonth }">
						<option v-for="month in monthOptions" :key="month.value" :value="month.value">
							{{ month.label }}
						</option>
					</select>
				</div>

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
			<div class="modal" @keydown.enter="handleModalEnter('entry', $event)">
				<h3>{{ editingTransactionId ? "Editar entrada" : "Nova entrada" }}</h3>

				<div class="field-group">
					<label class="field-label">Descricao</label>
					<input v-model="entryDescription" :class="{ 'required-empty': isEntryDescriptionMissing() }"
						placeholder="Descricao" />
				</div>

				<div class="field-group">
					<label class="field-label">Tipo de entrada</label>
					<select v-model="entryType">
						<option value="expense">Despesa</option>
						<option value="income">Entrada</option>
						<option value="transfer">Transferencia</option>
						<option v-if="editingTransactionId" value="adjustment">Ajuste</option>
					</select>
				</div>

				<div v-if="entryType !== 'adjustment' && entryType !== 'transfer'" class="field-group">
					<label class="field-label">Categoria</label>
					<select v-if="entryType === 'expense'" v-model="entryCategoryId"
						:class="{ 'required-empty': isEntryCategoryMissing() }">
						<option disabled value="">Selecione a categoria</option>
						<option v-for="category in categoryStore.entryCategories" :key="category.id"
							:value="category.id">
							{{ category.name }}
						</option>
					</select>
					<select v-else-if="entryType === 'income'" v-model="entryCategoryId" disabled>
						<option :value="getIncomeEntryCategoryId()">
							Entradas
						</option>
					</select>
				</div>

				<div class="field-group">
					<label class="field-label">Carteira</label>
					<select v-model="entryWalletId" :class="{ 'required-empty': isEntryWalletMissing() }">
						<option disabled value="">Selecione a carteira</option>
						<option v-for="wallet in walletStore.wallets" :key="wallet.id" :value="wallet.id">
							{{ wallet.name }}
						</option>
					</select>
				</div>

				<div v-if="entryType === 'transfer'" class="field-group">
					<label class="field-label">Carteira de destino</label>
					<select v-model="entryTargetWalletId" :class="{ 'required-empty': isEntryTargetWalletMissing() }">
						<option disabled value="">Selecione a carteira de destino</option>
						<option v-for="wallet in walletStore.wallets" :key="wallet.id" :value="wallet.id">
							{{ wallet.name }}
						</option>
					</select>
				</div>

				<div v-if="entryType === 'adjustment'" class="field-group">
					<label class="field-label">Direcao do ajuste</label>
					<select v-model="entryAdjustmentDirection">
						<option value="increase">Aumenta saldo</option>
						<option value="decrease">Diminui saldo</option>
					</select>
				</div>

				<div class="field-group">
					<label class="field-label">Data</label>
					<input v-model="entryDate" :class="{ 'required-empty': isEntryDateMissing() }" type="date"
						:min="entryMinDate" :max="entryMaxDate" />
				</div>
				<div class="field-group">
					<label class="field-label">Valor</label>
					<input :class="{ 'required-empty': isEntryAmountMissing() }" :value="entryAmountInput" type="text"
						inputmode="decimal" placeholder="R$ 0,00" @keydown="handleCurrencyKeydown($event)"
						@focus="handleCurrencyFieldFocus('entry', $event)"
						@input="syncCurrencyFieldInput('entry', $event)" @blur="handleCurrencyFieldBlur('entry')" />
				</div>

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
			<div class="modal" @keydown.enter="handleModalEnter('delete-wallet', $event)">
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
			<div class="modal" @keydown.enter="handleModalEnter('delete-category', $event)">
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
			<div class="modal" @keydown.enter="handleModalEnter('delete-transaction', $event)">
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
			<div class="modal" @keydown.enter="handleModalEnter('delete-period', $event)">
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
	padding: 24px 24px 120px;
	max-width: 1180px;
	margin: 0 auto;
	text-align: left;
	box-sizing: border-box;
}

.tittle {
	text-align: center;
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
.error-box {
	display: grid;
	gap: 12px;
	padding: 18px;
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.simple-list-row,
.entry-list-head,
.entry-row {
	display: grid;
	grid-template-columns: minmax(180px, 2.2fr) minmax(150px, 1.35fr) minmax(110px, 1fr) minmax(100px, 1fr) 80px minmax(140px, 1.4fr);
	gap: 12px;
	align-items: center;
}

.wallet-summary-card {
	display: grid;
	gap: 18px;
	padding: 25px;
	align-items: center;
	border: 1px solid var(--glass-border-strong);
	border-radius: 28px;
	background:
		linear-gradient(180deg, var(--glass-highlight) 0%, transparent 100%),
		var(--glass-surface-strong);
	box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.18);
	backdrop-filter: blur(26px);
}

.wallet-summary-hero {
	display: grid;
	gap: 8px;
	justify-items: center;
	text-align: center;
	padding: 8px 0 12px;
	width: 100%;
	max-width: 992px;
}

.summary-eyebrow {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.wallet-summary-total {
	font-size: clamp(2rem, 5vw, 3.35rem);
	line-height: 1;
	letter-spacing: -0.04em;
	color: var(--text-h);
}

.summary-subtitle {
	font-size: 13px;
	color: var(--text-soft);
}

.wallet-summary-list {
	width: 100%;
	max-width: 992px;
	margin: 0 auto;
}

.wallet-summary-row {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	padding: 9px 0 11px;
	gap: 12px;
	margin: 0 auto;
}

.wallet-summary-row> :last-child {
	justify-self: end;
	text-align: right;
}

.simple-list-row {
	grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) minmax(180px, 1.6fr);
}

.wallet-summary-meta {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	font-size: 0.94rem;
	color: var(--text-soft);
}

.wallet-summary-dot {
	width: 10px;
	height: 10px;
	border-radius: 999px;
	background: linear-gradient(135deg, var(--color-primary), var(--color-primary-soft));
	box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.entry-wallets {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.entry-wallet-meta {
	color: var(--text);
}

.entry-wallet-arrow {
	color: var(--text-soft);
	font-weight: 700;
}

.entry-list {
	display: grid;
	gap: 8px;
}

.entry-list-head {
	font-weight: 700;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--glass-divider);
}

.entry-row,
.simple-list-row {
	padding: 8px 0;
	border-bottom: 1px solid var(--glass-divider);
}

.entry-row {
	padding-inline: 12px;
	border-radius: 16px;
	background: transparent;
}

.entry-row:last-child,
.wallet-summary-row:last-child,
.simple-list-row:last-child {
	border-bottom: 0;
}

.paid-row {
	background: var(--success-surface);
}

.entry-empty {
	padding: 8px 0;
}

.field-group {
	display: grid;
	gap: 6px;
}

.field-label {
	font-size: 12px;
	line-height: 1.2;
	color: var(--text-muted, #9ca3af);
}

.field-note {
	font-size: 12px;
	line-height: 1.4;
	color: var(--text-soft);
}

.color-field {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border: 1px solid var(--glass-border);
	border-radius: 16px;
	background: var(--input-surface);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.color-picker {
	width: 48px;
	min-width: 48px;
	height: 40px;
	padding: 0;
	border: 0;
	border-radius: 12px;
	background: transparent;
	cursor: pointer;
}

.color-code-input {
	border: 0;
	padding: 0;
	background: transparent;
	box-shadow: none;
}

.transaction-sections {
	display: grid;
	gap: 16px;
}

.filter-card {
	display: grid;
	padding: 16px;
	border: 1px solid var(--glass-border);
	border-radius: 22px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.filter-row {
	display: flex;
	gap: 12px;
	align-items: center;
	flex-wrap: nowrap;
	width: 100%;
}

.filter-selects {
	display: flex;
	gap: 12px;
	align-items: center;
	flex: 0 1 auto;
}

.filter-row select {
	flex: 0 1 auto;
	min-width: 0;
}

.filter-spacer {
	flex: 1 1 auto;
	min-width: 0;
}

.filter-actions {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: flex-end;
	flex: 0 0 auto;
}

.filter-row button {
	width: 36px;
	height: 36px;
	min-width: 36px;
	padding: 0;
	border-radius: 50%;
	flex: 0 0 36px;
}

.year-filter {
	flex: 0 0 90px;
	min-width: 80px;
	max-width: 100px;
	height: 36px;
}

.filter-selects select:not(.year-filter) {
	flex: 1;
	min-width: 0;
	height: 36px;
}

.month-remove-button {
	background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--glass-divider);
}

.section-header h2 {
	margin: 0;
}

.section-actions {
	display: flex;
	gap: 6px;
}

.icon-button {
	width: 38px;
	height: 38px;
	padding: 0;
	display: inline-grid;
	place-items: center;
	border-radius: 14px;
}

.row-actions {
	justify-content: flex-end;
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
	border: 1px solid var(--glass-border);
	border-radius: 16px;
	box-sizing: border-box;
	background: var(--input-surface);
	color: var(--text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.required-empty {
	background: rgba(220, 38, 38, 0.12);
	border-color: rgba(220, 38, 38, 0.8);
}

button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 11px 16px;
	border: 1px solid var(--button-muted-border);
	border-radius: 18px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		var(--button-muted-bg);
	color: var(--text-h);
	cursor: pointer;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		background 0.18s ease,
		border-color 0.18s ease,
		opacity 0.18s ease;
}

button:hover {
	transform: translateY(-1px);
	border-color: var(--accent-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--button-muted-hover);
	box-shadow:
		0 12px 24px rgba(15, 17, 21, 0.08),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

button.active {
	outline: 2px solid var(--accent-border);
}

button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.danger-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.danger-button:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
	box-shadow:
		0 12px 24px rgba(244, 63, 94, 0.14),
		inset 0 1px 0 rgba(255, 255, 255, 0.12);
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
	border-radius: 24px;
	border: 1px solid var(--glass-border-strong);
	background: var(--glass-surface-strong);
	box-shadow: var(--shadow);
	backdrop-filter: blur(26px);
}

.button-icon {
	font-size: 16px;
}
.button-icon-edit {
	margin-left: 3px;
}

.button-icon-plus::before,
.button-icon-plus::after {
	width: 12px;
	height: 2px;
	border-radius: 999px;
	background: currentColor;
}

.button-icon-plus::after {
	width: 2px;
	height: 12px;
}

/* MOBILE */
@media (max-width: 480px) {
	.app-page {
		padding: 16px 12px 100px;
	}

	.wallet-summary-card,
	.filter-card,
	.page-section,
	.transaction-section,
	.simple-list,
	.error-box,
	.modal {
		border-radius: 20px;
	}

	.simple-list-row,
	.entry-list-head,
	.entry-row {
		grid-template-columns: minmax(110px, 1fr) auto;
		padding: 9px 0 11px;
		gap: 6px;
	}

	.row-actions,
	.toolbar {
		width: 100%;
	}

	.row-actions button,
	.toolbar button {
		flex: 1 1 auto;
	}

	/* FILTER MOBILE */
	.filter-row {
		flex-wrap: nowrap;
		gap: 6px;
	}

	.filter-spacer {
		display: none;
	}

	.filter-selects {
		display: flex;
		gap: 6px;
		flex: 1;
		min-width: 0;
	}

	/* ANO menor */
	.filter-selects select.year-filter {
		flex: 0 0 72px;
		width: 72px;
		min-width: 72px;
		height: 32px;
		font-size: 12px;
		padding: 4px 6px;
	}

	/* MÊS ocupa tudo */
	.filter-selects select:not(.year-filter) {
		flex: 1;
		min-width: 0;
		height: 32px;
		font-size: 12px;
		padding: 4px 6px;
	}

	/* BOTÕES redondos */
	.filter-actions {
		display: flex;
		gap: 6px;
		flex: 0 0 auto;
	}

	.filter-row button {
		width: 32px !important;
		height: 32px !important;
		min-width: 32px !important;
		flex: 0 0 32px !important;

		padding: 0;
		border-radius: 50%;
		font-size: 13px;
	}
}

/* DESKTOP */
@media (min-width: 1024px) {
	.wallet-summary-row {
		width: 75%;
		padding: 12px 0 13px;
	}

	.wallet-summary-list {
		width: 75%;
	}

	.filter-card {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		padding: 16px;

		border-radius: 20px;
		border: 1px solid var(--glass-border);
		background: var(--glass-surface);
		backdrop-filter: blur(11px);
	}

	/* ROW */
	.filter-row {
		display: flex;
		align-items: center;
		width: 100%;

		gap: 8px;
	}

	/* SELECTS */
	.filter-selects {
		display: flex;
		align-items: center;

		flex: 1;
		min-width: 0;
		gap: 8px;
	}

	.filter-selects select.year-filter {
		width: 280px !important;
		flex: 0 0 280px !important;
		min-width: 280px !important;
		height: 48px;
	}

	/* MÊS */
	.filter-selects select:not(.year-filter) {
		flex: 1;
		min-width: 320px;
		height: 48px;
	}

	/* BOTÕES */
	.filter-row button {
		width: 48px;
		height: 48px;
		flex: 0 0 48px;

		padding: 0;
		border-radius: 50%;
		aspect-ratio: 1 / 1;
	}

	/* HEADER LISTA */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		padding: 10px 12px;
		border-radius: 16px;

		background: var(--success-surface);
	}
	
	.descTittle {
		padding: 0px 12px;
	}
	
	.actionTittle{
		padding-right: 0px 12px;
		text-align: right;
	}
	
	.centerTittle{
		text-align: center;
	}
	
	.row-actions button {
		width: 48px;
		height: 48px;
		min-width: 48px;

		border-radius: 50%;

		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	
	.row-actions .danger-button {
		background: var(--danger-bg);
		border-color: var(--danger-border);
		color: var(--danger-text);
	}
	
	.row-actions {
		display: flex;
		justify-content: flex-end;
	}
}
</style>
