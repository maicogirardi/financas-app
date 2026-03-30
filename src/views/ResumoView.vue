<script setup>
import FloatingActionButton from "@/components/ui/FloatingActionButton.vue"

defineProps({
	showFab: {
		type: Boolean,
		default: true
	}
})

defineEmits(["fab-click"])
</script>

<template>
	<section class="page-section resumo-view">
		<slot />
	</section>
	<Teleport to="body">
		<FloatingActionButton v-if="showFab" @click="$emit('fab-click')" />
	</Teleport>
</template>

<style scoped>
.resumo-view {
	position: relative;
	display: grid;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--bg);
	box-shadow: var(--shadow);
}
</style>
