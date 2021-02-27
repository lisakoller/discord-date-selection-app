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

const emojiList = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿']
let options = []
for(let i = 0; i < nDays; i++) {
  nextMonday.add(i === 0 ? 0 : 1, 'days')
  let weekday = nextMonday.format('dddd')
  let dateAsNumber = nextMonday.date()
  let icon = emojiList[i]
  options.push(
    {
      'icon': icon,
      'text': `${icon}  ${weekday} (${dateAsNumber}.)`,
      'weekday': weekday,
      'value': '-'
    }
  )
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
    }
  ]
  
  let basicEmbedFieldsB = []
  options.forEach(option => {
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
  description:
    'Wann würde es euch am besten passen?\nStandard-Startzeit: 20:00 Uhr 🕗',
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
  let day0
  let day1
  let day2
  let day3
  let day4
  let day5
  let day6
  reactions.forEach((react) => {
    switch (react.emoji.name) {
      case options[0]['icon']:
        day0 = react.count
        break
      case options[1]['icon']:
        day1 = react.count
        break
      case options[2]['icon']:
        day2 = react.count
        break
      case options[3]['icon']:
        day3 = react.count
        break
      case options[4]['icon']:
        day4 = react.count
        break
      case options[5]['icon']:
        day5 = react.count
        break
      case options[6]['icon']:
        day6 = react.count
        break
    }
  })

  const max = Math.max(
    day0,
    day1,
    day2,
    day3,
    day4,
    day5,
    day6
  )

  if (max === 1) {
    return '-'
  }

  let result = ''
  if (day0 === max) result += `${options[0]['icon']} ${options[0]['weekday']}\n`
  if (day1 === max) result += `${options[1]['icon']} ${options[1]['weekday']}\n`
  if (day2 === max) result += `${options[2]['icon']} ${options[2]['weekday']}\n`
  if (day3 === max) result += `${options[3]['icon']} ${options[3]['weekday']}\n`
  if (day4 === max) result += `${options[4]['icon']} ${options[4]['weekday']}\n`
  if (day5 === max) result += `${options[5]['icon']} ${options[5]['weekday']}\n`
  if (day6 === max) result += `${options[6]['icon']} ${options[6]['weekday']}\n`
  return result.length > 0 ? result : '-'
}

module.exports = {
  name: 'session',
  description: 'Wann soll die nächste Session stattfinden?',
  args: false,
  execute(message, args) {
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

    message.channel
      .send({ /*files: [file], */ embed: embed })
      .then((sentMessage) => {
        sentMessage
          .react(options[0]['icon'])
          .then(() => sentMessage.react(options[1]['icon']))
          .then(() => sentMessage.react(options[2]['icon']))
          .then(() => sentMessage.react(options[3]['icon']))
          .then(() => sentMessage.react(options[4]['icon']))
          .then(() => sentMessage.react(options[5]['icon']))
          .then(() => sentMessage.react(options[6]['icon']))
          .catch(() => console.error('One of the emojis failed to react.'))

        const filter = (reaction, user) => {
          return (
            user.username !== 'Date-Selection-Bot' &&
            options.some(option => option.icon === reaction.emoji.name)
          )
        }

        const collector = sentMessage.createReactionCollector(filter, {
          dispose: true,
        })

        collector.on('collect', (reaction, user) => {
          console.log(`Collected ${reaction.emoji.name} from ${user.tag}`)

          const receivedEmbed = sentMessage.embeds[0]

          let fields = receivedEmbed.fields.map((entry, index) => {
            let o = Object.assign({}, entry)

            switch (true) {
              case index === 0:
                o.value = getTopAnswer(sentMessage)
                break
              case index === 2 && reaction.emoji.name === options[0]['icon']:
                o.value = addUser(o.value, user)
                break
              case index === 3 && reaction.emoji.name === options[1]['icon']:
                o.value = addUser(o.value, user)
                break
              case index === 4 && reaction.emoji.name === options[2]['icon']:
                o.value = addUser(o.value, user)
                break
              case index === 5 && reaction.emoji.name === options[3]['icon']:
                o.value = addUser(o.value, user)
                break
              case index === 6 && reaction.emoji.name === options[4]['icon']:
                o.value = addUser(o.value, user)
                break
              case index === 7 && reaction.emoji.name === options[5]['icon']:
                o.value = addUser(o.value, user)
                break
              case index === 8 && reaction.emoji.name === options[6]['icon']:
                o.value = addUser(o.value, user)
                break
            }
            return o
          })

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

          sentMessage.edit({ embed: updatedEmbed })
        })

        collector.on('remove', (reaction, user) => {
          console.log(`Remove ${reaction.emoji.name} from ${user.tag}`)

          const receivedEmbed = sentMessage.embeds[0]

          let fields = receivedEmbed.fields.map((entry, index) => {
            let o = Object.assign({}, entry)

            switch (true) {
              case index === 0:
                o.value = getTopAnswer(sentMessage)
                break
              case index === 2 && reaction.emoji.name === options[0]['icon']:
                o.value = removeUser(o.value, user)
                break
              case index === 3 && reaction.emoji.name === options[1]['icon']:
                o.value = removeUser(o.value, user)
                break
              case index === 4 && reaction.emoji.name === options[2]['icon']:
                o.value = removeUser(o.value, user)
                break
              case index === 5 && reaction.emoji.name === options[3]['icon']:
                o.value = removeUser(o.value, user)
                break
              case index === 6 && reaction.emoji.name === options[4]['icon']:
                o.value = removeUser(o.value, user)
                break
              case index === 7 && reaction.emoji.name === options[5]['icon']:
                o.value = removeUser(o.value, user)
                break
              case index === 8 && reaction.emoji.name === options[6]['icon']:
                o.value = removeUser(o.value, user)
                break
            }
            return o
          })

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

          sentMessage.edit({ embed: updatedEmbed })
        })

        collector.on('end', (collected) => {
          console.log(`Collected ${collected.size} items`)
        })
      })
    message.channel.send('@everyone Es gibt wieder was zum Abstimmen ⬆')
  },
}
