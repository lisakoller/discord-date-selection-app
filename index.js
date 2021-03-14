require('dotenv').config()
const fs = require('fs')
const Discord = require('discord.js')
const { prefix } = require('./config.json')
const dynamoDB = require('./utilities/dynamoDB')

const token = process.env.TOKEN
const guildID = process.env.GUILD_ID
const authorID = process.env.AUTHOR_ID

// create new client
const client = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
})
client.commands = new Discord.Collection()

// read all command files and add them to the collection
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'))
for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.name, command)
}

/**
 * handle the reaction of a user
 * @param {discord reaction object} reaction reaction by a user
 * @param {discord user object} user user that reacted
 * @param {string} type either 'add' or 'remove'
 */
async function handleReactions(reaction, user, type) {
  // to determine whether the reaction was added or removed
  if (!(type === 'add' || type === 'remove')) {
    console.error('Wrong type: ', type)
    return
  }

  // ignore reactions by bots
  if (user.bot === true) return

  let fullmessage

  // if the message is a partial load the full message
  if (reaction.message.partial) {
    try {
      fullmessage = await reaction.message.fetch()
    } catch (error) {
      console.error('Something went wrong when fetching the message: ', error)
    }
  } else {
    fullmessage = reaction.message
  }

  const author = await fullmessage.author.fetch()
  const title = fullmessage.embeds[0].title

  // check if the message is a session message (where reactions need to be handled)
  if (author.bot === true && author.id === authorID && title === 'Nächste Gaming-Session') {
    const command = client.commands.get('session')
    try {
      // handle the reaction
      command.handleReaction(fullmessage, reaction, user, type)
    } catch (error) {
      console.error(error)
      return message.reply('ein Fehler ist dabei aufgetreten das Kommando auszuführen! :(')
    }
  } else {
    console.info('This is not a message where I care about the reactions 🤷‍♀️')
  }

  if (type === 'add') {
    console.info(`${user.username} reacted with "${reaction.emoji.name}".`)
  } else {
    console.info(`${user.username} removed reaction "${reaction.emoji.name}".`)
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
  // ignore messages that don't start with the prefix
  if (!message.content.startsWith(prefix) || message.author.bot) return

  // extract possible arguments
  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const commandName = args.shift().toLowerCase()

  const command =
    client.commands.get(commandName) || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName))

  // return if the command is unkown
  if (!command) return

  // send an error message if the commands requires arguments but the user didn't provide any
  if (command.args && !args.length) {
    let reply = `Du hast keine Argumente angegeben, ${message.author}!`

    // add instructions if available
    if (command.usage) {
      reply += `\nSo würds funktionieren: ${prefix}${command.name} ${command.usage}`
    }

    return message.channel.send(reply)
  }

  try {
    // try to execute the command
    command.execute(message, args)
  } catch (error) {
    console.error(error)
    message.reply('ein Fehler ist dabei aufgetreten das Kommando auszuführen! 😢')
  }
})

client.on('ready', async () => {
  try {
    // force fetching of users (for correct number of users in the guild needed to check whether everyone reacted)
    const members = await client.guilds.cache.get(guildID).members.fetch()
  } catch (error) {
    console.error('Something went wrong fetching the users: ', error)
  }

  try {
    // load all dynamoDB reminders into the node-scheduler on server reload
    const savedReminders = await dynamoDB.setup()
    client.commands.get('reminder').setReminders(savedReminders, client)
  } catch (error) {
    console.error('Something went wrong setting up dynamoDB: ', error)
  }

  // set the activity of the bot that is displayed under it
  client.user.setActivity(`!help`, { type: 'LISTENING' })
})

client.login(token)
