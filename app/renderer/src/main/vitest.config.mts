import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process'],
      globals: { Buffer: true, process: true },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      // 测试环境不走真实 Electron bridge（模块顶层会读 window.yakitBridge）
      '@/services/electronBridge': path.resolve(
        rootDir,
        'src/pages/ai-re-act/hooks/__test__/stubs/electronBridgeStub.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(rootDir, 'src/setupVitest.ts')],
    include: ['src/**/__test__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/alibaba/**', 'src/__test__/yakitUiIconsPurePlugin.test.ts'],
  },
})
