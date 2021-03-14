const dateHandler = require('../utilities/dateHandler')
const dynamoDB = require('../utilities/dynamoDB')
const schedule = require('node-schedule')
const moment = require('moment-timezone')
moment.locale('de')

/**
 * list all saved reminders
 * @param {discord message object} message message that contained the command
 * @returns a message that is sent to the channel
 */
function listReminders(message) {
  // get all saved reminders
  const jobs = schedule.scheduledJobs

  // if there are no reminders saved
  if (jobs && Object.keys(jobs).length === 0) {
    return message.channel.send(`Es stehen keine Reminder aus 👍`)
  }

  // else format a list of all reminders
  let result = `Diese Reminder habe ich im Hinterkopf:\n`
  Object.entries(jobs).forEach(([name]) => {
    result += `🗓️ ${name}\n`
  })
  return message.channel.send(result)
}

/**
 * save a new reminder
 * @param {discord message object} message message that contained the command
 * @param {array} args input by the user
 * @returns a message that is sent to the channel
 */
async function addReminder(message, args) {
  // return if there are no arguments provided
  if (!args[1] || !args[2]) {
    return message.channel.send(
      `Für dieses Kommando musst du zumindest 2 weitere Argumente angeben (Datum und Uhrzeit) 🙂\nMit \`!help reminder\` kannst du dir mehr Infos dazu holen falls du Hilfe brauchst 😇`
    )
  }

  let reminderDay
  let reminderTime

  try {
    // try to convert the input to a valid date
    reminderDay = await dateHandler.convertInputToDate(args[1], false, 'weeks')
    console.log("INPUT REMINDER DAY: ", reminderDay)
  } catch (errorMessage) {
    return message.channel.send(errorMessage)
  }

  // try to convert the input to a valid time
  const inputTime = moment.tz(`${reminderDay.format('DD.MM.YYYY')} ${args[2]}`, ' DD.MM.YYYY HH:mm', 'Europe/Vienna')
  console.log("INPUT REMINDER TIME: ", inputTime)
  if (!inputTime.isValid()) {
    return message.channel.send(
      `Ich kann mit der Uhrzeit **${args[2]}** leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: **HH:mm**, also zum Beispiel **18:15**? (wir verwenden 24 Stunden wie zivilisierte Menschen)`
    )

    // check if the provided time is in the past
  } else if (reminderDay.isSame(moment(), 'day') && inputTime.isSameOrBefore(moment())) {
    return message.channel.send(
      `Die Uhrzeit muss schon in der Zukunft liegen, was hat ein Reminder sonst für einen Sinn? 🙃\nEventuell ist die Uhrzeit auch zu knapp an der jetzigen Uhrzeit. Für die paar Sekunden hat ein Reminder auch nicht so viel Sinn, oder? 😛`
    )

    // time is okay
  } else {
    reminderTime = inputTime
  }

  // combine day and time moment objects
  let reminderStart = inputTime//reminderDay
  /*reminderStart = reminderStart.hour(reminderTime.get('hour'))
  reminderStart = reminderStart.minute(reminderTime.get('minute'))
  reminderStart = reminderStart.second(0)*/
  console.log("COMINBED INPUT: ", reminderDay)

  // convert to normal date object for node-scheduler and create jobName
  const date = reminderStart.toDate()
  console.log("RESULTING JS DATE: ", date)
  const jobName = reminderStart.format('DD.MM.YYYY HH:mm')

  // check if no reminder is saved on the same day at the same time
  if (schedule.scheduledJobs[jobName] !== undefined) {
    return message.channel.send(
      `An genau **diesem** Tag zu genau **dieser** Uhrzeit gibt es schon einen Reminder, sorry. Verschieb ihn doch um eine Minute oder lösche zuerst den anderen mit \`!reminder remove ${reminderStart.format(
        'DD.MM.YYYY HH:mm'
      )}\` 😉`
    )
  }

  // check if the user wants to add a custom message
  let customMessage = ``
  if (args[3]) {
    customMessage = '\n' + args.slice(3).join(' ')
  }

  // save the reminder in the dynamoDB
  dynamoDB.create(jobName, date, customMessage, message.channel.id)

  // save the reminder in the node-schedule
  const job = schedule.scheduleJob(jobName, date, function () {
    console.info(`The job ${jobName} is now executed!`, moment())
    dynamoDB.delete(jobName)
    message.channel.send(`@everyone 🔔 **Reminder** 🔔${customMessage || ''}`)
  })

  // tell the user that adding the reminder was successful
  return message.channel.send(
    `Dein Reminder wurde registriert und wird am ${reminderStart.format('DD. MMMM YYYY')} um ${reminderStart.format(
      'HH:mm'
    )} Uhr gesendet! 🙂`
  )
}

/**
 * remove a reminder
 * @param {discord message object} message message that contained the command
 * @param {array} args input by the user
 * @returns a message that is sent to the channel
 */
async function removeReminder(message, args) {
  // return if there are no arguments provided
  if (!args[1] || !args[2]) {
    return message.channel.send(
      `Für dieses Kommando musst du 2 weitere Argumente angeben (Datum und Uhrzeit) 🙂\nMit \`!help reminder\` kannst du dir mehr Infos dazu holen falls du Hilfe brauchst 😇`
    )
  }

  let reminderDay
  let reminderTime

  try {
    // try to convert the input to a valid date
    reminderDay = await dateHandler.convertInputToDate(args[1], true)
  } catch (errorMessage) {
    return message.channel.send(errorMessage)
  }

  // try to convert the input to a valid time
  const inputTime = moment(args[2], 'HH:mm')
  if (!inputTime.isValid()) {
    return message.channel.send(
      `Ich kann mit der Uhrzeit **${args[2]}** leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: **HH:mm**, also zum Beispiel **18:15**? (wir verwenden 24 Stunden wie zivilisierte Menschen)`
    )

    // time is okay
  } else {
    reminderTime = inputTime
  }

  try {
    const jobName = `${reminderDay.format('DD.MM.YYYY')} ${reminderTime.format('HH:mm')}`
    let job = schedule.scheduledJobs[jobName]

    // reminder could not be found
    if (job === undefined) {
      message.channel.send(`Ich konnte keinen passenden Reminder finden 🤔`)
      listReminders(message)
      return

      // reminder is deleted locally and in dynamoDB
    } else {
      job.cancel()
      dynamoDB.delete(jobName)
    }
  } catch (e) {
    console.error(e)
    return message.channel.send(`Da hat etwas nicht funktioniert! 🤯`)
  }

  // tell the user that removing the reminder was successful
  return message.channel.send(
    `Der Reminder am ${reminderDay.format('DD. MMMM YYYY')} um ${reminderTime.format(
      'HH:mm'
    )} wurde erfolgreich gelöscht! 🗑️`
  )
}

/**
 * delete all saved reminders
 * @param {discord message object} message message that contained the command
 * @param {array} args input by the user
 * @returns a message that is sent to the channel
 */
function removeAllReminders(message, args) {
  const jobs = schedule.scheduledJobs

  // check if there are reminders saved at all
  if (jobs && Object.keys(jobs).length === 0) {
    return message.channel.send(`Es stehen sowieso keine Reminder aus 👍`)
  }

  // delete local reminders
  let result = `Die folgenden Reminder wurden gelöscht:\n`
  Object.entries(jobs).forEach(([name, job]) => {
    result += `🗓️ ${name}\n`
    job.cancel()
  })

  // delete reminders in dynamoDB
  dynamoDB.deleteAll()

  // tell the user that removing all reminders was successful
  return message.channel.send(result)
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
    console.log("server time ", new Date())
    // load reminders from dynamoDB into the node-scheduler
    reminders.forEach((reminder) => {
      console.log("saved job in db date", reminder.date)
      const job = schedule.scheduleJob(reminder.jobName, reminder.date, function () {
        console.info(`The job ${reminder.jobName} is now executed!`, moment())
        dynamoDB.delete(reminder.jobName)
        client.channels.cache.get(reminder.channel).send(`@everyone 🔔 **Reminder** 🔔${reminder.customMessage || ''}`)
      })
    })
  },
  execute(message, args) {
    // return with custom message if no arguments are provided
    if (!args[0]) {
      return message.channel.send(
        `Für dieses Kommando musst du Argumente angeben (\`list\`, \`add\`, \`remove\`, \`clear\`) 🙂\nWenn du weitere Infos dazu brauchst verwende \`!help reminder\` 😇`
      )
    }

    // check what the user wants to do
    if (args[0] === 'add' || args[0] === 'new' || args[0] === 'neu') {
      // create a new reminder
      addReminder(message, args)
    } else if (args[0] === 'list' || args[0] === 'ls' || args[0] === 'all' || args[0] === 'alle') {
      // list all saved reminders
      listReminders(message)
    } else if (args[0] === 'remove' || args[0] === 'rm' || args[0] === 'delete' || args[0] === 'löschen') {
      // delete a single reminder
      removeReminder(message, args)
    } else if (args[0] === 'clear' || args[0] === 'removeAll' || args[0] === 'removeall' || args[0] === 'alleLöschen') {
      // delete all existing reminders
      removeAllReminders(message, args)
    } else {
      // unknown command
      return message.channel.send(
        `Mit dem Argument \`${args[0]}\` kann ich leider nichts anfangen 🤔\nIch verstehe nur \`add\`, \`remove\`, \`list\`, \`clear\` und all ihre Synonyme. Mit \`!help reminder\` gibt's mehr Infos 🙂`
      )
    }
  },
}
