const moment = require('moment')
moment.locale('de')

const singlePandaUrl = 'https://assets.lisakoller.at/discord/single-panda.jpg'
const teamPandaUrl = 'https://assets.lisakoller.at/discord/team-panda.jpg'

const nDays = 7

const nextMonday = getNextMonday()

function getNextMonday() {
  const dayINeed = 1

  // if we haven’t yet passed the day of the week that I need:
  if (moment().isoWeekday() <= dayINeed) {
    // then just give me this week’s instance of that day
    return moment().isoWeekday(dayINeed)
  } else {
    // otherwise, give me next week’s instance of that day
    return moment().add(1, 'weeks').isoWeekday(dayINeed)
  }
}

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
let options = buildOptions(nDays, nextMonday)

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

function _getBasicEmbedFields() {
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

const basicEmbed = {
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
  fields: _getBasicEmbedFields(),
  /*image: {
    url: 'attachment://single-panda.jpg',
  },*/
  timestamp: new Date(),
  footer: {
    text: 'Version 1.0',
    //icon_url: 'https://i.imgur.com/wSTFkRM.png',
  },
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
      } else if (index >= 2 && reaction.emoji.name === options[index - 2]['icon']) {
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
  description: 'Wann soll die nächste Session stattfinden?',
  args: false,
  async handleReaction(message, reaction, user, type) {
    try {
      if (options.some((option) => option.icon === reaction.emoji.name)) {
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
    }
  },
  async execute(message, args) {
    /*if (!args.length) {
      return message.channel.send(
        `You didn't provide any arguments, ${message.author}!`
      )
    } else if (args[0] === 'test') {
      return message.channel.send('Just testing, I see 🧐')
    }*/
    const embed = basicEmbed
    embed.author.name = message.author['username']
    embed.author.icon_url = message.author.avatarURL()

    try {
      let sentMessage = await message.channel.send({ /*files: [file], */ embed: embed })
      options.forEach(async (option) => {
        await sentMessage.react(option['icon'])
      })
    } catch (error) {
      console.error('One of the emojis failed to react.')
    }

    message.channel.send('@everyone Es gibt wieder was zum Abstimmen ⬆')
  },
}
