require('dotenv').config()
const fs = require('node:fs')
const path = require('node:path')
const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const token = process.env.TOKEN
const guildID = process.env.GUILD_ID
const clientID = process.env.CLIENT_ID

const commands = []
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = require(filePath)
    commands.push(command.data.toJSON())
}

const rest = new REST({ version: '10' }).setToken(token)
    rest.put(Routes.applicationGuildCommands(clientID, guildID), { body: commands })
    .then((data) => console.log(`Successfully registered ${data.length} application commands.`))
    .catch(console.error)
