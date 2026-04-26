# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --prefer-offline

# Stage 2: Generate Prisma client
FROM deps AS builder
COPY . .
RUN npx prisma generate

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
EXPOSE 3001
CMD ["node", "src/app.js"]
