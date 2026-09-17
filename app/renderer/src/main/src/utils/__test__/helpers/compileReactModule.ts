import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from '@babel/core'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import ts from 'typescript'

/** 使用应用的 React Compiler 预设加载组件，依赖仍由 Vitest 解析以保留 vi.mock。 */
export async function compileReactModule<T>(testUrl: string, relativePath: string): Promise<T> {
  const filename = path.resolve(path.dirname(fileURLToPath(testUrl)), relativePath)
  const compiled = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['typescript', 'jsx'] },
    presets: [reactCompilerPreset().preset],
  })!
  const { outputText } = ts.transpileModule(compiled.code!, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const dependencies = new Map<string, unknown>()
  const imports = [...new Set([...outputText.matchAll(/require\((['"])(.*?)\1\)/g)].map((match) => match[2]))]
  for (const id of imports) {
    const resolved = id.startsWith('.') ? path.resolve(path.dirname(filename), id).replace(/\\/g, '/') : id
    dependencies.set(id, { ...(await import(/* @vite-ignore */ resolved)), __esModule: true })
  }
  const exports = {}
  new Function('require', 'exports', outputText)((id: string) => dependencies.get(id), exports)
  return exports as T
}
