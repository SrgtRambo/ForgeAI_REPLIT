import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const backendProxy: import("vite").ProxyOptions = {
  target: "http://127.0.0.1:3001",
  changeOrigin: true,
  xfwd: true,
  configure(proxy) {
    proxy.on("proxyReq", (proxyRequest) => proxyRequest.removeHeader("origin"));
  },
};

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { specifiers: ["server-only"] },
      },
    }),
    viteReact(),
    tailwindcss({ optimize: false }),
    nitro({ preset: "node-server" }),
  ],
  resolve: {
    alias: { "@": resolve(projectRoot, "src") },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
    tsconfigPaths: true,
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api/site": {
        ...backendProxy,
        timeout: 240_000,
        proxyTimeout: 240_000,
      },
      "/api/catalog": backendProxy,
      "/api/checkout": backendProxy,
      "/api/generate-free": backendProxy,
      "/api/purchases": backendProxy,
      "/api/stripe": backendProxy,
      "/api/__clerk": backendProxy,
    },
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.cache/**",
        "**/.local/**",
        "**/.upm/**",
        "**/.output/**",
        "**/.wrangler/**",
        "**/.tanstack/**",
        "**/.vinxi/**",
        "**/.nitro/**",
      ],
    },
  },
});
