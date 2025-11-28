FROM node:20-buster-slim
RUN mkdir -p /app/
WORKDIR /app/
RUN chmod -R 777 /app/
COPY . /app/
ARG NEXT_PUBLIC_API_URL
ARG API_URL_INTERNAL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL_INTERNAL=$API_URL_INTERNAL
RUN npm ci && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]