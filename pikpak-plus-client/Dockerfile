FROM node:18.16.0-buster-slim

RUN mkdir -p /app/
WORKDIR /app/
RUN chmod -R 777 /app/
COPY . /app/
RUN npm ci && npm run build

EXPOSE 3002
EXPOSE 3001

CMD ["npm", "run", "preview"]