<script setup>
defineEmits(["click"])
</script>

<template>
	<button class="fab" type="button" aria-label="Adicionar" @click="$emit('click')">
		<span class="fab-icon">+</span>
	</button>
</template>

<style scoped>
.fab {
	position: fixed;
	right: 80px;
	bottom: calc(88px + env(safe-area-inset-bottom, 0px));
	width: 60px;
	height: 60px;
	overflow: hidden;
	border: 1px solid var(--theme-fab-border);
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background:
		linear-gradient(180deg, var(--theme-fab-bg) 0%, rgba(255, 255, 255, 0) 100%),
		var(--glass-surface-strong);
	color: var(--text-h);
	box-shadow:
		0 18px 36px rgba(15, 17, 21, 0.12),
		inset 0 1px 0 rgba(255, 255, 255, 0.18);
	cursor: pointer;
	outline: none;
	appearance: none;
	-webkit-appearance: none;
	-webkit-tap-highlight-color: transparent;
	backdrop-filter: blur(18px);
	z-index: 40;
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		background 0.18s ease,
		border-color 0.18s ease;
}

.fab:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 56%, var(--theme-fab-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent),
		0 18px 36px rgba(15, 17, 21, 0.12),
		inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.fab:active {
	transform: translateY(0) scale(0.98);
	border-color: color-mix(in srgb, var(--color-primary) 60%, var(--theme-fab-border));
	box-shadow:
		0 12px 24px rgba(15, 17, 21, 0.14),
		0 0 0 2px color-mix(in srgb, var(--color-primary) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.fab:hover {
	transform: translateY(-2px);
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 16%, rgba(255, 255, 255, 0.22)) 0%, rgba(255, 255, 255, 0) 100%),
		var(--glass-surface);
	box-shadow:
		0 22px 42px rgba(15, 17, 21, 0.16),
		inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.fab-icon {
	font-size: 32px;
	line-height: 1;
	font-weight: 400;
	transform: translateY(-1px);
}

@media (max-width: 640px) {
	.fab {
		right: 16px;
		bottom: calc(92px + env(safe-area-inset-bottom, 0px));
	}
}
</style>
