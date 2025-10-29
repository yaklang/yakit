/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PLATFORM?: string
    // 你可以继续加上自己定义的其他 VITE_ 开头变量
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
