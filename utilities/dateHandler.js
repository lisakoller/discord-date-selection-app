const i18next = require('i18next')
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
    {
      text: 'monday',
      isoWeekday: 1,
    },
    {
      text: 'tuesday',
      isoWeekday: 2,
    },
    {
      text: 'wednesday',
      isoWeekday: 3,
    },
    {
      text: 'thursday',
      isoWeekday: 4,
    },
    {
      text: 'friday',
      isoWeekday: 5,
    },
    {
      text: 'saturday',
      isoWeekday: 6,
    },
    {
      text: 'sunday',
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
    {
      text: 'today',
      addDays: 0,
    },
    {
      text: 'tomorrow',
      addDays: 1,
    },
    {
      text: 'day after tomorrow',
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
   * @param {interaction} interaction Discord interaction
   * @returns resolves with a moment object, rejects with a message
   */
  convertInputToDate(inputString, skipChecking = false, futureUnit = 'months', interaction = undefined) {
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
          reject(i18next.t('errors.date.format', { date: inputString, nickname: interaction.member.nickname, lng: interaction.locale }))
          // check if further checking is should be skipped (whether it is in the past or too far in the future)
        } else if (skipChecking) {
          resolve(inputDate)
          // check if the date is in the past
        } else if (inputDate.isBefore(moment(), 'day')) {
          reject(i18next.t('errors.date.past', { lng: interaction.locale }))
          // check if the date is too far in the future
        } else if (inputDate.isAfter(moment().add(2, futureUnit))) {
          reject(i18next.t('errors.date.future', { futureUnit: futureUnit === 'months' ? i18next.t('errors.date.months', { lng: interaction.locale }) : i18next.t('errors.date.weeks', { lng: interaction.locale }), lng: interaction.locale }))
          // date is valid and in the correct timeframe
        } else {
          resolve(inputDate)
        }
      }
    })
  },
}
