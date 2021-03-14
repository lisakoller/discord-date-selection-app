const miscFunctions = require('../utilities/misc')

module.exports = {
  name: 'dice',
  aliases: ['würfel', 'würfeln'],
  description: 'Wirf den virtuellen Würfel.',
  args: false,
  execute(message, args) {
    // get a random number between 1 and 6 (numbers of a dice)
    const result = miscFunctions.getRandomInt(1, 6)

    // send the result with a countdown
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
