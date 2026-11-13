# syntax=docker/dockerfile:1
# MG Studio · site statique servi par Nginx, derrière le Nginx Proxy Manager de la stack d'infra (hors de ce dépôt).
# Versions retenues (CVE vérifiées le 13 novembre 2026, voir README) : Node 24.22.3, Nginx 1.30.6.

FROM node:24.22.3-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.30.6-alpine
# La config par défaut est remplacée ; sans elle, le script IPv6 de l'image n'a rien à modifier (système de fichiers en lecture seule)
RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/nginx/site.conf /etc/nginx/conf.d/site.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
