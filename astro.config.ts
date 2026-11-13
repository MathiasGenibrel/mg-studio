import { defineConfig } from "astro/config";

// Site statique : une page, aucune requête tierce (polices et GSAP servis depuis le site)
export default defineConfig({
  site: "https://mg-studio.dev",
});
