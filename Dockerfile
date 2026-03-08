FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 7860
ENV PORT=7860
CMD ["npm", "run", "start"]
