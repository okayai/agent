FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN useradd --create-home --uid 10001 okay && chown -R okay:okay /app
USER okay

EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.mjs"]
