<script setup>
import { computed } from "vue"

const props = defineProps({
	theme: {
		type: String,
		default: "light"
	},
	userEmail: {
		type: String,
		default: ""
	},
	isAuthenticated: {
		type: Boolean,
		default: false
	},
	isSubmitting: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(["update-theme", "login", "logout"])

const isDarkMode = computed(() => props.theme === "dark")

function handleThemeToggle(event) {
	const checked = event.target.checked
	emit("update-theme", checked ? "dark" : "light")
}
</script>

<template>
	<section class="page-section settings-view">
		<header class="settings-header">
			<h2>Configurações</h2>
		</header>

		<div class="settings-card">
			<div class="settings-row">
				<div class="settings-copy">
					<label class="settings-label" for="dark-mode-switch">Dark Mode</label>
					<p class="settings-help">Alterna entre light e dark mode.</p>
				</div>

				<label class="switch" for="dark-mode-switch">
					<input
						id="dark-mode-switch"
						:checked="isDarkMode"
						type="checkbox"
						@change="handleThemeToggle"
					/>
					<span class="switch-track" />
					<span class="switch-thumb" />
				</label>
			</div>
		</div>

		<div class="settings-card">
			<div class="settings-copy">
				<label class="settings-label">Conta</label>
				<p class="settings-help">
					{{ isAuthenticated ? `Logado como: ${userEmail}` : "Nenhuma conta conectada." }}
				</p>
			</div>

			<div class="settings-actions">
				<button
					v-if="!isAuthenticated"
					:disabled="isSubmitting"
					type="button"
					@click="$emit('login')"
				>
					Entrar com Google
				</button>
				<button
					v-else
					:disabled="isSubmitting"
					type="button"
					@click="$emit('logout')"
				>
					Sair
				</button>
			</div>
		</div>
	</section>
</template>

<style scoped>
.settings-view {
	display: grid;
	gap: 16px;
	padding: 16px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--bg);
	box-shadow: var(--shadow);
}

.settings-header h2 {
	margin: 0;
}

.settings-card {
	display: grid;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--bg);
}

.settings-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.settings-copy {
	display: grid;
	gap: 4px;
}

.settings-actions {
	display: flex;
	justify-content: flex-start;
}

.settings-actions button {
	padding: 10px 14px;
	border: 1px solid transparent;
	border-radius: 12px;
	background: var(--button-bg);
	color: var(--button-text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
	box-shadow: var(--shadow);
	transition: transform 0.18s ease, background 0.18s ease, opacity 0.18s ease;
}

.settings-actions button:hover {
	transform: translateY(-1px);
	background: var(--button-hover);
}

.settings-actions button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
	transform: none;
}

.settings-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-h);
}

.settings-help {
	font-size: 12px;
	color: var(--text);
}

.switch {
	position: relative;
	width: 54px;
	height: 32px;
	display: inline-flex;
	align-items: center;
	cursor: pointer;
}

.switch input {
	position: absolute;
	inset: 0;
	opacity: 0;
	cursor: pointer;
}

.switch-track {
	width: 100%;
	height: 100%;
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-primary) 22%, var(--color-bg));
	border: 1px solid var(--border);
	transition: background 0.2s ease;
}

.switch-thumb {
	position: absolute;
	left: 4px;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: var(--color-bg);
	box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
	transition: transform 0.2s ease, background 0.2s ease;
}

.switch input:checked + .switch-track {
	background: var(--color-primary);
}

.switch input:checked + .switch-track + .switch-thumb {
	transform: translateX(22px);
	background: var(--color-text-on-primary, #ffffff);
}
</style>
