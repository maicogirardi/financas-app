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
			<span class="tab-icon" :class="`tab-icon-${tab.icon || 'home'}`" aria-hidden="true" />
			<span class="tab-label">{{ tab.label }}</span>
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
	padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
	background: color-mix(in srgb, var(--surface-elevated) 84%, transparent);
	border-top: 1px solid var(--glass-border);
	backdrop-filter: blur(22px);
	z-index: 20;
	box-sizing: border-box;
	justify-content: center;
}

.tab-button {
	min-width: 102px;
	display: inline-grid;
	justify-items: center;
	align-content: center;
	justify-content: center;
	gap: 6px;
	padding: 10px 14px;
	border: 1px solid var(--theme-button-border);
	border-radius: 22px;
	background: var(--theme-button-bg);
	color: var(--text-soft);
	font: inherit;
	font-weight: 500;
	cursor: pointer;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	transition:
		transform 0.18s ease,
		border-color 0.18s ease,
		background 0.18s ease,
		color 0.18s ease,
		box-shadow 0.18s ease;
}

.tab-button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	color: var(--text-h);
}

.tab-button.active {
	border-color: color-mix(in srgb, var(--color-primary) 40%, var(--glass-border-strong));
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
		var(--glass-surface-strong);
	color: var(--text-h);
	box-shadow:
		0 10px 22px rgba(15, 17, 21, 0.1),
		inset 0 1px 0 rgba(255, 255, 255, 0.16);
	transform: translateY(-1px);
}

.tab-label {
	line-height: 1;
	font-size: 0.72rem;
}

.tab-icon {
	position: relative;
	width: 18px;
	height: 18px;
	display: inline-block;
	flex: 0 0 18px;
}

.tab-icon::before,
.tab-icon::after {
	content: "";
	position: absolute;
	inset: 0;
	margin: auto;
}

.tab-icon-home::before {
	width: 12px;
	height: 9px;
	border: 2px solid currentColor;
	border-top: 0;
	border-radius: 0 0 3px 3px;
	transform: translateY(3px);
}

.tab-icon-home::after {
	width: 10px;
	height: 10px;
	border-top: 2px solid currentColor;
	border-left: 2px solid currentColor;
	transform: translateY(-2px) rotate(45deg);
}

.tab-icon-wallet::before {
	width: 14px;
	height: 10px;
	border: 2px solid currentColor;
	border-radius: 4px;
}

.tab-icon-wallet::after {
	width: 4px;
	height: 4px;
	border-radius: 999px;
	background: currentColor;
	transform: translateX(4px);
}

.tab-icon-grid::before {
	width: 14px;
	height: 14px;
	background:
		linear-gradient(currentColor, currentColor) 0 0 / 5px 5px no-repeat,
		linear-gradient(currentColor, currentColor) 100% 0 / 5px 5px no-repeat,
		linear-gradient(currentColor, currentColor) 0 100% / 5px 5px no-repeat,
		linear-gradient(currentColor, currentColor) 100% 100% / 5px 5px no-repeat;
}

.tab-icon-settings::before {
	width: 14px;
	height: 14px;
	border-radius: 999px;
	border: 2px solid currentColor;
}

.tab-icon-settings::after {
	width: 4px;
	height: 4px;
	border-radius: 999px;
	background: currentColor;
}

@media (max-width: 640px) {
	.bottom-tabs {
		gap: 6px;
		padding-inline: 12px;
	}

	.tab-button {
		min-width: 0;
		flex: 1 1 0;
		padding: 12px 10px;
	}

	.tab-label {
		font-size: 0.82rem;
	}
}
</style>
