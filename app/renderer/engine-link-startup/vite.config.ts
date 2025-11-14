import {defineConfig} from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
    base: "./",
    plugins: [react()],
    server: {
        host: true,
        port: 5173
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src")
        }
    },
    build: {
        target: "esnext",
        rollupOptions: {
            output: {
                format: "es"
            }
        }
    },
    optimizeDeps: {
        include: ["react", "react-dom", "antd", "monaco-editor"]
    }
})
