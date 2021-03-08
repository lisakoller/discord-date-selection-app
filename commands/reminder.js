const dateHandler = require('../utilities/dateHandler')
const schedule = require('node-schedule')
const moment = require('moment')
moment.locale('de')

module.exports = {
  name: 'reminder',
  aliases: ['erinnerung', 'wecker'],
  description: 'Lass eine Meldung zu einem bestimmten Zeitpunkt erscheinen.',
  args: true,
  execute(message, args) {
    let reminderDay
    let reminderTime

    if (!args[0] || !args[1]) {
      return message.channel.send(
        `Für dieses Kommando musst du zumindest 2 Argumente angeben (Datum und Uhrzeit) 🙂\nMit \`!help reminder\` kannst du dir mehr Infos dazu holen falls du Hilfe brauchst 😇`
      )
    }

    if (dateHandler.availableStartingWeekdays.some((day) => day.text === args[0].toLowerCase())) {
      reminderDay = dateHandler.getStartingDateByISO(
        dateHandler.availableStartingWeekdays.find((day) => day.text === args[0].toLowerCase()).isoWeekday
      )
    } else if (dateHandler.availableRelativeStartingDays.some((day) => day.text === args[0].toLowerCase())) {
      reminderDay = dateHandler.getStartingDateByToday(
        dateHandler.availableRelativeStartingDays.find((day) => day.text === args[0].toLowerCase()).addDays
      )
    } else {
      const inputDate = moment(args[0], 'DD.MM.YYYY')
      if (!inputDate.isValid()) {
        return message.channel.send(
          `Ich kann mit dem Datum **${args[0]}** leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: **DD.MM.YYYY**, also zum Beispiel **13.05.2021**? Alternativ kannst du auch einen Wochentag angeben, dann wird zum Beispiel der nächste Dienstag genommen. Wörter wie **heute**, **morgen** und **übermorgen** funktionieren auch 😇`
        )
      } else if (inputDate.isBefore(moment(), 'day')) {
        return message.channel.send(
          `Hey, Zeitreisender! Ein Erinnerungsdatum in der Vergangenheit macht nicht so viel Sinn, oder? 😉 Ich tu mal so als hättest du das nicht geschrieben 😛`
        )
      } else if (inputDate.isAfter(moment().add(2, 'months'))) {
        return message.channel.send(
          `Eine gute Planung ist Gold wert, aber mehr als zwei Monate in die Zukunft muss man nun wirklich nicht planen, oder? 😉 Gib bitte ein Datum innerhalb der nächsten zwei Monate an 🙂`
        )
      } else {
        reminderDay = inputDate
      }
    }

    const inputTime = moment(args[1], 'HH:mm')
    if (!inputTime.isValid()) {
      return message.channel.send(`Ich kann mit der Uhrzeit **${args[1]}** leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: **HH:mm**, also zum Beispiel **18:15**? (wir verwenden 24 Stunden wie zivilisierte Menschen)`)
    } else {
      reminderTime = inputTime
    }

    let reminderStart = reminderDay
    reminderStart = reminderStart.hour(reminderTime.get('hour'))
    reminderStart = reminderStart.minute(reminderTime.get('minute'))
    reminderStart = reminderStart.second(0)

    console.log(reminderStart)

    const date = reminderStart.toDate()
    //const date = new Date(reminderStart.year, reminderStart.month, reminderStart.day, reminderStart.hour, reminderStart.minutes, 0)

    const job = schedule.scheduleJob(date, function () {
      console.log('The job is now executed!', moment())
      message.channel.send(`@everyone 🔔 **Reminder** 🔔`)
    })
  },
}
