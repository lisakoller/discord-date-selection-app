const Joi = require('joi')
const dynamo = require('dynamodb')

let Reminder

module.exports = {
  /**
   * setup dynamoDB for server reload
   * @returns array of saved reminders
   */
  setup() {
    return new Promise((resolve, reject) => {
      // configure access to AWS and region
      dynamo.AWS.config.update({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: 'eu-central-1',
      })

      // define the schema for a reminder
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

      // create the table for the reminders
      dynamo.createTables(function (err) {
        if (err) {
          console.error('Error creating tables: ', err)
          reject(err)
        } else {
          console.info('Tables have been created')

          // load all saved reminders to put them into the node-scheduler
          Reminder.scan()
            .loadAll()
            .exec(function (err, res) {
              if (err) {
                console.error('Something went wrong scanning the reminders: ', err)
              }
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
  /**
   * add a new reminder to the database
   * @param {string} jobName unique jobName
   * @param {date} date date the reminder is sent
   * @param {string} customMessage custom message that is sent
   * @param {string} channel id of the channel the message is sent in
   */
  create(jobName, date, customMessage, channel) {
    Reminder.create(
      { jobName: jobName, date: date, customMessage: customMessage, channel: channel },
      function (err, res) {
        if (err) {
          console.error('Error creating a reminder in DynamoDB: ', err)
        } else {
          console.info('Created reminder in DynamoDB: ', res.get('jobName'))
        }
      }
    )
  },
  /**
   * delete a reminder from the database
   * @param {string} jobName unique jobName
   */
  delete(jobName) {
    Reminder.destroy(jobName, function (err, res) {
      if (err) {
        console.error('Error deleting reminder in DynamoDB: ', err)
      } else {
        console.info('Reminder deleted in DynamoDB')
      }
    })
  },
  /**
   * delete all reminders in the database
   */
  deleteAll() {
    Reminder.scan()
      .loadAll()
      .exec(function (err, res) {
        if (err) {
          console.error('Error deleting all reminders in DynamoDB: ', err)
        } else {
          res.Items.forEach((item) => {
            Reminder.destroy(item.attrs.jobName, function (err, _) {
              if (err) {
                console.error('Error deleting a reminder in DynamoDB for clear command: ', err)
              } else {
                console.info('Reminder deleted in DynamoDB')
              }
            })
          })
        }
      })
  },
}
