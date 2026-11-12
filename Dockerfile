# Imagem do site (React) servido por um Nginx, que também repassa /api/ para a API.
# Em duas etapas: a primeira gera o site (npm run build); a segunda leva só os arquivos prontos.
# Normalmente é construída pelo docker-compose.yml do repositório da API.

# ---- etapa 1: gerar o site ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# endereço da API visto pelo navegador: /api (mesmo endereço do site)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- etapa 2: servir ----
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
