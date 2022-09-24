const i18next = require('i18next')
const { SlashCommandBuilder } = require('discord.js')
const miscFunctions = require('../utilities/misc')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setNameLocalizations({
      de: 'würfel'
    })
    .setDescription('Throw a virtual dice.')
    .setDescriptionLocalizations({
      de: 'Wirf den virtuellen Würfel.'
    })
    .addBooleanOption((option) => option
      .setName('instant')
      .setNameLocalizations({
        de: 'sofort'
      })
      .setDescription('Return result immediately?')
      .setDescriptionLocalizations({
        de: 'Ergebnis sofort anzeigen?'
      })),
  async execute(interaction) {
    // get a random number between 1 and 6 (numbers of a dice)
    const result = miscFunctions.getRandomInt(1, 6)
    const instant = interaction.options.getBoolean('instant')

    if(instant) {
      await interaction.reply(`**${result}**! 🎉`)
    } else {
      const setTimeoutPromise = timeout => new Promise((resolve) => {
        setTimeout(resolve, timeout)
      })
      
      // send the result with a countdown
      await interaction.reply(i18next.t('dice.countdown1', { nickname: interaction.member.nickname, lng: interaction.locale}))
      await setTimeoutPromise(2000)
      await interaction.followUp(i18next.t('dice.countdown2', { nickname: interaction.member.nickname, lng: interaction.locale}))
      await setTimeoutPromise(2000)
      await interaction.followUp(i18next.t('dice.countdown3', { nickname: interaction.member.nickname, lng: interaction.locale}))
      await setTimeoutPromise(4000)
      await interaction.followUp(`**${result}**! 🎉`)
    }
  }
}
