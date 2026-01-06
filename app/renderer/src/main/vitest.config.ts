import {defineConfig} from "vitest/config"
import path from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src")
        }
    },
    // Set test root to `src` and explicitly include test file patterns to ensure files are found in CI
    test: {
        environment: "jsdom",
        globals: true,
        root: path.resolve(__dirname),
        include: ["src/**/*.test.{ts,tsx,js,jsx}", "src/**/*.spec.{ts,tsx,js,jsx}"],
        setupFiles: ["src/setupTests.ts"],
        // Add JUnit reporter (writes `reports/junit.xml`) and keep default reporter
        // Cast the tuple to `any` to avoid type mismatch on this Vitest version
        reporters: [["junit", {outputFile: "reports/junit.xml"}] as unknown as any, "default"],
        // Use a supported coverage provider for Node (v8 or istanbul)
        coverage: {
            provider: "v8",
            reporter: ["lcov", "text"],
            reportsDirectory: "coverage"
        }
    }
})
