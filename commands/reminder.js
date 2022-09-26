const i18next = require('i18next')
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder } = require('discord.js')
const dateHandler = require('../utilities/dateHandler')
const dynamoDB = require('../utilities/dynamoDB')
const schedule = require('node-schedule')
const moment = require('moment-timezone')
moment.locale('de')

/**
 * list all saved reminders
 * @param {discord interaction} interaction interaction that contained the command
 */
async function listReminders(interaction, followUp = false) {
  // get all saved reminders
  const jobs = await dynamoDB.getAll(interaction.guild.id)

  // if there are no reminders saved
  if (jobs && jobs.length === 0) {
    if (followUp) return interaction.followUp(i18next.t('reminder.list.none_saved', { lng: interaction.locale }))
    else return interaction.reply(i18next.t('reminder.list.none_saved', { lng: interaction.locale }))
  }

  // else format a list of all reminders
  let result = i18next.t('reminder.list.reply', { lng: interaction.locale })
  jobs.forEach((job) => {
    result += `🗓️ ${job.jobName}${job.message ? ' - ' + job.message : ''}\n`
  })
  if (followUp) return interaction.followUp(result)
  else return interaction.reply(result)
}

/**
 * save a new reminder
 * @param {discord message object} message message that contained the command
 * @param {array} args input by the user
 * @returns a message that is sent to the channel
 */
async function addReminder(interaction, args) {
  let reminderDay
  let reminderTime

  try {
    // try to convert the input to a valid date
    reminderDay = await dateHandler.convertInputToDate(args[0], false, 'weeks', interaction)
  } catch (errorMessage) {
    return interaction.reply({ content: errorMessage, ephemeral: true })
  }

  // try to convert the input to a valid time
  const inputTime = moment.tz(`${reminderDay.format('DD.MM.YYYY')} ${args[1]}`, 'DD.MM.YYYY HH:mm', 'Europe/Vienna')
  if (!inputTime.isValid()) {
    return interaction.reply({
      content: i18next.t('errors.time.format', {
        nickname: interaction.member.nickname,
        time: args[1],
        lng: interaction.locale,
      }),
      ephemeral: true,
    })

    // check if the provided time is in the past
  } else if (reminderDay.isSame(moment(), 'day') && inputTime.isSameOrBefore(moment())) {
    return interaction.reply({ content: i18next.t('errors.time.future', { lng: interaction.locale }), ephemeral: true })

    // time is okay
  } else {
    reminderTime = inputTime
  }

  // combine day and time moment objects
  let reminderStart = reminderTime

  // convert to normal date object for node-scheduler and create jobName
  const date = reminderStart.toDate()
  const jobName = reminderStart.format('DD.MM.YYYY HH:mm')
  let guild = interaction.guild.id

  // check if no reminder is saved on the same day at the same time
  let id = `${guild} ${jobName}`
  if (schedule.scheduledJobs[id] !== undefined) {
    return interaction.reply({
      content: i18next.t('errors.time.duplicate', { lng: interaction.locale }),
      ephemeral: true,
    })
  }

  // check if the user wants to mention someone specific
  let mention = args[3] ? args[3] : '@everyone'

  // check if the user wants to add a custom message
  let customMessage = ''
  if (args[2]) {
    if (getMessage(mention, args[2]).length > 100) {
      return interaction.reply({
        content: i18next.t('reminder.add.too_long', { lng: interaction.locale }),
        ephemeral: true,
      })
    } else {
      customMessage = args[2]
    }
  }

  //check if the user wants to set a specific channel
  let channel = args[4] && args[4].isTextBased() && !args[4].isVoiceBased() ? args[4] : interaction.channel

  // save the reminder in the dynamoDB
  dynamoDB.create(guild, jobName, date, channel.id, mention, customMessage)

  // save the reminder in the node-schedule
  const job = schedule.scheduleJob(id, date, function () {
    console.info(`The job ${jobName} is now executed!`, moment())
    dynamoDB.delete(guild, jobName)

    channel.send(getMessage(mention, customMessage))
  })

  // tell the user that adding the reminder was successful
  return interaction.reply({
    content: i18next.t('reminder.add.reply', {
      date: reminderStart.format('DD. MMMM YYYY'),
      time: reminderStart.format('HH:mm'),
      channel: channel.name,
      lng: interaction.locale,
    }),
    ephemeral: true,
  })
}

/**
 * list all reminders that can be removed in a select
 * @param {interaction} interaction Discord interaction
 */
async function removeReminderOptions(interaction) {
  const jobs = await dynamoDB.getAll(interaction.guild.id)

  // check if there are reminders saved at all
  if (jobs && jobs.length === 0) {
    return await interaction.reply(i18next.t('reminder.remove.none_saved', { lng: interaction.locale }))
  }

  // get all options to choose from
  let options = []
  jobs.forEach((job) => {
    options.push({
      label: `${job.jobName}`,
      description: `${job.message || i18next.t('reminder.remove.no_message', { lng: interaction.Locale })}`,
      value: `${job.jobName}`,
    })
  })

  const row = new ActionRowBuilder().addComponents(
    new SelectMenuBuilder()
      .setCustomId('removeReminderOptions')
      .setPlaceholder(i18next.t('reminder.remove.none_selected', { lng: interaction.locale }))
      .addOptions(options)
  )

  await interaction.reply({
    content: i18next.t('reminder.remove.select', { lng: interaction.locale }),
    components: [row],
    ephemeral: true,
  })
}

/**
 * confirm to delete all saved reminders
 * @param {discord interaction} interaction interaction that contained the command
 */
async function confirmDeleteAll(interaction) {
  const jobs = await dynamoDB.getAll(interaction.guild.id)

  // check if there are reminders saved at all
  if (jobs && jobs.length === 0) {
    return await interaction.reply(i18next.t('reminder.clear.none_saved', { lng: interaction.locale }))
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('removeReminders')
      .setLabel(i18next.t('reminder.clear.yes', { lng: interaction.locale }))
      .setStyle(ButtonStyle.Danger)
      .setEmoji('867768814439628840'),
    new ButtonBuilder()
      .setCustomId('keepReminders')
      .setLabel(i18next.t('reminder.clear.no', { lng: interaction.locale }))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('867769800084291615')
  )

  await interaction.reply({
    content: i18next.t('reminder.clear.confirm', { lng: interaction.locale }),
    components: [row],
    ephemeral: true,
  })
}

function getMessage(mention, customMessage) {
  return `${mention} 🔔 **Reminder** 🔔\n${customMessage || ''}`
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setNameLocalizations({
      de: 'erinnerung',
    })
    .setDescription('Display a message at a certain point in time.')
    .setDescriptionLocalizations({
      de: 'Lass eine Meldung zu einem bestimmten Zeitpunkt erscheinen.',
    })
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setNameLocalizations({
          de: 'hinzufügen',
        })
        .setDescription('Create a new reminder.')
        .setDescriptionLocalizations({
          de: 'Einen neuen Reminder erstellen.',
        })
        .addStringOption((option) =>
          option
            .setName('date')
            .setNameLocalizations({
              de: 'datum',
            })
            .setDescription('Date on which the reminder is sent. (DD.MM.YYYY)')
            .setDescriptionLocalizations({
              de: 'Datum, an dem der Reminder ausgelöst wird. (DD.MM.YYYY)',
            })
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('time')
            .setNameLocalizations({
              de: 'uhrzeit',
            })
            .setDescription('Time at which the reminder is sent. (HH:mm)')
            .setDescriptionLocalizations({
              de: 'Uhrzeit, zu der der Reminder ausgelöst wird. (HH:mm)',
            })
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('message')
            .setNameLocalizations({
              de: 'nachricht',
            })
            .setDescription('Optional message to be displayed.')
            .setDescriptionLocalizations({
              de: 'Optionale Nachricht, die angezeigt wird.',
            })
            .setRequired(false)
        )
        .addMentionableOption((option) =>
          option
            .setName('mention')
            .setNameLocalizations({
              de: 'erwähnen',
            })
            .setDescription('Is there a role or person you want to dedicate this reminder to? (default: @everyone)')
            .setDescriptionLocalizations({
              de: 'Gibt es eine Rolle oder Person, der du diese Erinnerung widmen möchtest? (Standard: @everyone)',
            })
            .setRequired(false)
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setNameLocalizations({
              de: 'channel',
            })
            .setDescription('Channel in which the message is displayed.')
            .setDescriptionLocalizations({
              de: 'Channel, in dem die Erinnerung angezeigt wird.',
            })
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setNameLocalizations({
          de: 'löschen',
        })
        .setDescription('Remove a scheduled reminder.')
        .setDescriptionLocalizations({
          de: 'Löscht einen vorgemerkten Reminder.',
        })
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setNameLocalizations({
          de: 'anzeigen',
        })
        .setDescription('Displays all saved reminders.')
        .setDescriptionLocalizations({
          de: 'Zeigt alle bevorstehenden Reminder an.',
        })
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('clear')
        .setNameLocalizations({
          de: 'alle_löschen',
        })
        .setDescription('Deletes all scheduled reminders.')
        .setDescriptionLocalizations({
          de: 'Löscht alle vorgemerkten Reminder.',
        })
    ),
  setReminders(reminders, client) {
    // load reminders from dynamoDB into the node-scheduler
    reminders.forEach((reminder) => {
      let id = `${reminder.guild} ${reminder.jobName}`
      const job = schedule.scheduleJob(id, reminder.date, function () {
        console.info(`The job ${reminder.jobName} is now executed!`, moment())
        dynamoDB.delete(reminder.guild, reminder.jobName)
        client.channels.cache.get(reminder.channel).send(getMessage(mention, reminder.message))
      })
    })
  },
  async removeAllReminders(interaction) {
    const jobs = await dynamoDB.deleteAll(interaction.guild.id)

    // delete local reminders
    let result = i18next.t('reminder.clear.yes_reply', { lng: interaction.locale })
    jobs.forEach((job) => {
      result += `🗓️ ${job.jobName}${job.message ? ' - ' + job.message : ''}\n`

      let id = `${interaction.guild.id} ${job.jobName}`
      let localJob = schedule.scheduledJobs[id]

      localJob.cancel()
    })

    // tell the user that removing all reminders was successful
    return await interaction.update({ content: result, components: [] })
  },
  async confirmDelete(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('removeReminder')
        .setLabel(i18next.t('reminder.remove.yes', { lng: interaction.locale }))
        .setStyle(ButtonStyle.Danger)
        .setEmoji('867768814439628840'),
      new ButtonBuilder()
        .setCustomId('keepReminder')
        .setLabel(i18next.t('reminder.remove.no', { lng: interaction.locale }))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('867769800084291615')
    )
    await interaction.update({
      content: i18next.t('reminder.remove.confirm', { reminder: interaction.values[0], lng: interaction.locale }),
      components: [row],
      ephemeral: true,
    })
  },
  async removeReminder(interaction) {
    let jobName
    let guild = interaction.guild.id

    try {
      jobName = interaction.message.content.split('`')[1]
      let id = `${guild} ${jobName}`
      let localJob = schedule.scheduledJobs[id]

      // reminder could not be found
      if (localJob === undefined) {
        await interaction.update(i18next.t('reminder.remove.none_saved', { lng: interaction.locale }))
        listReminders(interaction, true)
        return

        // reminder is deleted locally and in dynamoDB
      } else {
        localJob.cancel()
        dynamoDB.delete(guild, jobName)
      }
    } catch (e) {
      console.error(e)
      return interaction.update({ content: i18next.t('errors.general', { lng: interaction.locale }), ephemeral: true })
    }

    // tell the user that removing the reminder was successful
    return interaction.update({
      content: i18next.t('reminder.remove.yes_reply', {
        date: jobName.split(' ')[0],
        time: jobName.split(' ')[1],
        lng: interaction.locale,
      }),
      components: [],
    })
  },
  async execute(interaction) {
    // check what the user wants to do
    if (interaction.options.getSubcommand() === 'add') {
      // create a new reminder
      addReminder(interaction, [
        interaction.options.getString('date'),
        interaction.options.getString('time'),
        interaction.options.getString('message'),
        interaction.options.getMentionable('mention'),
        interaction.options.getChannel('channel'),
      ])
    } else if (interaction.options.getSubcommand() === 'remove') {
      // delete a single reminder
      removeReminderOptions(interaction)
    } else if (interaction.options.getSubcommand() === 'list') {
      // list all saved reminders
      listReminders(interaction)
    } else if (interaction.options.getSubcommand() === 'clear') {
      // delete all existing reminders
      confirmDeleteAll(interaction)
    }
  },
}
