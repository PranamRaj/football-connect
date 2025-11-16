FROM node:18

RUN apt-get update && apt-get install -y postgresql-client

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production        # no nodemon inside container

COPY . .

RUN chmod +x wait-for-postgres.sh

EXPOSE 3000

CMD ["./wait-for-postgres.sh", "football_postgres", "node", "server.js"]
