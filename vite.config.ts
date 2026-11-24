// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Cloudflare Workers deploy: pin the Worker name so Cloudflare's Git builds
  // always match the Worker created in the dashboard (otherwise Nitro derives it
  // from the git remote, which can differ in CI).
  nitro: {
    // Fixed Workers runtime version, so behaviour does not change with the build date.
    compatibilityDate: "2026-11-01",
    cloudflare: {
      wrangler: { name: "giribioai" },
    },
  },
});
