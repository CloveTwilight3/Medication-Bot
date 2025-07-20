FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Create data directory
RUN mkdir -p /app/data

# Create entrypoint script that fixes permissions and switches user
RUN echo '#!/bin/sh\n\
# Fix data directory permissions\n\
chown -R node:node /app/data 2>/dev/null || true\n\
# Switch to node user and run command\n\
exec su-exec node "$@"' > /entrypoint.sh && chmod +x /entrypoint.sh

# Install su-exec for user switching
RUN apk add --no-cache su-exec

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "start"]
