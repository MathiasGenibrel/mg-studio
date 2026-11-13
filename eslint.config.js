import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import astro from "eslint-plugin-astro";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist/", ".astro/", "prototype/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
  { files: ["*.config.{js,ts}"], languageOptions: { globals: { ...globals.node } } },
  // En dernier : désactive les règles de style qui contrediraient Prettier
  prettier,
);
