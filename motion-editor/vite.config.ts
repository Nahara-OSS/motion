import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import deno from "@deno/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
    base: "/motion/",
    build: {
        license: true,
    },
    plugins: [
        svelte(),
        deno(),
    ],
});
