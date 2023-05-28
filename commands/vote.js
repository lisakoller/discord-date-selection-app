const i18next = require('i18next')
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// TODO: not working like this
/*
const emojiList = [
  { 'yes': '👍', 'no': '👎', 'maybe': '🤷' },
  { 'yes': '🤩', 'no': '🤮', 'maybe': '🤷' },
  { 'yes': '👏', 'no': '💩', 'maybe': '🤷' },
  { 'yes': '👌', 'no': '🙅', 'maybe': '🤷' },
  { 'yes': '🟢', 'no': '🔴', 'maybe': '⚪' },
  { 'yes': '🟩', 'no': '🟥', 'maybe': '⬜' }
]

/**
 * get all available emoji sets
 * @returns array containing all emoji sets
 */
/*function buildChoices() {
  let result = []

  emojiList.forEach((emojiSet, i) => {
    let emojis = emojiSet['yes'] + emojiSet['no'] + emojiSet['maybe']
    result.push({ name: emojis, name_localizations: { de: emojis }, value: i })
  });

  return Object.fromEntries(result)
}*/

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setNameLocalizations({
      de: 'abstimmen',
    })
    .setDescription('Collect yes/no/maybe reactions of your suggestion.')
    .setDescriptionLocalizations({
      de: 'Sammle ja/nein/vielleicht Reaktionen zu deinem Vorschlag.',
    })
    .addStringOption((option) =>
      option
        .setName('suggestion')
        .setNameLocalizations({
          de: 'vorschlag',
        })
        .setDescription('Custom text that you want people to vote on.')
        .setDescriptionLocalizations({
          de: 'Benutzerdefinierter Text, über den abgestimmt werden soll.',
        })
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('explanation')
        .setNameLocalizations({
          de: 'erklärung',
        })
        .setDescription('Display an explanation what each emoji means. (default: false)')
        .setDescriptionLocalizations({
          de: 'Eklärung anzeigen, wofür jedes Emoji steht. (Standard: False',
        })
        .setRequired(false)
    )
    .addMentionableOption((option) =>
      option
        .setName('mention')
        .setNameLocalizations({
          de: 'erwähnen',
        })
        .setDescription('Is there a role or person you want to notify? (default: nobody)')
        .setDescriptionLocalizations({
          de: 'Gibt es eine Rolle oder Person, die du aufmerksam machen möchtest? (Standard: niemand)',
        })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('emojis')
        .setNameLocalizations({
          de: 'emojis',
        })
        .setDescription('Which set of emojis do you want to use? (default: 👍👎🤷)')
        .setDescriptionLocalizations({
          de: 'Welche Emojis sollen verwendet werden? (Standard: 👍👎🤷)',
        })
        .setRequired(false)
        .addChoices(
          { name: '👍👎🤷', name_localizations: { de: '👍👎🤷' }, value: '👍👎🤷' },
          { name: '🤩🤮🤷', name_localizations: { de: '🤩🤮🤷' }, value: '🤩🤮🤷' },
          { name: '👏💩🤷', name_localizations: { de: '👏💩🤷' }, value: '👏💩🤷' },
          { name: '👌🙅🤷', name_localizations: { de: '👌🙅🤷' }, value: '👌🙅🤷' },
          { name: '🟢🔴⚪', name_localizations: { de: '🟢🔴⚪' }, value: '🟢🔴⚪' },
          { name: '🟩🟥⬜', name_localizations: { de: '🟩🟥⬜' }, value: '🟩🟥⬜' },
        )
    ),
  async execute(interaction) {
    let suggestion = interaction.options.getString('suggestion')
    let explanation = interaction.options.getBoolean('explanation')
    let mention = interaction.options.getMentionable('mention')
    let emojiVariant = interaction.options.getString('emojis')
    let emojis = emojiVariant ? [...emojiVariant] : ['👍', '👎', '🤷']

    try {
      // send the message in the same channel
      let sentMessage
      if(explanation) {
        sentMessage = await interaction.reply({content: `${mention ? mention : ''} ${i18next.t('vote.suggestion_explanation', { text: suggestion, yes: emojis[0], no: emojis[1], maybe: emojis[2], lng: interaction.locale })}`, fetchReply: true })
      } else {
        sentMessage = await interaction.reply({content: `${mention ? mention : ''} ${i18next.t('vote.suggestion', { text: suggestion, lng: interaction.locale })}`, fetchReply: true })
      }

      // react to the message
      emojis.forEach(async (emoji) => {
        await sentMessage.react(emoji)
      })

      // TODO: not working like this
      /*await sentMessage.react(emojiList[emojiVariant]['yes'])
      await sentMessage.react(emojiList[emojiVariant]['no'])
      await sentMessage.react(emojiList[emojiVariant]['maybe'])*/
    } catch (error) {
      console.error('One of the emojis failed to react.')
      interaction.followUp({ content: i18next.t('errors.general', { lng: interaction.locale }), ephemeral: true })
    }
  },
}
