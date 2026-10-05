# The Kai Events server in a container, the Lab 06 way: dependencies first so
# the layer cache survives code changes, then the source.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# tsx runs the TypeScript directly (there is no build step), so the dev
# dependencies stay in.
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
EXPOSE 3734
CMD ["node_modules/.bin/tsx", "src/server.ts"]
