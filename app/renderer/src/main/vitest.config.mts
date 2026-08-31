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
    // 数组形式：精确项优先（必须排在裸 '@' 之前，否则 '@/services/xxx' 会先被 '@' 命中）；
    // monaco 的正则项兜底拦截 'monaco-editor' 及其 esm 子路径导入
    alias: [
      // 测试环境不走真实 Electron bridge（模块顶层会读 window.yakitBridge）
      {
        find: '@/services/electronBridge',
        replacement: path.resolve(rootDir, 'src/pages/ai-re-act/hooks/__test__/stubs/electronBridgeStub.ts'),
      },
      { find: '@', replacement: path.resolve(rootDir, 'src') },
      // monaco-editor@0.40.0 的 package.json 缺 main/exports 入口，vitest 解析不了裸导入；
      // 组件链路会传递引入它（含 react-monaco-editor 的 esm 子路径），测试统一走轻量 stub
      {
        find: /^monaco-editor(\/.*)?$/,
        replacement: path.resolve(rootDir, 'src/pages/ai-re-act/hooks/__test__/stubs/monacoEditorStub.ts'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(rootDir, 'src/setupVitest.ts')],
    include: ['src/**/__test__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/alibaba/**'],
  },
})
