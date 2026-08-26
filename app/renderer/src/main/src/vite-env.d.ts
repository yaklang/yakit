/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom/vitest" />

/**
 * 仅扩展 Vite 内置类型：ImportMetaEnv / ImportMeta。
 * 资源模块（*.css / *.module.scss / *.svg / *?worker 等）已由 vite/client 提供，勿重复 declare。
 */
interface ImportMetaEnv {
  readonly YAKIT_EDITION?: string
  readonly YAKIT_DEVTOOLS?: string
  readonly YAKIT_REQUIRE_ENTERPRISE_LICENSE?: string
  readonly YAKIT_ANALYZER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** xterm 样式副作用导入（vite/client 未覆盖该具体路径） */
declare module 'xterm/css/xterm.css'
