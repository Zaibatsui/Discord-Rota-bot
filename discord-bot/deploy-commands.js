import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  {
    name: 'rota',
    description: 'Manage the gaming rota',
    options: [
      {
        name: 'add',
        description: 'Add a user to the rota',
        type: 1,
        options: [
          {
            name: 'user',
            description: 'User to add',
            type: 6,
            required: true
          }
        ]
      },
      {
        name: 'remove',
        description: 'Remove a user from the rota',
        type: 1,
        options: [
          {
            name: 'user',
            description: 'User to remove',
            type: 6,
            required: true
          }
        ]
      },
      {
        name: 'list',
        description: 'Show the current rota order',
        type: 1
      },
      {
        name: 'reorder',
        description: 'Move a user to a different position',
        type: 1,
        options: [
          {
            name: 'user',
            description: 'User to move',
            type: 6,
            required: true
          },
          {
            name: 'position',
            description: 'New position (1-based)',
            type: 4,
            required: true,
            min_value: 1
          }
        ]
      }
    ]
  },
  {
    name: 'next',
    description: 'Show the next game and upcoming picker'
  },
  {
    name: 'pick',
    description: 'Set the game for your turn',
    options: [
      {
        name: 'game',
        description: 'Name of the game to play',
        type: 3,
        required: true,
        autocomplete: true
      }
    ]
  },
  {
    name: 'games',
    description: 'Manage the games list',
    options: [
      {
        name: 'add',
        description: 'Add a game to the list',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name of the game',
            type: 3,
            required: true
          },
          {
            name: 'image_url',
            description: 'Optional image URL (fetched from Steam if not provided)',
            type: 3,
            required: false
          }
        ]
      },
      {
        name: 'list',
        description: 'Show all available games',
        type: 1
      },
      {
        name: 'remove',
        description: 'Remove a game from the list',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name of the game to remove',
            type: 3,
            required: true,
            autocomplete: true
          }
        ]
      }
    ]
  },
  {
    name: 'skip',
    description: 'Skip your turn (if you cannot attend)'
  },
  {
    name: 'cantattend',
    description: 'Mark yourself as unable to attend the next session'
  },
  {
    name: 'attending',
    description: 'Show who is attending the next session'
  },
  {
    name: 'remind',
    description: 'Manually send a reminder to the channel'
  },
  {
    name: 'setchannel',
    description: 'Set the channel for reminders',
    options: [
      {
        name: 'channel',
        description: 'Channel for reminders',
        type: 7,
        required: true,
        channel_types: [0]
      }
    ]
  },
  {
    name: 'history',
    description: 'Show recent game sessions'
  }
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log('Started refreshing application (/) commands.');

    // Get the bot's application ID
    const application = await rest.get(Routes.oauth2CurrentApplication());
    const applicationId = application.id;

    // Deploy commands globally
    await rest.put(
      Routes.applicationCommands(applicationId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

deployCommands();
