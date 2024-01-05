FROM node:slim

WORKDIR /user/src/app

COPY package.json package-lock.json ./
RUN npm i -g vite
RUN npm install --legacy-peer-deps 

EXPOSE 3001

COPY . .

CMD ["npm", "run", "dev"]
