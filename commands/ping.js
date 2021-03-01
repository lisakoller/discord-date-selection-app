module.exports = {
  name: 'ping',
  description: 'Ein einfacher Weg um zu sehen, ob der Bot online ist.',
  args: false,
  execute(message, args) {
    message.channel.send('Pong! 🏓')
  },
}
