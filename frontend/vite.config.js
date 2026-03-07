import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Build as a self-contained library (IIFE) so it auto-executes when loaded
    lib: {
      entry: 'src/main.jsx',
      name: 'ChatWithUs',
      formats: ['iife'],
      fileName: () => 'ChatWithUsWid.js',
    },
    rollupOptions: {
      // Bundle everything (including React) into a single file
      output: {
        inlineDynamicImports: true,
      },
    },
    // Output to dist/ 
    outDir: 'dist',
    // Don't clear dist — we only produce widget.js
    emptyOutDir: true,
    // CSS is injected into JS via Shadow DOM, no separate CSS file needed
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
})
