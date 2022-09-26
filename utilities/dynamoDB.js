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
        hashKey: 'guild',
        rangeKey: 'jobName',
        timestamps: false,
        schema: {
          guild: Joi.string(),
          jobName: Joi.string(),
          date: Joi.date(),
          channel: Joi.string(),
          mention: Joi.string(),
          message: Joi.string().allow(''),
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
   * @param {string} guild id of the guild the message is sent in
   * @param {string} jobName jobName
   * @param {date} date date the reminder is sent
   * @param {string} channel id of the channel the message is sent in
   * @param {string} mention person that is pinged
   * @param {string} message custom message that is sent
   */
  create(guild, jobName, date, channel, mention, message) {
    Reminder.create(
      { guild: guild, jobName: jobName, date: date, channel: channel, mention: mention, message: message },
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
   * @param {string} guild id of the guild the message is sent in
   * @param {string} jobName jobName
   */
  delete(guild, jobName) {
    Reminder.destroy(guild, jobName, function (err, res) {
      if (err) {
        console.error('Error deleting reminder in DynamoDB: ', err)
      } else {
        console.info('Reminder deleted in DynamoDB')
      }
    })
  },
  /**
   * delete all reminders in the database of a specific guild
   * @param {string} guild id of the guild the message is sent in
   */
  deleteAll(guild) {
    return new Promise((resolve, reject) => {
      Reminder.query(guild)
        .loadAll()
        .exec(function (err, res) {
          if (err) {
            console.error('Something went wrong scanning the reminders: ', err)
            reject(err)
          }
          let deletedReminders = []
          res.Items.forEach((item) => {
            deletedReminders.push(item.attrs)
            item.destroy()
          })
          resolve(deletedReminders)
        })
    })
  },
  /**
   * get a specific reminder of a specific guild in the database
   * @param {string} guild id of the guild the message is sent in
   * @param {string} jobName jobName
   */
  get(guild, jobName) {
    return new Promise((resolve, reject) => {
      Reminder.get(guild, jobName, function (err, res) {
        if (err) {
          console.error('Error getting guild reminders in DynamoDB: ', err)
          reject(err)
        } else {
          let reminders = []
          res.Items.forEach((item) => {
            reminders.push(item.attrs)
          })
          resolve(reminders)
        }
      })
    })
  },
  /**
   * get all reminders in the database of a specific guild
   * @param {string} guild id of the guild the message is sent in
   */
  getAll(guild) {
    return new Promise((resolve, reject) => {
      Reminder.query(guild)
        .loadAll()
        .exec(function (err, res) {
          if (err) {
            console.error('Error getting guild reminders in DynamoDB: ', err)
            reject(err)
          } else {
            let reminders = []
            res.Items.forEach((item) => {
              reminders.push(item.attrs)
            })
            resolve(reminders)
          }
        })
    })
  },
}
