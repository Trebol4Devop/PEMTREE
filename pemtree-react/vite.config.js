import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Habilitar source maps para debugging en producción (opcional, deshabilitar para reducir tamaño)
    sourcemap: false,
    
    // Objetivo moderno para mejor tree-shaking
    target: 'esnext',
    
    // Minificación con Terser para mejor compresión
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    },
    
    // Code splitting manual para optimizar carga
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-canvas': ['html2canvas']
        }
      }
    },
    
    // Límites de chunk para warnings
    chunkSizeWarningLimit: 200
  },
  
  // Optimizaciones para el servidor de desarrollo
  esbuild: {
    drop: ['console', 'debugger']
  }
})
