/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom/vitest" />

interface ImportMetaEnv {
  readonly YAKIT_EDITION?: string
  // 自定义 YAKIT_* 时：在仓库根目录 cli/env.mjs 的 buildYakitEnv 里注入，并在本 interface 补类型
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
