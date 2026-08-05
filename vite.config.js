import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 프로젝트 페이지(https://<user>.github.io/skala-vue/)로 배포하므로
  // 정적 자산 경로가 그 하위 경로를 기준으로 잡히도록 base 를 저장소 이름으로 맞춘다.
  // 이걸 안 하면 배포 후 자산을 루트(/)에서 찾다가 흰 화면만 뜬다.
  base: '/skala-vue/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
