module.exports = {
  name: 'ping',
  description: 'Ping!',
  args: false,
  execute(message, args) {
    message.channel.send('Pong.')
  },
}
