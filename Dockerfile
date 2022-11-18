FROM node:latest

# Create the bot's directory
RUN mkdir -p /usr/src/bot

WORKDIR /usr/src/bot

COPY package.json /usr/src/bot

COPY wait-for-it.sh /usr/src/bot
RUN chmod +x wait-for-it.sh
RUN wait-for-it.sh -t 0 www.google.com:80 --strict -- echo "Network is ready."

RUN npm install

COPY . /usr/src/bot

# Start the bot
CMD ["node", "index.js"]
