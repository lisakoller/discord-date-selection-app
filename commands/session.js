const moment = require('moment')

const singlePandaUrl = 'https://assets.lisakoller.at/discord/single-panda.jpg'
const teamPandaUrl = 'https://assets.lisakoller.at/discord/team-panda.jpg'

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
  fields: [
    {
      name: 'Aktuell am häufigsten genannt',
      value: '-',
    },
    {
      name: '\u200b',
      value: '\u200b',
      inline: false,
    },
    {
      name: `🌙 Montag (${nextMonday.date()}.)`,
      value: '-',
      inline: true,
    },
    {
      name: `🔥 Dienstag (${nextMonday.add(1, 'days').date()}.)`,
      value: '-',
      inline: true,
    },
    {
      name: `💧 Mittwoch (${nextMonday.add(1, 'days').date()}.)`,
      value: '-',
      inline: true,
    },
    {
      name: `🌳 Donnerstag (${nextMonday.add(1, 'days').date()}.)`,
      value: '-',
      inline: true,
    },
    {
      name: `💰 Freitag (${nextMonday.add(1, 'days').date()}.)`,
      value: '-',
      inline: true,
    },
    {
      name: `⛰ Samstag (${nextMonday.add(1, 'days').date()}.)`,
      value: '-',
      inline: true,
    },
    {
      name: `☀ Sonntag (${nextMonday.add(1, 'days').date()}.)`,
      value: '-',
      inline: true,
    },
  ],
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
  let monday
  let tuesday
  let wednesday
  let thursday
  let friday
  let saturday
  let sunday
  reactions.forEach((react) => {
    switch (react.emoji.name) {
      case '🌙':
        monday = react.count
        break
      case '🔥':
        tuesday = react.count
        break
      case '💧':
        wednesday = react.count
        break
      case '🌳':
        thursday = react.count
        break
      case '💰':
        friday = react.count
        break
      case '⛰':
        saturday = react.count
        break
      case '☀':
        sunday = react.count
        break
    }
  })

  const max = Math.max(
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday
  )

  if (max === 1) {
    return '-'
  }

  let result = ''
  if (monday === max) result += `🌙 Montag\n`
  if (tuesday === max) result += `🔥 Dienstag\n`
  if (wednesday === max) result += `💧 Mittwoch\n`
  if (thursday === max) result += `🌳 Donnerstag\n`
  if (friday === max) result += `💰 Freitag\n`
  if (saturday === max) result += `⛰ Samstag\n`
  if (sunday === max) result += `☀ Sonntag\n`
  return result.length > 0 ? result : '-'
}

module.exports = {
  name: 'session',
  description: 'When should the next session take place?',
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
      .send({ /*files: [file], */embed: embed })
      .then((sentMessage) => {
        sentMessage
          .react('🌙')
          .then(() => sentMessage.react('🔥'))
          .then(() => sentMessage.react('💧'))
          .then(() => sentMessage.react('🌳'))
          .then(() => sentMessage.react('💰'))
          .then(() => sentMessage.react('⛰'))
          .then(() => sentMessage.react('☀'))
          .catch(() => console.error('One of the emojis failed to react.'))

        const filter = (reaction, user) => {
          return (
            user.username !== 'Date-Selection-Bot' &&
            (reaction.emoji.name === '🌙' ||
              reaction.emoji.name === '🔥' ||
              reaction.emoji.name === '💧' ||
              reaction.emoji.name === '🌳' ||
              reaction.emoji.name === '💰' ||
              reaction.emoji.name === '⛰' ||
              reaction.emoji.name === '☀')
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
              case index === 2 && reaction.emoji.name === '🌙':
                o.value = addUser(o.value, user)
                break
              case index === 3 && reaction.emoji.name === '🔥':
                o.value = addUser(o.value, user)
                break
              case index === 4 && reaction.emoji.name === '💧':
                o.value = addUser(o.value, user)
                break
              case index === 5 && reaction.emoji.name === '🌳':
                o.value = addUser(o.value, user)
                break
              case index === 6 && reaction.emoji.name === '💰':
                o.value = addUser(o.value, user)
                break
              case index === 7 && reaction.emoji.name === '⛰':
                o.value = addUser(o.value, user)
                break
              case index === 8 && reaction.emoji.name === '☀':
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
            footer: receivedEmbed.footer
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
              case index === 2 && reaction.emoji.name === '🌙':
                o.value = removeUser(o.value, user)
                break
              case index === 3 && reaction.emoji.name === '🔥':
                o.value = removeUser(o.value, user)
                break
              case index === 4 && reaction.emoji.name === '💧':
                o.value = removeUser(o.value, user)
                break
              case index === 5 && reaction.emoji.name === '🌳':
                o.value = removeUser(o.value, user)
                break
              case index === 6 && reaction.emoji.name === '💰':
                o.value = removeUser(o.value, user)
                break
              case index === 7 && reaction.emoji.name === '⛰':
                o.value = removeUser(o.value, user)
                break
              case index === 8 && reaction.emoji.name === '☀':
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
            footer: receivedEmbed.footer
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
