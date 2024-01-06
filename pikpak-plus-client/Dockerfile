FROM node:18.19-slim

WORKDIR /user/src/app

COPY package.json package-lock.json ./
RUN npm i -g vite
RUN npm install 
# RUN ln -s /usr/local/lib/node_modules/ ../node_modules
EXPOSE 3001

COPY . .

CMD ["npm", "run", "dev"]
