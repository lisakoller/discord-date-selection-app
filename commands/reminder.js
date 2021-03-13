const dateHandler = require('../utilities/dateHandler')
const dynamoDB = require('../utilities/dynamoDB')
const schedule = require('node-schedule')
const moment = require('moment')
moment.locale('de')

function listReminders(message, args) {
  const jobs = schedule.scheduledJobs
  if (jobs && Object.keys(jobs).length === 0) {
    return message.channel.send(`Es stehen keine Reminder aus 👍`)
  }
  let result = `Diese Reminder habe ich im Hinterkopf:\n`
  Object.entries(jobs).forEach(([name, job]) => {
    result += `🗓️ ${name}\n`
  })
  message.channel.send(result)
}

async function addReminder(message, args) {
  if (!args[1] || !args[2]) {
    return message.channel.send(
      `Für dieses Kommando musst du zumindest 2 weitere Argumente angeben (Datum und Uhrzeit) 🙂\nMit \`!help reminder\` kannst du dir mehr Infos dazu holen falls du Hilfe brauchst 😇`
    )
  }

  let reminderDay
  let reminderTime

  try {
    reminderDay = await dateHandler.convertInputToDate(args[1], false, 'weeks')
  } catch(error) {
    return message.channel.send(error)
  }

  const inputTime = moment(args[2], 'HH:mm')
  if (!inputTime.isValid()) {
    return message.channel.send(
      `Ich kann mit der Uhrzeit **${args[2]}** leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: **HH:mm**, also zum Beispiel **18:15**? (wir verwenden 24 Stunden wie zivilisierte Menschen)`
    )
  } else if (reminderDay.isSame(moment(), 'day') && inputTime.isSameOrBefore(moment())) {
    return message.channel.send(
      `Die Uhrzeit muss schon in der Zukunft liegen, was hat ein Reminder sonst für einen Sinn? 🙃\nEventuell ist die Uhrzeit auch zu knapp an der jetzigen Uhrzeit. Für die paar Sekunden hat ein Reminder auch nicht so viel Sinn, oder? 😛`
    )
  } else {
    reminderTime = inputTime
  }

  let reminderStart = reminderDay
  reminderStart = reminderStart.hour(reminderTime.get('hour'))
  reminderStart = reminderStart.minute(reminderTime.get('minute'))
  reminderStart = reminderStart.second(0)

  const date = reminderStart.toDate()
  //const date = new Date(reminderStart.year, reminderStart.month, reminderStart.day, reminderStart.hour, reminderStart.minutes, 0)
  const jobName = reminderStart.format('DD.MM.YYYY HH:mm')

  if (schedule.scheduledJobs[jobName] !== undefined) {
    return message.channel.send(
      `An genau **diesem** Tag zu genau **dieser** Uhrzeit gibt es schon einen Reminder, sorry. Verschieb ihn doch um eine Minute oder lösche zuerst den anderen mit \`!reminder remove ${reminderStart.format(
        'DD.MM.YYYY HH:mm'
      )}\` 😉`
    )
  }

  let customMessage = ``
  if (args[3]) {
    customMessage = '\n' + args.slice(3).join(' ')
  }

  dynamoDB.create(jobName, date, customMessage, message.channel.id)

  const job = schedule.scheduleJob(jobName, date, function () {
    console.info(`The job ${jobName} is now executed!`, moment())
    dynamoDB.delete(jobName)
    message.channel.send(`@everyone 🔔 **Reminder** 🔔${customMessage}`)
  })

  message.channel.send(
    `Dein Reminder wurde registriert und wird am ${reminderStart.format('DD. MMMM YYYY')} um ${reminderStart.format(
      'HH:mm'
    )} Uhr gesendet! 🙂`
  )
}

async function removeReminder(message, args) {
  if (!args[1] || !args[2]) {
    return message.channel.send(
      `Für dieses Kommando musst du 2 weitere Argumente angeben (Datum und Uhrzeit) 🙂\nMit \`!help reminder\` kannst du dir mehr Infos dazu holen falls du Hilfe brauchst 😇`
    )
  }

  let reminderDay
  let reminderTime

  try {
    reminderDay = await dateHandler.convertInputToDate(args[1], true)
  } catch(error) {
    return message.channel.send(error)
  }

  const inputTime = moment(args[2], 'HH:mm')
  if (!inputTime.isValid()) {
    return message.channel.send(
      `Ich kann mit der Uhrzeit **${args[2]}** leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: **HH:mm**, also zum Beispiel **18:15**? (wir verwenden 24 Stunden wie zivilisierte Menschen)`
    )
  } else {
    reminderTime = inputTime
  }

  try {
    const jobName = `${reminderDay.format('DD.MM.YYYY')} ${reminderTime.format('HH:mm')}`
    let job = schedule.scheduledJobs[jobName]
    if (job === undefined) {
      message.channel.send(`Ich konnte keinen passenden Reminder finden 🤔`)
      listReminders(message, args)
      return
    } else {
      job.cancel()
      dynamoDB.delete(jobName)
    }
  } catch (e) {
    console.error(e)
    return message.channel.send(`Da hat etwas nicht funktioniert! 🤯`)
  }
  message.channel.send(
    `Der Reminder am ${reminderDay.format('DD. MMMM YYYY')} um ${reminderTime.format(
      'HH:mm'
    )} wurde erfolgreich gelöscht! 🗑️`
  )
}

function removeAllReminders(message, args) {
  const jobs = schedule.scheduledJobs
  if (jobs && Object.keys(jobs).length === 0) {
    return message.channel.send(`Es stehen sowieso keine Reminder aus 👍`)
  }
  let result = `Die folgenden Reminder wurden gelöscht:\n`
  Object.entries(jobs).forEach(([name, job]) => {
    result += `🗓️ ${name}\n`
    job.cancel()
  })
  dynamoDB.deleteAll()
  message.channel.send(result)
}

module.exports = {
  name: 'reminder',
  aliases: ['erinnerung', 'wecker'],
  description: 'Lass eine Meldung zu einem bestimmten Zeitpunkt erscheinen.',
  usage:
    `add/remove/list/clear [Datum] [Uhrzeit] [Nachricht]\n\n` +
    `🔹 **add**: Einen neuen Reminder erstellen.\n` +
    `       - Synonyme: \`new\`, \`neu\`\n` +
    `       - erfordert die Angabe von Datum und Uhrzeit\n` +
    `       - die Nachricht kann optional angegeben werden\n` +
    `       - Beispiel: \`!reminder add heute 18:00 Notice me Senpai!\`\n` +
    `🔹 **remove**: Löscht einen vorgemerkten Reminder.\n` +
    `       - Synonyme: \`rm\`, \`delete\`, \`löschen\`\n` +
    `       - erfordert die Angabe von Datum und Uhrzeit\n` +
    `       - Beispiel: \`!reminder remove heute 18:00\`\n` +
    `🔹 **list**: Zeigt alle bevorstehenden Reminder an.\n` +
    `       - Synonyme: \`ls\`, \`all\`, \`alle\`\n` +
    `       - Datum und Uhrzeit werden **nicht** benötigt\n` +
    `       - Verwendung: \`!reminder list\`\n` +
    `🔹 **clear**: Löscht **alle** vorgemerkten Reminder.\n` +
    `       - Synonyme: \`removeAll\`, \`alleLöschen\`\n` +
    `       - Datum und Uhrzeit werden **nicht** benötigt\n` +
    `       - Verwendung: \`!reminder clear\`\n` +
    `🔸 **[Datum]**: Tag, an dem der Reminder erscheinen soll.\n` +
    `       - Datum in der Form \`13.05.2021\`, ein Wochentag (automatisch der nächste z. B. \`Mittwoch\`) oder \`heute\`, \`morgen\`, \`übermorgen\`\n` +
    `🔸 **[Uhrzeit]**: Uhrzeit, an dem der Reminder erscheinen soll.\n` +
    `       - Uhrzeit in der Form \`18:15\` (wir verwenden 24 Stunden wie zivilisierte Menschen)\n` +
    `🔸 **[Nachricht]**: Beliebige Nachricht, die mit dem Reminder ausgegeben wird.\n` +
    `       - Das Ergebnis sieht dann so aus:\n` +
    `         🔔 **Reminder** 🔔\n` +
    `         [Nachricht]\n\n`,
  args: false, // for specific error message with hints,
  setReminders(reminders, client) {
    reminders.forEach((reminder) => {
      const job = schedule.scheduleJob(reminder.jobName, reminder.date, function () {
        console.info(`The job ${reminder.jobName} is now executed!`, moment())
        client.channels.cache.get(reminder.channel).send(`@everyone 🔔 **Reminder** 🔔${reminder.customMessage || ''}`)
        dynamoDB.delete(reminder.jobName)
      })
    })
  },
  execute(message, args) {
    if (!args[0]) {
      return message.channel.send(
        `Für dieses Kommando musst du Argumente angeben (\`list\`, \`add\`, \`remove\`, \`clear\`) 🙂\nWenn du weitere Infos dazu brauchst verwende \`!help reminder\` 😇`
      )
    }

    if (args[0] === 'add' || args[0] === 'new' || args[0] === 'neu') {
      addReminder(message, args)
    } else if (args[0] === 'list' || args[0] === 'ls' || args[0] === 'all' || args[0] === 'alle') {
      listReminders(message, args)
    } else if (args[0] === 'remove' || args[0] === 'rm' || args[0] === 'delete' || args[0] === 'löschen') {
      removeReminder(message, args)
    } else if (args[0] === 'clear' || args[0] === 'removeAll' || args[0] === 'removeall' || args[0] === 'alleLöschen') {
      removeAllReminders(message, args)
    } else {
      return message.channel.send(
        `Mit dem Argument \`${args[0]}\` kann ich leider nichts anfangen 🤔\nIch verstehe nur \`add\`, \`remove\`, \`list\`, \`clear\` und all ihre Synonyme. Mit \`!help reminder\` gibt's mehr Infos 🙂`
      )
    }
  },
}
