const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Easy way to check, whether the bot is online.')
    .setDescriptionLocalizations({
      de: 'Ein einfacher Weg um zu sehen, ob der Bot online ist.',
    }),
  async execute(interaction) {
    await interaction.reply('Pong! 🏓')
  },
}
