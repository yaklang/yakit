import {defineConfig} from "vitest/config"
import path from "path"

export default defineConfig({
    resolve: {
        alias: {
            // keep `@` for backward compatibility (renderer main src)
            "@": path.resolve(__dirname, "app/renderer/src/main/src"),
            // explicit aliases for multiple packages under `app`
            "@renderer": path.resolve(__dirname, "app/renderer/src/main/src"),
            "@engne": path.resolve(__dirname, "app/renderer/engine-link-startup/src"),
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
        // include tests in common locations (root and package-specific __tests__),
        // and preserve previous src-based test globs
        include: [
            // tests under specific package-level __tests__ folders
            "app/renderer/src/main/src/__tests__/**/*.test.{ts,tsx,js,jsx}",
            "app/renderer/src/main/src/__tests__/**/*.spec.{ts,tsx,js,jsx}",
            "app/renderer/engine-link-startup/src/__tests__/**/*.test.{ts,tsx,js,jsx}",
            "app/renderer/engine-link-startup/src/__tests__/**/*.spec.{ts,tsx,js,jsx}",
            // original renderer src patterns
            "app/main/__tests__/**/*.test.{ts,tsx,js,jsx}",
            "app/main/__tests__/**/*.spec.{ts,tsx,js,jsx}"
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
