function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = {
  name: 'dice',
  aliases: ['würfel', 'würfeln'],
  description: 'Wirf den virtuellen Würfel.',
  args: false,
  execute(message, args) {
    const result = getRandomInt(1, 6)

    message.channel.send(`${message.author.username} wirft den Würfel des Schicksals 🎲 ...`)
    setTimeout(function () {
      message.channel.send(`${message.author.username} beobachtet ihn ganz genau 👀 ...`)
    }, 2000)
    setTimeout(function () {
      message.channel.send(`Und das Ergebnis ist...`)
    }, 4000)
    setTimeout(function () {
      message.channel.send(`**${result}**! 🎉`)
    }, 7000)
  },
}
