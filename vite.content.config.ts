import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        emptyOutDir: false, // Keep previous build artifacts
        rollupOptions: {
            input: {
                content: resolve(__dirname, 'src/content/index.ts'),
            },
            output: {
                entryFileNames: 'src/[name]/index.js',
                format: 'iife',
                inlineDynamicImports: true,
                extend: true,
            },
        },
        outDir: 'dist',
    },
})
