const i18next = require('i18next')
const { SlashCommandBuilder } = require('discord.js')
const miscFunctions = require('../utilities/misc')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setNameLocalizations({
      de: 'zufall'
    })
    .setDescription('Randomly choose one of the options.')
    .setDescriptionLocalizations({
      de: 'Wählt zufällig eine der Alternativen aus.'
    })
    .addStringOption((option) => option
      .setName('word_1')
      .setNameLocalizations({
        de: 'wort_1'
      })
      .setDescription('First thing in the pool')
      .setDescriptionLocalizations({
        de: 'Erstes Ding, das gezogen werden kann'
      })
      .setRequired(true)
    )
    .addStringOption((option) => option
      .setName('word_2')
      .setNameLocalizations({
        de: 'wort_2'
      })
      .setDescription('Second thing in the pool')
      .setDescriptionLocalizations({
        de: 'Zweites Ding, das gezogen werden kann'
      })
      .setRequired(true)
    )
    .addStringOption((option) => option
      .setName('word_3')
      .setNameLocalizations({
        de: 'wort_3'
      })
      .setDescription('Third thing in the pool')
      .setDescriptionLocalizations({
        de: 'Drittes Ding, das gezogen werden kann'
      })
      .setRequired(false)
    )
    .addStringOption((option) => option
      .setName('word_4')
      .setNameLocalizations({
        de: 'wort_4'
      })
      .setDescription('Fourth thing in the pool')
      .setDescriptionLocalizations({
        de: 'Viertes Ding, das gezogen werden kann'
      })
      .setRequired(false)
    )
    .addStringOption((option) => option
      .setName('word_5')
      .setNameLocalizations({
        de: 'wort_5'
      })
      .setDescription('Fifth thing in the pool')
      .setDescriptionLocalizations({
        de: 'Fünftes Ding, das gezogen werden kann'
      })
      .setRequired(false)
    )
    .addStringOption((option) => option
      .setName('word_6')
      .setNameLocalizations({
        de: 'wort_6'
      })
      .setDescription('Sixth thing in the pool')
      .setDescriptionLocalizations({
        de: 'Sechstes Ding, das gezogen werden kann'
      })
      .setRequired(false)
    )
    .addStringOption((option) => option
      .setName('word_7')
      .setNameLocalizations({
        de: 'wort_7'
      })
      .setDescription('Seventh thing in the pool')
      .setDescriptionLocalizations({
        de: 'Siebentes Ding, das gezogen werden kann'
      })
      .setRequired(false)
    )
    .addStringOption((option) => option
      .setName('word_8')
      .setNameLocalizations({
        de: 'wort_8'
      })
      .setDescription('Eigth thing in the pool')
      .setDescriptionLocalizations({
        de: 'Achtes Ding, das gezogen werden kann'
      })
      .setRequired(false)
    ),
  async execute(interaction) {
    // push provided words into an array and select a random index
    const words = [interaction.options.getString('word_1'), interaction.options.getString('word_2')]
    for (let i = 3; i < 9; i++) {
      if(interaction.options.getString(`word_${i}`)) {
        words.push(interaction.options.getString(`word_${i}`))
      }
    }
    const index = miscFunctions.getRandomInt(0, words.length - 1)
    const setTimeoutPromise = timeout => new Promise((resolve) => {
      setTimeout(resolve, timeout)
    })

    // send the result with a countdown
    await interaction.reply(i18next.t('random.countdown1', { lng: interaction.locale }))
    await setTimeoutPromise(2000)
    await interaction.followUp(i18next.t('random.countdown2', { lng: interaction.locale }))
    await setTimeoutPromise(4000)
    await interaction.followUp(`**${words[index]}**! 🎉`)
  }
}
