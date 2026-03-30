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
	right: 16px;
	bottom: 72px;
	width: 56px;
	height: 56px;
	border: 0;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: var(--color-primary);
	color: var(--color-text-on-primary, #ffffff);
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22);
	cursor: pointer;
	z-index: 30;
}

.fab-icon {
	font-size: 30px;
	line-height: 1;
	font-weight: 500;
	transform: translateY(-1px);
}

@media (min-width: 768px) {
	.fab {
		right: 24px;
	}
}
</style>
