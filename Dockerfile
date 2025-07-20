FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Create data directory
RUN mkdir -p /app/data

# Make sure data directory has proper permissions
RUN chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["npm", "start"]
