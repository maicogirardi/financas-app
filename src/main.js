import { createApp } from 'vue'
import './styles/variables.css'
import './styles/theme.css'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", async () => {
		try {
			const baseUrl = import.meta.env.BASE_URL
			await navigator.serviceWorker.register(`${baseUrl}sw.js`, {
				scope: baseUrl
			})
		} catch (error) {
			console.error("Falha ao registrar o service worker", error)
		}
	})
}
