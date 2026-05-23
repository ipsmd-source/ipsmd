FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install -g tsx
EXPOSE 5000
CMD ["npx", "tsx", "ipsmdsecurehasher.ts"]
