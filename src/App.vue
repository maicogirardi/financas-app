<!-- <script setup>
import { ref, watch, onMounted } from 'vue'
import { loginWithGoogle } from "./services/auth"

const months = [
	'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
	'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

const currentDate = new Date()

const selectedYear = ref(currentDate.getFullYear())
const selectedMonth = ref(currentDate.getMonth())

const data = ref({
	saldoAnterior: 0,
	receitas: {},
	despesas: {}
})

async function login() {
	const user = await loginWithGoogle()
	console.log(user)
}

function getStorage() {
	const saved = localStorage.getItem('financas')
	return saved ? JSON.parse(saved) : {}
}

function saveStorage(storage) {
	localStorage.setItem('financas', JSON.stringify(storage))
}

function loadMonth() {
	const storage = getStorage()

	if (
		storage[selectedYear.value] &&
		storage[selectedYear.value][selectedMonth.value]
	) {
		data.value = storage[selectedYear.value][selectedMonth.value]
	} else {
		data.value = {
			saldoAnterior: 0,
			receitas: {},
			despesas: {}
		}
	}
}

function saveMonth() {
	const storage = getStorage()

	if (!storage[selectedYear.value])
		storage[selectedYear.value] = {}

	storage[selectedYear.value][selectedMonth.value] = data.value

	saveStorage(storage)
}

watch(data, saveMonth, { deep: true })
watch([selectedMonth, selectedYear], loadMonth)

onMounted(loadMonth)
</script>

<template>
	<div class="app">
		<h1>Finanças</h1>

		<div class="selectors">
			<select v-model="selectedMonth">
				<option v-for="(m,i) in months" :key="i" :value="i">
					{{ m }}
				</option>
			</select>

			<select v-model="selectedYear">
				<option v-for="year in 10" :key="year">
					{{ 2020 + year }}
				</option>
			</select>
		</div>

		<div class="card">
			<label>
				Saldo anterior
				<input
					type="number"
					v-model="data.saldoAnterior"
				/>
			</label>
		</div>

		<pre>{{ data }}</pre>
	</div>

	<button @click="login">
		Login Google
	</button>
</template>

<style>
.app {
	font-family: Arial;
	padding: 20px;
	max-width: 900px;
	margin: auto;
}

.selectors {
	display: flex;
	gap: 10px;
	margin-bottom: 20px;
}

.card {
	background: #f5f5f5;
	padding: 20px;
	border-radius: 8px;
}

input, select {
	padding: 8px;
	font-size: 16px;
}
</style>	 -->

<script setup>
import { loginWithGoogle } from "./services/auth"
import { addExpense, getExpenses } from "./services/db"

async function login() {
	await loginWithGoogle()
}

async function save() {
	await addExpense({
		description: "Supermercado",
		value: 120,
		date: new Date()
	})
}

async function load() {
	const data = await getExpenses()
	console.log(data)
}
</script>

<template>
	<button @click="login">Login</button>
	<button @click="save">Salvar</button>
	<button @click="load">Carregar</button>
</template>