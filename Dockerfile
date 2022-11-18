FROM node:latest

# Create the bot's directory & set as working directory
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

COPY package.json /usr/src/bot

# COPY wait-for-it.sh /usr/src/bot

RUN npm install

COPY . /usr/src/bot

RUN chmod +x wait-for-it.sh
RUN bash wait-for-it.sh -t 0 www.google.com:80 --strict -- echo "Network is ready."

# Start the bot
CMD ["node", "index.js"]
