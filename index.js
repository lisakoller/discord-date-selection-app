require('dotenv').config();
const fs = require('fs')
const Discord = require('discord.js')
const { prefix } = require('./config.json')
const token = process.env.TOKEN

const client = new Discord.Client()
client.commands = new Discord.Collection()

const commandFiles = fs
  .readdirSync('./commands')
  .filter((file) => file.endsWith('.js'))

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.name, command)
}

client.on('message', (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return

  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const commandName = args.shift().toLowerCase()

  if (!client.commands.has(commandName)) return

  const command = client.commands.get(commandName)

  if (command.args && !args.length) {
    let reply = `Du hast keine Argumente angegeben, ${message.author}!`

    if (command.usage) {
      reply += `\nSo würds funktionieren: \`${prefix}${command.name} ${command.usage}\``
    }

    return message.channel.send(reply)
  }

  try {
    command.execute(message, args)
  } catch (error) {
    console.error(error)
    message.reply('Ein Fehler ist dabei aufgetreten das Kommando auszuführen! :(')
  }
})

client.login(token)
