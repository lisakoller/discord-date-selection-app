const i18next = require('i18next')
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const dateHandler = require('../utilities/dateHandler')
const moment = require('moment')
moment.locale('de')

const singlePandaUrl = 'https://assets.lisakoller.dev/discord/single-panda.jpg'
const teamPandaUrl = 'https://assets.lisakoller.dev/discord/team-panda.jpg'
const botIconUrl = 'https://assets.lisakoller.dev/discord/calendar.jpg'

const emojiList = [
  '🇦',
  '🇧',
  '🇨',
  '🇩',
  '🇪',
  '🇫',
  '🇬',
  '🇭',
  '🇮',
  '🇯',
  '🇰',
  '🇱',
  '🇲',
  '🇳',
  '🇴',
  '🇵',
  '🇶',
  '🇷',
  '🇸',
  '🇹',
  '🇺',
  '🇻',
  '🇼',
  '🇽',
  '🇾',
  '🇿',
  '❌',
]

/**
 * get all available options for the session
 * @param {number} max how many options should be provided
 * @param {moment object} startingOn date of the first option
 * @returns array containing max available date options starting on startingOn
 */
function buildOptions(max, startingOn, locale) {
  let result = []

  for (let i = 0; i < max; i++) {
    let weekday = startingOn.locale(locale).format('dddd')
    let dateAsNumber = startingOn.date()
    let icon = emojiList[i]

    // every object describes one option
    result.push({
      icon: icon,
      text: `${icon}  ${weekday} (${dateAsNumber}.)`,
      weekday: weekday,
      value: '-',
    })

    // add a day on every iteration
    startingOn.add(1, 'days')
  }

  result.push({
    icon: emojiList[emojiList.length - 1],
    text: `${emojiList[emojiList.length - 1]}  ${locale.includes('en') ? 'Busy' : 'Beschäftigt'}`,
    weekday: `${locale.includes('en') ? 'Busy' : 'Beschäftigt'}`,
    value: '-',
  })

  return result
}

/**
 * convert options to embed fields
 * @param {array} options all days that should be displayed
 * @returns array of embed fields
 */
function getBasicEmbedFields(options, locale) {
  // first two fields contain general information and whitespace
  let basicEmbedFields = [
    {
      name: i18next.t('session.top_entries', { lng: locale }),
      value: '-',
    },
    {
      name: '\u200b',
      value: '\u200b',
      inline: false,
    },
  ]

  // the following fields each stand for an option
  options.forEach((option) => {
    basicEmbedFields.push({ name: option['text'], value: option['value'], inline: true })
  })

  return basicEmbedFields
}

/**
 * get basic filled in embed
 * @param {array} options all days that should be displayed
 * @returns object to use as embed
 */
function getBasicEmbed(options, author, title, message, time, image, locale) {
  return new EmbedBuilder()
    .setColor(0x72e397)
    .setTitle(title ? title : i18next.t('session.title', { lng: locale }))
    .setAuthor({
      name: author.name,
      iconURL: author.iconURL,
    })
    .setDescription(
      `${message ? message : i18next.t('session.message', { lng: locale })}\n${i18next.t('session.desc', {
        time: time ? time : '20:00',
        lng: locale,
      })}`
    )
    .setThumbnail(image ? image.url : singlePandaUrl)
    .addFields(getBasicEmbedFields(options, locale))
    .setTimestamp()
    .setFooter({
      text: 'Caley Version 2.3',
      iconURL: botIconUrl,
    })
}

/**
 * add a user to the list of users that voted for an option
 * @param {string} value option to add the user to
 * @param {discord user object} user user to add to the list
 * @returns updated list of users on a specific option
 */
function addUser(value, user) {
  // if the list is empty just add the new user
  if (value === '-') {
    return user
  }

  // get all users that are already displayed
  const listOfUsers = value
    .trim()
    .replace(/[<>]/g, '')
    .split('@')
    .filter((e) => e.length !== 0)

  // check if the users already contain the new user
  if (listOfUsers.includes(user.id)) {
    console.info(`adding user ${user} not needed`)
    return value
    // else add the new user to the list
  } else {
    console.info(`adding user ${user} to ${value}`)
    return (value += `\n${user}`)
  }
}

/**
 * remove a user from the list of users that voted for an option
 * @param {string} value option to remove the user from
 * @param {discord user object} user user to remove from the list
 * @returns updated list of users on a specific option
 */
function removeUser(value, user) {
  // remove user from the list of users
  let newValue = value.replace(`<@${user.id}>`, '').replace(`\n\n`, '\n')

  // if there are no users left return a hyphen instead
  return newValue.length === 0 ? '-' : newValue
}

/**
 * get string that displays the most reacted options
 * @param {discord message object} sentMessage message to get the most voted reactions from
 * @returns formatted string of most reacted options
 */
function getTopAnswer(sentMessage, reaction, authorName, locale) {
  let reactions = sentMessage.reactions.cache //.array()

  // how often was every emoji selected/reacted? (includes the bot itself)
  let counts = []
  reactions.forEach((reaction) => {
    counts.push({ icon: reaction.emoji.name, count: reaction.count })
  })

  // get maximum number of reactions
  const max = Math.max.apply(
    Math,
    counts.map((o) => {
      return o.count
    })
  )

  // max === 1 means that only the bot reacted
  if (max === 1) {
    return '-'
  }

  // get list of emoji + weekday that was max times reacted to (can be more than 1 as you can vote for multiple options)
  let fields = sentMessage.embeds[0].fields
  let result = ''
  counts
    .filter((entry) => {
      // throw away entries where the count is not the max
      if (entry.count !== max) {
        return false
      }
      return true
    })
    .map((entry) => {
      const weekday = fields
        .filter((_, index) => {
          // throw away the first two general fields
          if (index === 0 || index === 1) {
            return false
          }
          return true
        })
        .map((field) => {
          let o = Object.assign({}, field)
          if (o.name.includes(entry.icon)) {
            // ${icon}  ${weekday} (${dateAsNumber}.)
            // �  Samstag (6.)
            const parts = o.name.split(' ')

            // return the weekday (for example "Samstag")
            return parts[2]
          }
        })
      // format the emoji and weekday nicely
      result += `${entry.icon} ${weekday.join('')}\n`
    })

  // check if all users of the server have already voted
  const guild = sentMessage.guild
  const memberCount = guild.members.cache.filter((member) => !member.user.bot).size

  // first: check if all members have reacted (max - 1 because of the reaction of the bot itself)
  // second: only message if the new reaction is a max one
  // third: only send message on the first reaction that reaches max (not on every single one)
  if (
    max - 1 >= memberCount &&
    counts.filter((entry) => entry.icon === reaction.emoji.name && entry.count === max).length === 1 &&
    counts.filter((entry) => entry.count === max).length === 1
  ) {
    console.info(`Yay! All ${memberCount} members have voted!`)
    try {
      const author = guild.members.cache.find((member) => member.displayName === authorName)
      author.send(i18next.t('session.finished_message', { memberCount: memberCount, lng: locale }))
    } catch (err) {
      console.error('Error sending the author a DM: ', err)
    }
  }

  // only return the result if there is at least one entry
  return result.length > 0 ? result : '-'
}

/**
 * update the fields of the embed with new values because of reaction
 * @param {discord embed object} receivedEmbed old embed that should be updated
 * @param {discord message object} sentMessage old message that contains the embed
 * @param {discord reaction object} reaction emoji the user reacted with
 * @param {discord user object} user user that reacted with the emoji
 * @param {string} type either 'add' or 'remove' the user from the list of reactions
 * @returns updated embed fields
 */
async function updateFields(receivedEmbed, sentMessage, reaction, user, type, locale) {
  return new Promise((resolve, reject) => {
    // the type is necessary to determine if the user should be added or removed
    if (!(type === 'add' || type === 'remove')) {
      reject('Wrong type!')
    }

    // update the embed fields
    let result = receivedEmbed.fields.map((entry, index) => {
      let o = Object.assign({}, entry)

      // the first field contains the top answers that need to be updated
      if (index === 0) {
        o.value = getTopAnswer(sentMessage, reaction, receivedEmbed.author.name, locale)

        // the other fields contain a list of users that reacted with that emoji
        // index-2 because there are 2 "standard" fields that need to be subtracted (intro + blank space; see basicEmbedFields)
      } else if (index >= 2 && reaction.emoji.name === emojiList[index - 2]) {
        // depending on the type add the user or remove the user from the list
        o.value = type === 'add' ? String(addUser(o.value, user)) : String(removeUser(o.value, user))
      } else if (index === receivedEmbed.fields.length - 1 && reaction.emoji.name === emojiList[emojiList.length - 1]) {
        o.value = type === 'add' ? String(addUser(o.value, user)) : String(removeUser(o.value, user))
      }
      return o
    })

    resolve(result)
  })
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setNameLocalizations({
      de: 'treffen',
    })
    .setDescription('Start a poll when the next gaming-session should take place.')
    .setDescriptionLocalizations({
      de: 'Startet eine Umfrage, wann die nächste Gaming-Session stattfinden soll.',
    })
    .addStringOption((option) =>
      option
        .setName('date')
        .setNameLocalizations({
          de: 'startdatum',
        })
        .setDescription('First day to be proposed. (DD.MM.YYYY) (Default: next monday)')
        .setDescriptionLocalizations({
          de: 'Erster Tag, der vorgeschlagen wird. (DD.MM.YYYY) (Standard: nächster Montag)',
        })
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('duration')
        .setNameLocalizations({
          de: 'dauer',
        })
        .setDescription('How many days to choose from.')
        .setDescriptionLocalizations({
          de: 'Wie viele Tage vorgeschlagen werden. (Standard: 7)',
        })
        .setRequired(false)
        .addChoices(
          { name: '2 days', name_localizations: { de: '2 Tage' }, value: 2 },
          { name: '3 days', name_localizations: { de: '3 Tage' }, value: 3 },
          { name: '4 days', name_localizations: { de: '4 Tage' }, value: 4 },
          { name: '5 days', name_localizations: { de: '5 Tage' }, value: 5 },
          { name: '6 days', name_localizations: { de: '6 Tage' }, value: 6 },
          { name: '7 days', name_localizations: { de: '7 Tage' }, value: 7 },
          { name: '8 days', name_localizations: { de: '8 Tage' }, value: 8 },
          { name: '9 days', name_localizations: { de: '9 Tage' }, value: 9 },
          { name: '10 days', name_localizations: { de: '10 Tage' }, value: 10 },
          { name: '11 days', name_localizations: { de: '11 Tage' }, value: 11 },
          { name: '12 days', name_localizations: { de: '12 Tage' }, value: 12 },
          { name: '13 days', name_localizations: { de: '13 Tage' }, value: 13 },
          { name: '14 days', name_localizations: { de: '14 Tage' }, value: 14 }
        )
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setNameLocalizations({
          de: 'titel',
        })
        .setDescription('Set a title for the meeting. (Default: Next Gaming-Session')
        .setDescriptionLocalizations({
          de: 'Wähle einen Titel für das Treffen. (Standard: Nächste Gaming-Session',
        })
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setNameLocalizations({
          de: 'nachricht',
        })
        .setDescription('Custom sentence to describe the meeting.')
        .setDescriptionLocalizations({
          de: 'Benutzerdefinierter Satz, um das Treffen zu beschreiben.',
        })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('time')
        .setNameLocalizations({
          de: 'uhrzeit',
        })
        .setDescription('Time at which the meeting will start. (HH:mm) (Default: 20:00)')
        .setDescriptionLocalizations({
          de: 'Uhrzeit, zu der das Treffen startet. (HH:mm) (Standard: 20:00)',
        })
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setNameLocalizations({
          de: 'bild',
        })
        .setDescription('Image to display on the poll. (preferably a square) (Default: a red panda)')
        .setDescriptionLocalizations({
          de: 'Bild, das bei der Umfrage angezeigt wird. (am besten quadratisch) (Standard: ein roter Panda)',
        })
        .setRequired(false)
    )
    .addMentionableOption((option) =>
      option
        .setName('mention')
        .setNameLocalizations({
          de: 'erwähnen',
        })
        .setDescription('Is there a role or person you want to notify? (default: @everyone)')
        .setDescriptionLocalizations({
          de: 'Gibt es eine Rolle oder Person, die du aufmerksam machen möchtest? (Standard: @everyone)',
        })
        .setRequired(false)
    ),
  async handleReaction(message, reaction, user, type, locale) {
    try {
      // only do something if the emoji is relevant
      if (emojiList.includes(reaction.emoji.name)) {
        const receivedEmbed = await message.embeds[0]

        // update the fields because of the new reaction
        let fields = await updateFields(receivedEmbed, message, reaction, user, type, locale)

        // update the embed
        const updatedEmbed = new EmbedBuilder()
          .setColor(receivedEmbed.color)
          .setTitle(receivedEmbed.title)
          .setAuthor({
            name: receivedEmbed.author.name,
            iconURL: receivedEmbed.author.iconURL,
          })
          .setDescription(receivedEmbed.description)
          .setThumbnail(receivedEmbed.thumbnail.url)
          .addFields(fields)
          .setTimestamp(new Date(receivedEmbed.timestamp))
          .setFooter({
            text: receivedEmbed.footer.text,
            iconURL: receivedEmbed.footer.iconURL,
          })

        // edit the original message
        message.edit({ embeds: [updatedEmbed] })
      } else {
        console.info('Wrong reaction dude 🙄')
      }
    } catch (error) {
      console.error('Something went wrong: ', error)
      message.channel.send({ content: i18next.t('errors.general', { lng: locale }) })
    }
  },
  async execute(interaction) {
    let inputStartingDay = interaction.options.getString('date')
    let inputNDays = interaction.options.getInteger('duration')
    let inputTime = interaction.options.getString('time')
    let startingDay
    let nDays = inputNDays ? inputNDays : 7

    if (!inputStartingDay) {
      startingDay = dateHandler.getStartingDateByISO()
    } else {
      try {
        // try to convert the input to a valid date
        startingDay = await dateHandler.convertInputToDate(inputStartingDay, undefined, undefined, interaction)
      } catch (errorMessage) {
        return interaction.reply({ content: errorMessage, ephemeral: true })
      }
    }

    let title = interaction.options.getString('title')
    let message = interaction.options.getString('message')
    let image = interaction.options.getAttachment('image')
    let author = {
      name: interaction.member.displayName,
      iconURL: interaction.member.displayAvatarURL(),
    }

    // build all options based on the starting day and number of days that should be provided
    const options = buildOptions(nDays, startingDay, interaction.locale)

    // build the embed and replace the placeholders
    const embed = getBasicEmbed(options, author, title, message, inputTime, image, interaction.locale)

    try {
      // send the message in the same channel
      let sentMessage = await interaction.reply({ embeds: [embed], fetchReply: true })

      // react with all emojis in order
      options.forEach(async (option) => {
        await sentMessage.react(option['icon'])
      })
    } catch (error) {
      console.error('One of the emojis failed to react.')
      interaction.followUp({ content: i18next.t('errors.general', { lng: interaction.locale }), ephemeral: true })
    }

    // tell everyone that a new poll has been posted
    let mention = interaction.options.getMentionable('mention')
    interaction.channel.send(
      `${mention ? mention : '@everyone'} ${i18next.t('session.alert', { lng: interaction.locale })}`
    )
  },
}
