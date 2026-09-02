/**
 * vitest 专用 monaco-editor stub。
 * 本机安装的 monaco-editor@0.40.0 package.json 缺少 main/exports 入口，
 * vitest 无法解析裸导入 'monaco-editor'；组件链路（如 utils/editorMarkers、
 * react-monaco-editor）会传递引入它。单元测试不依赖真实编辑器实现，
 * 除常用枚举外一律返回无副作用的 Proxy 空对象。
 */
import type * as Monaco from 'monaco-editor'

export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
} as const

export const MarkerTag = {
  Unnecessary: 1,
  Deprecated: 2,
} as const

const lazyFn = () => {
  const fn = (...args: unknown[]) => makeProxy()
  return fn as unknown as (...args: unknown[]) => unknown
}

/** 任意属性访问返回嵌套 Proxy：函数可调用、对象可继续取值，均无副作用 */
const makeProxy = (): unknown =>
  new Proxy(lazyFn(), {
    get: (target, prop) => {
      if (prop === Symbol.toPrimitive) return () => 'monaco-stub'
      if (prop === 'then') return undefined
      return makeProxy()
    },
  })

export const editor = makeProxy() as typeof Monaco.editor
export const languages = makeProxy() as typeof Monaco.languages
export const Uri = {
  parse: (value: string) => ({ toString: () => value }),
  file: (path: string) => ({ toString: () => `file://${path}` }),
}

const stub = { MarkerSeverity, MarkerTag, editor, languages, Uri }
export default stub
export type { Monaco }
