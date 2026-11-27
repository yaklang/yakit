import { loadEnv } from 'vite'

/**
 * 将 YAKIT_* / REACT_APP_* / VITE_* / NODE_ENV 注入为 process.env（整体对象）。
 * 发行版由 CLI 注入 YAKIT_EDITION，不再依赖 env-cmd / .env.[mode]。
 * 使用整体 define 而非逐键 `process.env.XXX`，避免与 vite-plugin-node-polyfills
 * 的 process shim 冲突导致标识符被拆坏。
 */
export function createProcessEnvDefines(mode, rootDir) {
  const fileEnv = loadEnv(mode, rootDir, ['YAKIT_', 'REACT_APP_', 'VITE_'])
  const merged = {
    NODE_ENV: process.env.NODE_ENV || (mode === 'development' ? 'development' : 'production'),
    ...fileEnv,
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value == null || value === '') continue
    if (key.startsWith('YAKIT_') || key.startsWith('REACT_APP_') || key.startsWith('VITE_')) {
      merged[key] = value
    }
  }
  return {
    'process.env': JSON.stringify(merged),
  }
}
