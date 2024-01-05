FROM node:18-alpine

WORKDIR /user/src/app

COPY package.json package-lock.json ./

RUN npm install --silent --legacy-peer-deps 

EXPOSE 3001

COPY . .

CMD ["npm", "run", "dev"]
