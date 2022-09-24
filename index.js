require('dotenv').config()
const fs = require('fs')
const path = require('node:path')
const { Client, IntentsBitField, Partials, Collection, ActivityType } = require('discord.js')
const dynamoDB = require('./utilities/dynamoDB')
const i18next = require('i18next')
const en = require('./utilities/locales/en.json')
const de = require('./utilities/locales/de.json')

i18next.init({
  fallbackLng: 'en',
  debug: false,
  resources: { en, de }
})

const token = process.env.TOKEN
const guildID = process.env.GUILD_ID
const clientID = process.env.CLIENT_ID

const myIntents = new IntentsBitField()
myIntents.add(IntentsBitField.Flags.Guilds,
              IntentsBitField.Flags.GuildMessages,
              IntentsBitField.Flags.GuildMessageReactions,
              IntentsBitField.Flags.MessageContent,
              IntentsBitField.Flags.DirectMessages,
              IntentsBitField.Flags.GuildPresences,
              IntentsBitField.Flags.GuildMembers)

// create new client
const client = new Client({
  intents: myIntents,
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
})

client.once('ready', () => {
  console.log('Client is ready')
})

client.commands = new Collection()

// read all command files and add them to the collection
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = require(filePath)
  client.commands.set(command.data.name, command)
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const command = interaction.client.commands.get(interaction.commandName)

  if(!command) return

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    await interaction.reply({ content: i18next.t('errors.general', { lng: interaction.locale }), ephemeral: true })
  }
})

// react to buttons
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return

  try {
    if(interaction.customId === 'removeReminders') {
      const command = interaction.client.commands.get('reminder')
      if(!command) return
  
      await command.removeAllReminders(interaction)
    } else if(interaction.customId === 'keepReminders') {
      await interaction.update({ content: i18next.t('reminder.clear.no_reply', { lng: interaction.locale }), components: [] })
    } else if(interaction.customId === 'removeReminder') {
      const command = interaction.client.commands.get('reminder')
      if(!command) return

      await command.removeReminder(interaction)
    } else if(interaction.customId === 'keepReminder') {
      await interaction.update({ content: i18next.t('reminder.remove.no_reply', { lng: interaction.locale }), components: [] })
    }
  } catch(error) {
    console.error(error)
    await interaction.reply({ content: i18next.t('errors.general', { lng: interaction.locale }), ephemeral: true })
  }
})

// react to select menus
client.on('interactionCreate', async interaction => {
  if(!interaction.isSelectMenu()) return

  try {
    if(interaction.customId === 'removeReminderOptions') {
      const command = interaction.client.commands.get('reminder')
      if(!command) return

      await command.confirmDelete(interaction)
    }
  } catch(error) {
    console.error(error)
    await interaction.reply({ content: i18next.t('errors.general', { lng: interaction.locale }), ephemeral: true })
  }
})

// react to autocomplete
client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return

	if (interaction.commandName === 'session') {
		const focusedOption = interaction.options.getFocused(true)
		let choices

		if (focusedOption.name === 'starting_day') {
			choices = [
        'nächster Montag - next monday',
        'nächster Dienstag - next tuesday',
        'nächster Mittwoch - next wednesday',
        'nächster Donnerstag - next thursday',
        'nächster Freitag - next friday',
        'nächster Samstag - next saturday',
        'nächster Sonntag - next sunday',
        'heute - today',
        'morgen - tomorrow',
        'übermorgen - day after tomorrow'
      ]
		}

		const filtered = choices.filter(choice => choice.startsWith(focusedOption.value))
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice.replace('nächster ', '').split(' ')[0].toLowerCase() })),
		)
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
  client.user.setActivity(`deinen /'s`, { type: ActivityType.Listening })
})

client.login(token)

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

// When a reaction is received, check if the structure is partial -> load full message
  if (reaction.partial) {
    try {
      await reaction.fetch()
      fullmessage = await reaction.message

      // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    } catch (error) {
      console.error('Something went wrong when fetching the reaction: ', error)
      return
    }
  } else {
    fullmessage = reaction.message
  }
  // Now the message and reaction have been cached and are fully available

  const author = fullmessage.author
  const title = fullmessage.embeds[0].title

  // check if the message is a session message (where reactions need to be handled)
  if (author.bot === true && author.id === clientID && title.includes('Gaming-Session')) {
    const command = client.commands.get('session')
    try {
      // handle the reaction
      command.handleReaction(fullmessage, reaction, user, type)
    } catch (error) {
      console.error(error)
      // TODO locale?
      return message.reply(i18next.t('errors.general', { lng: 'de' }))
    }
  } else {
    console.info('This is not a message where I care about the reactions 🤷‍♀️')
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
