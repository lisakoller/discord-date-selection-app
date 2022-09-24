const i18next = require('i18next')
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const dateHandler = require('../utilities/dateHandler')
const moment = require('moment')
moment.locale('de')

const singlePandaUrl = 'https://assets.lisakoller.at/discord/single-panda.jpg'
const teamPandaUrl = 'https://assets.lisakoller.at/discord/team-panda.jpg'
const botIconUrl = 'https://assets.lisakoller.at/discord/calendar.jpg'

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
function buildOptions(max, startingOn) {
  let result = []

  for (let i = 0; i < max; i++) {
    let weekday = startingOn.format('dddd')
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
    icon: emojiList[emojiList.length-1],
    text: `${emojiList[emojiList.length-1]}  Beschäftigt`,
    weekday: 'Beschäftigt',
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
function getBasicEmbed(options, locale) {
  return new EmbedBuilder()
    .setColor(0x72e397)
    .setTitle(i18next.t('session.title', { lng: locale }))
    .setAuthor({
      name: 'Anonymous',
      iconURL: 'https://i.imgur.com/wSTFkRM.png',
    })
    .setDescription(i18next.t('session.desc', { lng: locale }))
    .setThumbnail(singlePandaUrl)
    .addFields(getBasicEmbedFields(options, locale))
    .setTimestamp()
    .setFooter({
      text: 'Version 2.0',
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
function getTopAnswer(sentMessage, reaction) {
  let reactions = sentMessage.reactions.cache//.array()

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
    const owner = guild.members.cache.get(guild.ownerId)
    // TODO locale?
    owner.send(i18next.t('session.finished_message', { memberCount: memberCount, lng: 'de' }))
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
async function updateFields(receivedEmbed, sentMessage, reaction, user, type) {
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
        o.value = getTopAnswer(sentMessage, reaction)

        // the other fields contain a list of users that reacted with that emoji
        // index-2 because there are 2 "standard" fields that need to be subtracted (intro + blank space; see basicEmbedFields)
      } else if (index >= 2 && reaction.emoji.name === emojiList[index - 2]) {
        // depending on the type add the user or remove the user from the list
        o.value = type === 'add' ? String(addUser(o.value, user)) : String(removeUser(o.value, user))
      } else if (index === receivedEmbed.fields.length-1 && reaction.emoji.name === emojiList[emojiList.length-1]) {
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
      de: 'treffen'
    })
    .setDescription('Start a poll when the next gaming-session should take place.')
    .setDescriptionLocalizations({
      de: 'Startet eine Umfrage, wann die nächste Gaming-Session stattfinden soll.'
    })
    .addStringOption((option) => option
      .setName('date')
      .setNameLocalizations({
        de: 'startdatum'
      })
      .setDescription('First day to be proposed. (DD.MM.YYYY) (Default: next monday)')
      .setDescriptionLocalizations({
        de: 'Erster Tag, der vorgeschlagen wird. (DD.MM.YYYY) (Standard: nächster Montag)'
      })
      .setRequired(false)
      .setAutocomplete(true)
    )
    .addIntegerOption((option) => option
      .setName('duration')
      .setNameLocalizations({
        de: 'dauer'
      })
      .setDescription('How many days to choose from.')
      .setDescriptionLocalizations({
        de: 'Wie viele Tage vorgeschlagen werden. (Standard: 7)'
      })
      .setRequired(false)
      .addChoices(
        { name: '2 tage - days', value: 2 },
        { name: '3 tage - days', value: 3 },
        { name: '4 tage - days', value: 4 },
        { name: '5 tage - days', value: 5 },
        { name: '6 tage - days', value: 6 },
        { name: '7 tage - days', value: 7 },
        { name: '8 tage - days', value: 8 },
        { name: '9 tage - days', value: 9 },
        { name: '10 tage - days', value: 10 },
        { name: '11 tage - days', value: 11 },
        { name: '12 tage - days', value: 12 },
        { name: '13 tage - days', value: 13 },
        { name: '14 tage - days', value: 14 },
      )
    ),
    async handleReaction(message, reaction, user, type) {
      try {
        // only do something if the emoji is relevant
        if (emojiList.includes(reaction.emoji.name)) {
          const receivedEmbed = await message.embeds[0]
  
          // update the fields because of the new reaction
          let fields = await updateFields(receivedEmbed, message, reaction, user, type)
  
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
        // TODO locale?
        message.channel.send({ content: i18next.t('errors.general', { lng: 'de' })})
      }
    },
    async execute(interaction) {
      let inputStartingDay = interaction.options.getString('date')
      let inputNDays = interaction.options.getInteger('duration')
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

      // build all options based on the starting day and number of days that should be provided
      const options = buildOptions(nDays, startingDay)
  
      // build the embed and replace the placeholders
      const embed = getBasicEmbed(options, interaction.locale)
      embed.setAuthor({
        name: interaction.member.nickname,
        iconURL: interaction.member.displayAvatarURL() //icon? avatarURL?
      })
  
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
      interaction.channel.send(i18next.t('session.message', { lng: interaction.locale }))
    }
}
