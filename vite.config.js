import path from "path"
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
	plugins: [vue()],

	base: '/financas-app/',

	build: {
		assetsDir: 'assets',
		sourcemap: false
	},
	resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})