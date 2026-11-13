# Exploitation du site

Notes techniques : déploiement, serveur et dépendances. Pour lancer le site en local, voir le [README](../README.md).

## Déploiement (VPS Infomaniak, Docker rootless)

Le site est une image Nginx qui sert le build statique (`Dockerfile` en deux étapes : build Node, puis Nginx). Nginx Proxy Manager (HTTPS, domaines) est installé à part sur le VPS (`/opt/npm`, Docker root) : la CI n'y touche jamais, un déploiement ne le fait pas tomber.

- **Pipeline** (`.github/workflows/deploy.yml`) : à chaque push sur `main` (ou à la main), lint, `docker build` (qui lance `astro check` et le build), puis l'image part par SSH vers le VPS. Pas de registre. Les secrets (`DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`) et la variable `DEPLOY_HOST` sont dans l'environnement GitHub `production`, réservé à la branche `main`. Le pipeline vérifie enfin que https://mg-studio.dev répond 200.
- **Clé de la CI** : posée sur l'utilisateur `deploy` (sans sudo) avec une commande forcée, `deploy/server/mg-deploy-site` (copiée dans `/usr/local/bin`, appartient à root). Elle ne peut que charger l'image et relancer le conteneur ; tout autre commande est refusée. Si le nouveau conteneur n'est pas sain, le script revient à la version précédente. Il garde les trois dernières images.
- **Conteneur** : lancé par le Docker rootless de `deploy` (root dans le conteneur = `deploy` sur le VPS), publié sur `127.0.0.1:8080` seulement. NPM, sur le réseau de l'hôte, le sert en HTTPS. Lecture seule, `no-new-privileges`, capacités réduites à quatre, 256 Mo, 200 processus.
- **`compose.yaml`** : copié à la main sur le VPS (`~deploy/apps/mg-studio/compose.yaml`, appartient à root). S'il change dans le dépôt, le recopier : `ssh mgstudio 'sudo tee /home/deploy/apps/mg-studio/compose.yaml >/dev/null' < compose.yaml`.
- **Revenir en arrière** : depuis le serveur, `sudo -iu deploy`, puis `cd ~/apps/mg-studio && MG_TAG=<sha> docker compose up -d` avec un des trois tags de `docker image ls mg-studio-site`. Ou relancer un ancien run du pipeline.
- **Nginx** (`deploy/nginx/site.conf`) : 404 avec son statut, `.vcf` en `text/vcard`, `X-Robots-Tag: noindex` sur `/carte`, la fiche et la 404, cache long sur `/_astro/`, redirections relatives, en-têtes de sécurité, vraie adresse du visiteur reprise de `X-Real-IP`. Pas de journal d'accès (NPM tient celui des visites). Pas encore de `Content-Security-Policy` : le script en ligne de `Base.astro` demanderait son empreinte.
- **Versions** (CVE vérifiées le 13 novembre 2026) : Node 24.22.3 (version de sécurité du 10 novembre 2026, ici, dans `.node-version` et en local) et Nginx 1.30.6 (corrige les cinq CVE publiées en octobre 2026). Actions GitHub épinglées par commit.

## Dépendances

Versions exactes (sans `^`), verrouillées par `pnpm-lock.yaml`. `pnpm audit` : aucune vulnérabilité connue au 8 novembre 2026.

| Paquet                                                                                      | Version                                         | Note                                                                                                     |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| astro                                                                                       | 7.4.7                                           |                                                                                                          |
| gsap (avec ScrollTrigger, SplitText)                                                        | 3.15.1                                          | Aucune CVE sur cette version (CVE-2020-28478 corrigée depuis 3.6.0). Licence GSAP « Standard No Charge » |
| typescript                                                                                  | 6.0.3                                           | Pas la 7 : typescript-eslint 8 et @astrojs/check exigent TypeScript < 6.1                                |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-astro, eslint-config-prettier, globals | 10.14.0, 10.0.1, 8.72.1, 3.2.1, 10.1.8, 17.14.0 |                                                                                                          |
| prettier, prettier-plugin-astro                                                             | 3.9.10, 1.1.2                                   |                                                                                                          |
| @astrojs/check                                                                              | 0.9.12                                          |                                                                                                          |
| Bricolage Grotesque                                                                         | Google Fonts v9                                 | SIL Open Font License 1.1                                                                                |

Surcharges dans `pnpm-workspace.yaml` :

- `minimatch` 11.0.1 : corrige GHSA-g3hv-75wg-m249 (déni de service, modéré), présente en 10.2.6 via eslint et typescript-eslint (outillage de dev uniquement) ;
- `@emnapi/runtime` 1.11.3 : pair manquant résolu par défaut en 2.0.0-beta, qui faisait planter `astro check`.
