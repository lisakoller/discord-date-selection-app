const dateHandler = require('../utilities/dateHandler')
const moment = require('moment')
moment.locale('de')

const singlePandaUrl = 'https://assets.lisakoller.at/discord/single-panda.jpg'
const teamPandaUrl = 'https://assets.lisakoller.at/discord/team-panda.jpg'

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

function buildOptions(max, startingOn) {
  let result = []
  for (let i = 0; i < max; i++) {
    startingOn.add(i === 0 ? 0 : 1, 'days')
    let weekday = startingOn.format('dddd')
    let dateAsNumber = startingOn.date()
    let icon = emojiList[i]
    result.push({
      icon: icon,
      text: `${icon}  ${weekday} (${dateAsNumber}.)`,
      weekday: weekday,
      value: '-',
    })
  }
  return result
}

function _getBasicEmbedFields(options) {
  const basicEmbedFieldsA = [
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

  let basicEmbedFieldsB = []
  options.forEach((option) => {
    basicEmbedFieldsB.push({ name: option['text'], value: option['value'], inline: true })
  })

  return basicEmbedFieldsA.concat(basicEmbedFieldsB)
}

function _getBasicEmbed(options) {
  return {
    color: 0x72e397,
    title: 'Nächste Gaming-Session',
    //url: 'https://discord.js.org',
    author: {
      name: 'VIP',
      icon_url: 'https://i.imgur.com/wSTFkRM.png',
      //url: 'https://discord.js.org',
    },
    description: 'Wann würde es euch am besten passen?\nStandard-Startzeit: 20:00 Uhr 🕗',
    thumbnail: {
      url: singlePandaUrl,
    },
    fields: _getBasicEmbedFields(options),
    /*image: {
      url: 'attachment://single-panda.jpg',
    },*/
    timestamp: new Date(),
    footer: {
      text: 'Version 1.0',
      //icon_url: 'https://i.imgur.com/wSTFkRM.png',
    },
  }
}

function addUser(value, user) {
  if (value === '-') {
    return user
  }

  const listOfUsers = value
    .trim()
    .replace(/[<>]/g, '')
    .split('@')
    .filter((e) => e.length !== 0)
  if (listOfUsers.includes(user.id)) {
    console.log(`adding user ${user} not needed`)
    return value
  } else {
    console.log(`adding user ${user} to ${value}`)
    return (value += `\n${user}`)
  }
}

function removeUser(value, user) {
  let newValue = value.replace(`<@${user.id}>`, '')
  return newValue.length === 0 ? '-' : newValue
}

function getTopAnswer(sentMessage) {
  let reactions = sentMessage.reactions.cache.array()

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
  if (max === 1) {
    return '-'
  }

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
            return parts[2]
          }
        })
      result += `${entry.icon} ${weekday.join('')}\n`
    })

  const guild = sentMessage.guild
  const memberCount = guild.members.cache.filter((member) => !member.user.bot).size
  if (max - 1 >= memberCount) {
    console.log(`Yay! All ${memberCount} members have voted!`)
    guild.owner.user.send(
      `Ziel erreicht! 🙂\nEs haben alle ${memberCount} bei einer Umfrage für den selben Tag gestimmt! Überprüf nochmal ob es mehrere Tage betrifft und entscheide dich in dem Fall für einen! 🙂`
    )
  }

  return result.length > 0 ? result : '-'
}

async function updateFields(receivedEmbed, sentMessage, reaction, user, type) {
  return new Promise((resolve, reject) => {
    if (!(type === 'add' || type === 'remove')) {
      reject('Wrong type!')
    }
    let result = receivedEmbed.fields.map((entry, index) => {
      let o = Object.assign({}, entry)

      if (index === 0) {
        o.value = getTopAnswer(sentMessage)
      } else if (index >= 2 && reaction.emoji.name === emojiList[index - 2]) {
        // index-2 because there are 2 "standard" fields that need to be subtracted (intro + blank space; see basicEmbedFieldsA)
        o.value = type === 'add' ? addUser(o.value, user) : removeUser(o.value, user)
      }

      return o
    })
    resolve(result)
  })
}

module.exports = {
  name: 'session',
  aliases: ['termin'],
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
      if (emojiList.includes(reaction.emoji.name)) {
        const receivedEmbed = await message.embeds[0]

        let fields = await updateFields(receivedEmbed, message, reaction, user, type)

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

        message.edit({ embed: updatedEmbed })
      } else {
        console.log('Wrong reaction dude 🙄')
      }
    } catch (error) {
      console.log('Something went wrong: ', error)
      message.channel.send(`Da hat etwas nicht funktioniert 🤯`)
    }
  },
  async execute(message, args) {
    let startingDay
    let nDays

    if (!args.length) {
      startingDay = dateHandler.getStartingDateByISO()
      nDays = 7
    } else if (args[0]) {
      if (args[0] === 'test') {
        return message.channel.send('Just testing, I see 🧐')
      } else if (dateHandler.availableStartingWeekdays.some((day) => day.text === args[0].toLowerCase())) {
        startingDay = dateHandler.getStartingDateByISO(
          dateHandler.availableStartingWeekdays.find((day) => day.text === args[0].toLowerCase()).isoWeekday
        )
      } else if (dateHandler.availableRelativeStartingDays.some((day) => day.text === args[0].toLowerCase())) {
        startingDay = dateHandler.getStartingDateByToday(
          dateHandler.availableRelativeStartingDays.find((day) => day.text === args[0].toLowerCase()).addDays
        )
      } else {
        const inputDate = moment(args[0], 'DD.MM.YYYY')
        if (!inputDate.isValid()) {
          return message.channel.send(
            `Ich kann mit dem Startdatum **${args[0]}** leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: **DD.MM.YYYY**, also zum Beispiel **13.05.2021**? Alternativ kannst du auch einen Wochentag angeben, dann wird zum Beispiel der nächste Dienstag genommen. Wörter wie **heute**, **morgen** und **übermorgen** funktionieren auch 😇`
          )
        } else if (inputDate.isBefore(moment(), 'day')) {
          return message.channel.send(
            `Hey, Zeitreisender! Ein Startdatum in der Vergangenheit macht nicht so viel Sinn, oder? 😉 Ich tu mal so als hättest du das nicht geschrieben 😛`
          )
        } else if (inputDate.isAfter(moment().add(2, 'months'))) {
          return message.channel.send(
            `Eine gute Planung ist Gold wert, aber mehr als zwei Monate in die Zukunft muss man nun wirklich nicht planen, oder? 😉 Gib bitte ein Startdatum innerhalb der nächsten zwei Monate an 🙂`
          )
        } else {
          startingDay = inputDate
        }
      }

      if (args[1]) {
        const inputNumber = parseInt(args[1])
        if (!Number.isInteger(inputNumber)) {
          return message.channel.send(`${args[1]} ist keine gültige, ganze Zahl. Halbe Tage gibt's nicht 😉`)
        } else if (inputNumber <= 0) {
          return message.channel.send(
            `Die Anzahl an Tagen muss eine positive, ganze Zahl sein. Das trifft auf ${args[1]} leider nicht zu 😉`
          )
        } else if (inputNumber === 1) {
          return message.channel.send(`I see what you did there 😏 Zumindest 2 Optionen sollten es aber schon sein 😂`)
        } else if (inputNumber > 14) {
          return message.channel.send(
            `Muss man wirklich ${args[1]} Tage zur Abstimmung geben? 😅 Bitte gib nicht mehr als 14 an 🙂`
          )
        } else {
          nDays = inputNumber
        }
      } else {
        nDays = 7
      }
    }

    const options = buildOptions(nDays, startingDay)

    const embed = _getBasicEmbed(options)
    embed.author.name = message.author['username']
    embed.author.icon_url = message.author.avatarURL()

    try {
      let sentMessage = await message.channel.send({ /*files: [file], */ embed: embed })
      options.forEach(async (option) => {
        await sentMessage.react(option['icon'])
      })
    } catch (error) {
      console.error('One of the emojis failed to react.')
      message.channel.send(`Da hat etwas nicht funktioniert 🤯`)
    }

    message.channel.send('@everyone Es gibt wieder was zum Abstimmen ⬆')
  },
}
