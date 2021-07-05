FROM node:14-alpine

WORKDIR /app

COPY ["package.json", "/app/"]

# 如果各公司有自己的私有源，可以替换registry地址
RUN npm install -p --registry=https://registry.npm.taobao.org

ENV NPM_CONFIG_LOGLEVEL warn
ENV NODE_ENV=production
ENV NODE_Docker=docker

COPY dist /app/dist
COPY bootstrap.js /app/bootstrap.js

CMD ["npm", "run", "start"]