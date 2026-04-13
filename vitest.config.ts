import {defineConfig} from "vitest/config"
import fs from "node:fs"
import path from "path"

const ENGINE_LINK_SRC = path.resolve(__dirname, "app/renderer/engine-link-startup/src")
const RENDERER_MAIN_SRC = path.resolve(__dirname, "app/renderer/src/main/src")

function resolveAtRoot(root: string, id: string) {
    const rel = id.startsWith("@/") ? id.slice(2) : id
    const candidates = [".ts", ".tsx", ".js", ".jsx", ""].map((ext) => path.join(root, rel + ext))
    for (const p of candidates) {
        try {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
        } catch {
            /* ignore */
        }
    }
    try {
        const asDir = path.join(root, rel)
        if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
            for (const name of ["index.ts", "index.tsx", "index.js", "index.jsx"]) {
                const p = path.join(asDir, name)
                if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
            }
        }
    } catch {
        /* ignore */
    }
    return null
}

/** Vitest 覆盖三个子项目：app/main、app/renderer/src/main、app/renderer/engine-link-startup（与 scripts/ci-select-vitest-tests.js 一致） */
export default defineConfig({
    plugins: [
        {
            name: "resolve-at-monorepo",
            enforce: "pre",
            resolveId(id, importer) {
                if (!id.startsWith("@/")) return null
                const eng = resolveAtRoot(ENGINE_LINK_SRC, id)
                const main = resolveAtRoot(RENDERER_MAIN_SRC, id)
                const imp = (importer || "").split(path.sep).join("/")
                if (eng && main) {
                    return imp.includes("/engine-link-startup/") ? eng : main
                }
                if (eng) return eng
                if (main) return main
                return null
            },
        },
    ],
    resolve: {
        alias: {
            "@renderer": path.resolve(__dirname, "app/renderer/src/main/src"),
            "@engne": path.resolve(__dirname, "app/renderer/engine-link-startup/src"),
            "@engine": path.resolve(__dirname, "app/renderer/engine-link-startup/src"),
            "@app": path.resolve(__dirname, "app")
        }
    },
    test: {
        environment: "jsdom",
        globals: true,
        // run from repo root
        root: path.resolve(__dirname),
        // run renderer setup to register testing-library matchers
        setupFiles: ["app/renderer/src/main/src/setupTests.ts"],
        // 单测：仅业务旁 __test__/（与 scripts/ci-select-vitest-tests.js 一致）
        include: [
            "app/renderer/src/main/src/**/__test__/**/*.test.{ts,tsx,js,jsx}",
            "app/renderer/src/main/src/**/__test__/**/*.spec.{ts,tsx,js,jsx}",
            "app/renderer/engine-link-startup/src/**/__test__/**/*.test.{ts,tsx,js,jsx}",
            "app/renderer/engine-link-startup/src/**/__test__/**/*.spec.{ts,tsx,js,jsx}",
            "app/main/**/__test__/**/*.test.{ts,tsx,js,jsx}",
            "app/main/**/__test__/**/*.spec.{ts,tsx,js,jsx}"
        ],
        // keep JUnit reporter and default reporter
        reporters: [["junit", {outputFile: "reports/junit.xml"}] as unknown as any, "default"],
        coverage: {
            provider: "v8",
            reporter: ["lcov", "text"],
            reportsDirectory: "coverage"
        }
    }
})
