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
}
