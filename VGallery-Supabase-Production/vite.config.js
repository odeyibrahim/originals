import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        toplevel: true,
        keep_fnames: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@supabase/supabase-js', 'crypto-js'],
          vendorAuth: ['bcryptjs', 'jsonwebtoken']
        }
      }
    },
    target: 'es2020',
    cssCodeSplit: true
  },
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true
      }
    }
  },
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true
    })
  ]
});
