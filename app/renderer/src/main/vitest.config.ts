import {defineConfig} from "vitest/config"
import path from "path"

export default defineConfig({
    // remove vite-tsconfig-paths plugin to avoid compatibility issues in older vitest
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src")
        }
    },
    test: {
        environment: "jsdom",
        globals: true,
        // setup file to register testing-library/jest-dom matchers
        setupFiles: ["src/setupTests.ts"]
        // transformMode removed for compatibility with pinned vitest version
    }
})
