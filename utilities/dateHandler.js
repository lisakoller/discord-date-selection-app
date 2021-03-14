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
  /**
   * get a specific weekday as moment object
   * @param {number} dayINeed ISO weekday that should be returned (1 = monday)
   * @returns moment object
   */
  getStartingDateByISO(dayINeed = 1) {
    // if we haven’t yet passed the day of the week that we need:
    if (moment().isoWeekday() <= dayINeed) {
      // then return this week’s instance of that day
      return moment().isoWeekday(dayINeed)
    } else {
      // otherwise, return next week’s instance of that day
      return moment().add(1, 'weeks').isoWeekday(dayINeed)
    }
  },
  /**
   * get a specific day addDays away in the future
   * @param {number} addDays number of days to add
   * @returns moment object that is addDays in the future
   */
  getStartingDateByToday(addDays = 0) {
    return moment().add(addDays, 'days')
  },
  /**
   * try to convert an input by the user to a valid date
   * @param {string} inputString date input by user
   * @param {boolean} skipChecking skip checking of future and past, only check for valid date
   * @param {string} futureUnit either 'months' or 'weeks', how long into the future a date is okay
   * @returns resolves with a moment object, rejects with a message
   */
  convertInputToDate(inputString, skipChecking = false, futureUnit = 'months') {
    return new Promise((resolve, reject) => {
      // check if input equals a weekday like "monday" ("montag")
      if (this.availableStartingWeekdays.some((day) => day.text === inputString.toLowerCase())) {
        resolve(
          this.getStartingDateByISO(
            this.availableStartingWeekdays.find((day) => day.text === inputString.toLowerCase()).isoWeekday
          )
        )
        // check if input equals a word like "tomorrow" ("morgen")
      } else if (this.availableRelativeStartingDays.some((day) => day.text === inputString.toLowerCase())) {
        resolve(
          this.getStartingDateByToday(
            this.availableRelativeStartingDays.find((day) => day.text === inputString.toLowerCase()).addDays
          )
        )
        // try to convert the input to a moment object
      } else {
        const inputDate = moment(inputString, 'DD.MM.YYYY')
        // check whether the parsed date is valid
        if (!inputDate.isValid()) {
          reject(
            `Ich kann mit dem Datum \`${inputString}\` leider nichts anfangen, tut mir leid ${message.author} 🤔\nHast es auch ganz sicher in dem Format eingegeben: \`DD.MM.YYYY\`, also zum Beispiel \`13.05.2021\`? Alternativ kannst du auch einen Wochentag angeben, dann wird zum Beispiel der nächste Dienstag genommen. Wörter wie \`heute\`, \`morgen\` und \`übermorgen\` funktionieren auch 😇`
          )
          // check if further checking is should be skipped (whether it is in the past or too far in the future)
        } else if (skipChecking) {
          resolve(inputDate)
          // check if the date is in the past
        } else if (inputDate.isBefore(moment(), 'day')) {
          reject(
            `Hey, Zeitreisender! Ein Datum in der Vergangenheit macht nicht so viel Sinn, oder? 😉 Ich tu mal so als hättest du das nicht geschrieben 😛`
          )
          // check if the date is too far in the future
        } else if (inputDate.isAfter(moment().add(2, futureUnit))) {
          reject(
            `Eine gute Planung ist Gold wert, aber mehr als zwei ${
              futureUnit === 'months' ? 'Monate' : 'Wochen'
            } in die Zukunft muss man nun wirklich nicht planen, oder? 😉 Gib bitte ein zeitlich näheres Datum an 🙂`
          )
          // date is valid and in the correct timeframe
        } else {
          resolve(inputDate)
        }
      }
    })
  },
}
