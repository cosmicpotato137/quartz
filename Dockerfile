FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx quartz plugin install --from-config

EXPOSE 8080 3001
CMD ["npx", "quartz", "build", "--serve"]
