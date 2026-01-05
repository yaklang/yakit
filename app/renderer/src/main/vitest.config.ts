import {defineConfig} from "vitest/config"
import path from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src")
        }
    },
    test: {
        environment: "jsdom",
        globals: true,
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
