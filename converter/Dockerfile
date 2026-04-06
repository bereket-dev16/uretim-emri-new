FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer libreoffice-calc fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV CONVERTER_HOST=0.0.0.0
ENV CONVERTER_PORT=4000
ENV CONVERTER_PROCESS_TIMEOUT_MS=60000

COPY converter/server.mjs ./server.mjs

EXPOSE 4000

CMD ["node", "server.mjs"]
