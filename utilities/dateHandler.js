const moment = require('moment')
moment.locale('de')

module.exports = {
  availableStartingWeekdays: [
    {
      text: 'montag',
      isoWeekday: 1,
    },
    {
      text: 'dienstag',
      isoWeekday: 2,
    },
    {
      text: 'mittwoch',
      isoWeekday: 3,
    },
    {
      text: 'donnerstag',
      isoWeekday: 4,
    },
    {
      text: 'freitag',
      isoWeekday: 5,
    },
    {
      text: 'samstag',
      isoWeekday: 6,
    },
    {
      text: 'sonntag',
      isoWeekday: 7,
    },
  ],
  availableRelativeStartingDays: [
    {
      text: 'heute',
      addDays: 0,
    },
    {
      text: 'morgen',
      addDays: 1,
    },
    {
      text: 'übermorgen',
      addDays: 2,
    },
  ],
  getStartingDateByISO(dayINeed = 1) {
    // if we haven’t yet passed the day of the week that I need:
    if (moment().isoWeekday() <= dayINeed) {
      // then just give me this week’s instance of that day
      return moment().isoWeekday(dayINeed)
    } else {
      // otherwise, give me next week’s instance of that day
      return moment().add(1, 'weeks').isoWeekday(dayINeed)
    }
  },
  getStartingDateByToday(addDays = 0) {
    return moment().add(addDays, 'days')
  },
  convertInputToDate(inputString, skipChecking = false, futureUnit = 'months') {
    return new Promise((resolve, reject) => {
      if (this.availableStartingWeekdays.some((day) => day.text === inputString.toLowerCase())) {
        resolve(
          this.getStartingDateByISO(
            this.availableStartingWeekdays.find((day) => day.text === inputString.toLowerCase()).isoWeekday
          )
        )
      } else if (this.availableRelativeStartingDays.some((day) => day.text === inputString.toLowerCase())) {
        resolve(
          this.getStartingDateByToday(
            this.availableRelativeStartingDays.find((day) => day.text === inputString.toLowerCase()).addDays
          )
        )
      } else {
        const inputDate = moment(inputString, 'DD.MM.YYYY')
        if (!inputDate.isValid()) {
          reject(
            `Ich kann mit dem Datum \`${inputString}\` leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: \`DD.MM.YYYY\`, also zum Beispiel \`13.05.2021\`? Alternativ kannst du auch einen Wochentag angeben, dann wird zum Beispiel der nächste Dienstag genommen. Wörter wie \`heute\`, \`morgen\` und \`übermorgen\` funktionieren auch 😇`
          )
        } else if (skipChecking) {
          resolve(inputDate)
        } else if (inputDate.isBefore(moment(), 'day')) {
          reject(
            `Hey, Zeitreisender! Ein Datum in der Vergangenheit macht nicht so viel Sinn, oder? 😉 Ich tu mal so als hättest du das nicht geschrieben 😛`
          )
        } else if (inputDate.isAfter(moment().add(2, futureUnit))) {
          reject(
            `Eine gute Planung ist Gold wert, aber mehr als zwei ${
              futureUnit === 'months' ? 'Monate' : 'Wochen'
            } in die Zukunft muss man nun wirklich nicht planen, oder? 😉 Gib bitte ein zeitlich näheres Datum an 🙂`
          )
        } else {
          resolve(inputDate)
        }
      }
    })
  },
}
