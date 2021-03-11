const Joi = require('joi')
const dynamo = require('dynamodb')
let Reminder

module.exports = {
  setup() {
    return new Promise((resolve, reject) => {
      dynamo.AWS.config.update({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: 'eu-central-1',
      })

      Reminder = dynamo.define('Reminder', {
        hashKey: 'jobName',
        timestamps: false,
        schema: {
          jobName: Joi.string(),
          date: Joi.date(),
          customMessage: Joi.string().allow(''),
          channel: Joi.string(),
        },
        tableName: 'discord-reminders',
      })

      dynamo.createTables(function (err) {
        if (err) {
          console.error('Error creating tables: ', err)
          reject(err)
        } else {
          console.info('Tables have been created')

          Reminder.scan()
            .loadAll()
            .exec(function (err, res) {
              let savedReminders = []
              res.Items.forEach((item) => {
                savedReminders.push(item.attrs)
              })
              resolve(savedReminders)
            })
        }
      })
    })
  },
  create(jobName, date, customMessage, channel) {
    Reminder.create(
      { jobName: jobName, date: date, customMessage: customMessage, channel: channel },
      function (err, res) {
        if (err) {
          console.error('Error creating a reminder in DynamoDB: ', err)
        } else {
          console.info('created reminder in DynamoDB: ', res.get('jobName'))
        }
      }
    )
  },
  delete(jobName) {
    Reminder.destroy(jobName, function (err, res) {
      if (err) {
        console.error('Error deleting reminder in DynamoDB: ', err)
      } else {
        console.info('reminder deleted in DynamoDB')
      }
    })
  },
  deleteAll() {
    Reminder.scan()
      .loadAll()
      .exec(function (err, res) {
        if (err) {
          console.error('Error deleting all reminders in DynamoDB: ', err)
        } else {
          res.Items.forEach((item) => {
            Reminder.destroy(item.attrs.jobName, function (err, res) {
              if (err) {
                console.error('Error deleting a reminder in DynamoDB for clear command: ', err)
              } else {
                console.info('reminder deleted in DynamoDB')
              }
            })
          })
        }
      })
  },
}
