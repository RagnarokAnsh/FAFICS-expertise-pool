# ─────────────────────────────────────────────────────────────────────
# Stage: development (used by docker-compose for local dev)
# ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files first for layer caching
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:dev"]

# ─────────────────────────────────────────────────────────────────────
# Stage: build
# ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────────────────────────────────
# Stage: production
# ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["node", "dist/main"]
