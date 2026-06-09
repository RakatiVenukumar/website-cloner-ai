FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Run build to verify TypeScript/Lint and generate production files
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
