FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Run build to verify TypeScript/Lint and generate production files
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
