const { prefix } = require('../config.json')

module.exports = {
  name: 'help',
  description: 'Liste aller Kommandos oder Info zu einem spezifischen Kommando.',
  usage: '[Kommandoname]',
  execute(message, args) {
    const data = []
    const { commands } = message.client

    if (!args.length) {
      data.push('Das sind alle Kommandos, die du verwenden kannst:')
      data.push(commands.map((command) => command.name).join(', '))
      data.push(`\nMit \`${prefix}help [Kommandoname]\` bekommst du mehr Infos zu einem spezifischen Kommando!`)

      return message.channel.send(data, { split: true })
    }

    const name = args[0].toLowerCase()
    const command = commands.get(name)

    if (!command) {
      return message.reply('Das Kommando kenne ich nicht!')
    }

    data.push(`**Name:** ${command.name}`)

    if (command.description) data.push(`**Beschreibung:** ${command.description}`)
    if (command.usage) data.push(`**Verwendung:** ${prefix}${command.name} ${command.usage}`)

    message.channel.send(data, { split: true })
  },
}
