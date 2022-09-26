require('dotenv').config()
const fs = require('node:fs')
const path = require('node:path')
const { Routes } = require('discord.js')
const { REST } = require('@discordjs/rest')

const token = process.env.TOKEN
const guildID = process.env.GUILD_ID
const clientID = process.env.CLIENT_ID

// global commands
const commands = []
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = require(filePath)
  commands.push(command.data.toJSON())
}

// commands in development
const commandsDev = []
const commandsDevPath = path.join(__dirname, 'commands-dev')
const commandDevFiles = fs.readdirSync(commandsDevPath).filter((file) => file.endsWith('.js'))

for (const file of commandDevFiles) {
  const filePath = path.join(commandsDevPath, file)
  const commandDev = require(filePath)
  commandsDev.push(commandDev.data.toJSON())
}

const rest = new REST({ version: '10' }).setToken(token)

;(async () => {
  try {
    if (commands.length != 0) {
      console.info(`Started refreshing ${commands.length} global application (/) commands.`)

      const data = await rest.put(Routes.applicationCommands(clientID), { body: commands })

      console.info(`Successfully reloaded ${data.length} global application (/) commands.`)
    }
  } catch (error) {
    console.error(error)
  }
  try {
    if (commandsDev.length != 0) {
      console.info(`Started refreshing ${commandsDev.length} dev application (/) commands.`)

      const dataDev = await rest.put(Routes.applicationGuildCommands(clientID, guildID), { body: commandsDev })

      console.info(`Successfully reloaded ${dataDev.length} dev global application (/) commands.`)
    }
  } catch (error) {
    console.error(error)
  }
})()
