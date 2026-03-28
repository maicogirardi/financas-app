<script setup>
import { ref, onMounted } from "vue"

import { loginWithGoogle, onUserChanged } from "./services/auth"
import { getExpenses } from "./services/db"

const user = ref(null)
const expenses = ref([])
const loading = ref(true)

async function login() {
	await loginWithGoogle()
}

onMounted(() => {
	onUserChanged(async (u) => {
		user.value = u

		if (u) {
			expenses.value = await getExpenses()
			console.log("loaded", expenses.value)
		}

		loading.value = false
	})
})
</script>

<template>
	<div v-if="loading">
		Carregando...
	</div>

	<div v-else-if="!user">
		<button @click="login">
			Login Google
		</button>
	</div>

	<div v-else>
		Logado: {{ user.email }}
	</div>
</template>