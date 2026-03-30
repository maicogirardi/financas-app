<script setup>
defineProps({
	tabs: {
		type: Array,
		default: () => []
	},
	currentTab: {
		type: String,
		default: ""
	}
})

defineEmits(["select"])
</script>

<template>
	<nav class="bottom-tabs" aria-label="Navegacao principal">
		<button
			v-for="tab in tabs"
			:key="tab.value"
			class="tab-button"
			:class="{ active: currentTab === tab.value }"
			type="button"
			@click="$emit('select', tab.value)"
		>
			{{ tab.label }}
		</button>
	</nav>
</template>

<style scoped>
.bottom-tabs {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	gap: 8px;
	padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
	background: var(--surface-elevated);
	border-top: 1px solid var(--border);
	backdrop-filter: blur(12px);
	z-index: 20;
	box-sizing: border-box;
	justify-content: center;
}

.tab-button {
	min-width: 96px;
	padding: 10px 14px;
	border: 1px solid var(--button-muted-border);
	border-radius: 14px;
	background: var(--button-muted-bg);
	color: var(--text-h);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
	transition:
		transform 0.18s ease,
		border-color 0.18s ease,
		background 0.18s ease,
		color 0.18s ease,
		box-shadow 0.18s ease;
}

.tab-button:hover {
	transform: translateY(-1px);
	border-color: var(--accent-border);
}

.tab-button.active {
	border-color: transparent;
	background: var(--button-bg);
	color: var(--button-text);
	box-shadow: var(--shadow);
	transform: translateY(-1px);
}
</style>
