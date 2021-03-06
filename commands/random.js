function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = {
  name: 'random',
  description: 'Wählt zufällig eine der Alternativen aus.',
  usage:
    'wort1 wort2 [wort3] [...]\n\n' +
    `🔹 **wort**: Eines der Wörter, von denen zufällig eines ausgewählt wird..\n` +
    `       - Wörter sind durch Leerzeichen getrennt\n` +
    `       - mindestens 2 müssen angegeben werden\n` +
    `       - nur die ersten 8 werden berücksichtigt (ab dem 9 Wort werden sie ignoriert)\n`,
  args: true,
  execute(message, args) {
    if (!args[0] || !args[1]) {
      return message.channel.send('Bitte gib zumindest 2 Wörter an 🙂 Sonst ist es ja nicht wirklich random 😉')
    }
    let words = [args[0], args[1]]
    for (let i = 2; i < 9; i++) {
      if (args[i]) {
        words.push(args[i])
      }
    }
    const index = getRandomInt(0, words.length - 1)

    message.channel.send(`Und der Sieger ist...`)
    setTimeout(function () {
      message.channel.send(`Trommelwirbel 🥁 ...`)
    }, 1000)
    setTimeout(function () {
      message.channel.send(`**${words[index]}**! 🎉`)
    }, 3000)
  },
}
