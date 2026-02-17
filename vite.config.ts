import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // 分離大型第三方庫
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-tauri': ['@tauri-apps/api', '@tauri-apps/plugin-autostart', '@tauri-apps/plugin-clipboard-manager', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-http', '@tauri-apps/plugin-sql'],
                    'vendor-ui': ['lucide-react', 'zustand', 'react-i18next', 'i18next'],
                },
            },
        },
    },
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
}));
