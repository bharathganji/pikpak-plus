FROM node:18-slim

RUN mkdir -p /app/
WORKDIR /app/
WORKDIR /app/
RUN chmod -R 777 /app/
COPY package*.json /app/
COPY tsconfig.json /app/
COPY tsconfig.node.json /app/
RUN npm ci

EXPOSE 3002
EXPOSE 3001

COPY ./ /app/

CMD ["npm", "run", "preview"]