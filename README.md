<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-mg-studio-creme.svg">
    <img src="public/logo-mg-studio.svg" alt="MG Studio" width="240">
  </picture>
</p>

# MG Studio

Le site de MG Studio, le studio de design et de développement de Mathias Genibrel, à Perpignan : sites web sur mesure et applications macOS, iOS et Android.

**https://mg-studio.dev**

## Technique

Site statique en [Astro](https://astro.build) et TypeScript, animé avec GSAP. Aucun cookie, aucun traceur, aucune requête vers un service tiers. Servi par Nginx dans Docker et déployé par GitHub Actions à chaque push sur `main`.

## Lancer en local

Node 24 (version dans `.node-version`) et pnpm via Corepack.

```sh
corepack enable
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # vérification des types puis build dans dist/
```

Le déploiement et le serveur sont décrits dans [`deploy/README.md`](deploy/README.md).

## Droits

© Mathias Genibrel. Le code est visible pour référence ; textes, logo et visuels ne sont pas réutilisables sans accord.
