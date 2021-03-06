require('dotenv').config()
const fs = require('fs')
const Discord = require('discord.js')
const { prefix } = require('./config.json')
const token = process.env.TOKEN
const guildID = process.env.GUILDID

const client = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
})
client.commands = new Discord.Collection()

const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'))

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.name, command)
}

async function handleReactions(reaction, user, type) {
  if (!(type === 'add' || type === 'remove')) {
    console.log('Wrong type: ', type)
    return
  }
  if (user.bot === true) return

  let fullmessage

  if (reaction.message.partial) {
    // console.log('Hi there, partial!')
    try {
      fullmessage = await reaction.message.fetch()
    } catch (error) {
      console.error('Something went wrong when fetching the message: ', error)
    }
  } else {
    // console.log('This is not a message partial')
    fullmessage = reaction.message
  }

  const author = await fullmessage.author.fetch()
  const title = fullmessage.embeds[0].title

  if (author.bot === true && author.id === '802091512573722654' && title === 'Nächste Gaming-Session') {
    const command = client.commands.get('session')
    try {
      command.handleReaction(fullmessage, reaction, user, type)
    } catch (error) {
      console.error(error)
      message.reply('Ein Fehler ist dabei aufgetreten das Kommando auszuführen! :(')
    }
  } else {
    console.log('This is not a message where I care about the reactions.')
  }

  if (type === 'add') {
    console.log(`${user.username} reacted with "${reaction.emoji.name}".`)
  } else {
    console.log(`${user.username} removed reaction "${reaction.emoji.name}".`)
  }
}

// to handle reactions to messages
client.on('messageReactionAdd', async (reaction, user) => {
  handleReactions(reaction, user, 'add')
})

// to handle removal of reactions
client.on('messageReactionRemove', async (reaction, user) => {
  handleReactions(reaction, user, 'remove')
})

// to handle new messages in the chat
client.on('message', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return

  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const commandName = args.shift().toLowerCase()

  const command =
    client.commands.get(commandName) || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName))

  if (!command) return

  if (command.args && !args.length) {
    let reply = `Du hast keine Argumente angegeben, ${message.author}!`

    if (command.usage) {
      reply += `\nSo würds funktionieren: ${prefix}${command.name} ${command.usage}`
    }

    return message.channel.send(reply)
  }

  try {
    command.execute(message, args)
  } catch (error) {
    console.error(error)
    message.reply('Ein Fehler ist dabei aufgetreten das Kommando auszuführen! 😢')
  }
})

client.on('ready', async () => {
  try {
    const members = await client.guilds.cache.get(guildID).members.fetch()
  } catch (error) {
    console.log('something went wrong: ', error)
  }
  client.user.setActivity(`!help`, { type: 'LISTENING' })
})

client.login(token)
