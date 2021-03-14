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

  return result
}

/**
 * convert options to embed fields
 * @param {array} options all days that should be displayed
 * @returns array of embed fields
 */
function getBasicEmbedFields(options) {
  // first two fields contain general information and whitespace
  let basicEmbedFields = [
    {
      name: 'Aktuell am häufigsten genannt',
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
function getBasicEmbed(options) {
  return {
    color: 0x72e397,
    title: 'Nächste Gaming-Session',
    author: {
      name: 'Anonymous',
      icon_url: 'https://i.imgur.com/wSTFkRM.png',
    },
    description: 'Wann würde es euch am besten passen?\nStandard-Startzeit: 20:00 Uhr 🕗',
    thumbnail: {
      url: singlePandaUrl,
    },
    fields: getBasicEmbedFields(options),
    timestamp: new Date(),
    footer: {
      text: 'Version 1.0',
      icon_url: botIconUrl,
    },
  }
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
  let reactions = sentMessage.reactions.cache.array()

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
    guild.owner.send(
      `Ziel erreicht! 🙂\nEs haben alle ${memberCount} bei einer Umfrage für den selben Tag gestimmt! Überprüf nochmal ob es mehrere Tage betrifft und entscheide dich in dem Fall für einen! 🙂`
    )
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
        o.value = type === 'add' ? addUser(o.value, user) : removeUser(o.value, user)
      }
      return o
    })
    resolve(result)
  })
}

module.exports = {
  name: 'session',
  aliases: ['poll', 'termin', 'meeting', 'treffen'],
  description: 'Startet eine Umfrage, wann die nächste Gaming-Session stattfinden soll.',
  usage:
    `[erster Tag] [Dauer]\n\n` +
    `🔹 **[erster Tag]**: Erster Tag, der vorgeschlagen wird.\n` +
    `       - optional\n` +
    `       - Datum in der Form \`13.05.2021\`, ein Wochentag (automatisch der nächste z. B. \`Mittwoch\`) oder \`heute\`, \`morgen\`, \`übermorgen\`\n` +
    `       - wenn kein Tag angegeben dann automatisch der nächste Montag\n` +
    `🔹 **[Dauer]**: Wie viele Tage vorgeschlagen werden.\n` +
    `       - optional\n` +
    `       - positive, ganze Zahl kleiner 15\n` +
    `       - wenn keine angegeben automatisch 7`,
  args: false, // because args are not required
  async handleReaction(message, reaction, user, type) {
    try {
      // only do something if the emoji is relevant
      if (emojiList.includes(reaction.emoji.name)) {
        const receivedEmbed = await message.embeds[0]

        // update the fields because of the new reaction
        let fields = await updateFields(receivedEmbed, message, reaction, user, type)

        // update the embed
        const updatedEmbed = {
          color: receivedEmbed.color,
          title: receivedEmbed.title,
          author: receivedEmbed.author,
          description: receivedEmbed.description,
          thumbnail: receivedEmbed.thumbnail,
          fields: fields,
          timestamp: receivedEmbed.timestamp,
          footer: receivedEmbed.footer,
        }

        // edit the original message
        message.edit({ embed: updatedEmbed })
      } else {
        console.info('Wrong reaction dude 🙄')
      }
    } catch (error) {
      console.error('Something went wrong: ', error)
      message.channel.send(`Da hat etwas nicht funktioniert 🤯`)
    }
  },
  async execute(message, args) {
    let startingDay
    let nDays

    // if no args are provided use the next monday and 7 days
    if (!args.length) {
      startingDay = dateHandler.getStartingDateByISO()
      nDays = 7
      // if a day is provided
    } else if (args[0]) {
      try {
        // try to convert the input to a valid date
        startingDay = await dateHandler.convertInputToDate(args[0])
      } catch (error) {
        return message.channel.send(error)
      }

      // if a length is provided
      if (args[1]) {
        // try to convert the input to an integer
        const inputNumber = parseInt(args[1])

        // validate the number
        if (!Number.isInteger(inputNumber)) {
          return message.channel.send(`${args[1]} ist keine gültige, ganze Zahl. Halbe Tage gibt's nicht 😉`)

          // negative days are not allowed
        } else if (inputNumber <= 0) {
          return message.channel.send(
            `Die Anzahl an Tagen muss eine positive, ganze Zahl sein. Das trifft auf ${args[1]} leider nicht zu 😉`
          )

          // 1 day is not allowed (there needs to be a choice)
        } else if (inputNumber === 1) {
          return message.channel.send(`I see what you did there 😏 Zumindest 2 Optionen sollten es aber schon sein 😂`)

          // more than 14 days are not allowed (not too far into the future)
        } else if (inputNumber > 14) {
          return message.channel.send(
            `Muss man wirklich ${args[1]} Tage zur Abstimmung geben? 😅 Bitte gib nicht mehr als 14 an 🙂`
          )

          // the number is okay
        } else {
          nDays = inputNumber
        }

        // if no number is provided use 7
      } else {
        nDays = 7
      }
    }

    // build all options based on the starting day and number of days that should be provided
    const options = buildOptions(nDays, startingDay)

    // build the embed and replace the placeholders
    const embed = getBasicEmbed(options)
    embed.author.name = message.author['username']
    embed.author.icon_url = message.author.avatarURL()

    try {
      // send the message in the same channel
      let sentMessage = await message.channel.send({ embed: embed })

      // react with all emojis in order
      options.forEach(async (option) => {
        await sentMessage.react(option['icon'])
      })
    } catch (error) {
      console.error('One of the emojis failed to react.')
      message.channel.send(`Da hat etwas nicht funktioniert 🤯`)
    }

    // tell everyone that a new poll has been posted
    message.channel.send('@everyone Es gibt wieder was zum Abstimmen ⬆')
  },
}
