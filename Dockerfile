FROM node:alpine

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

RUN apk update
RUN apk add git inotify-tools
RUN apk add --update npm
RUN npm i -g pnpm

COPY . /app
WORKDIR /app

RUN pnpm i

CMD ["pnpm", "start"]
