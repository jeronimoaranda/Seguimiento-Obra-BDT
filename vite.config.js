import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Seguimiento-Obra-BDT/', // <--- AGREGA ESTA LÍNEA (con las barras al inicio y final)
})