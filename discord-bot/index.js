import { Client, GatewayIntentBits, EmbedBuilder, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import axios from 'axios';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001/api';
const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// API helper functions
async function apiGet(endpoint) {
  try {
    const response = await axios.get(`${BACKEND_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.error(`API GET ${endpoint} error:`, error.message);
    return null;
  }
}

async function apiPost(endpoint, data) {
  try {
    const response = await axios.post(`${BACKEND_URL}${endpoint}`, data);
    return response.data;
  } catch (error) {
    console.error(`API POST ${endpoint} error:`, error.message);
    return null;
  }
}

async function apiDelete(endpoint) {
  try {
    const response = await axios.delete(`${BACKEND_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.error(`API DELETE ${endpoint} error:`, error.message);
    return null;
  }
}

// Steam API helper to fetch game image
async function fetchSteamGameImage(gameName) {
  try {
    // Search for the game on Steam
    const searchResponse = await axios.get(
      `https://api.steampowered.com/ISteamApps/GetAppList/v2/`
    );
    
    const apps = searchResponse.data.applist.apps;
    const gameNameLower = gameName.toLowerCase();
    
    // Find exact or close match
    const match = apps.find(app => 
      app.name.toLowerCase() === gameNameLower ||
      app.name.toLowerCase().includes(gameNameLower)
    );
    
    if (match) {
      // Steam store image URL format
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${match.appid}/header.jpg`;
    }
    
    return null;
  } catch (error) {
    console.error('Steam API error:', error.message);
    return null;
  }
}

// Build embed for next game
function buildNextGameEmbed(session, currentPicker, nextPicker, game) {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Next Gaming Session')
    .setColor(0x5865F2)
    .setTimestamp();

  if (session && session.game_name) {
    embed.setDescription(`**Game:** ${session.game_name}`);
    if (game && game.image_url) {
      embed.setImage(game.image_url);
    }
  } else {
    embed.setDescription('**Game:** Not yet selected');
  }

  if (currentPicker) {
    embed.addFields({
      name: '🎯 Current Picker',
      value: `<@${currentPicker.discord_id}>`,
      inline: true
    });
  }

  if (nextPicker) {
    embed.addFields({
      name: '⏭️ Next Picker',
      value: `<@${nextPicker.discord_id}>`,
      inline: true
    });
  }

  if (session && session.absentees && session.absentees.length > 0) {
    embed.addFields({
      name: '❌ Cannot Attend',
      value: session.absentees.map(id => `<@${id}>`).join(', '),
      inline: false
    });
  }

  return embed;
}

// Build embed for rota list
function buildRotaEmbed(rota, currentIndex) {
  const embed = new EmbedBuilder()
    .setTitle('📋 Gaming Rota')
    .setColor(0x57F287)
    .setTimestamp();

  if (!rota || rota.length === 0) {
    embed.setDescription('No players in the rota. Use `/rota add @user` to add players.');
    return embed;
  }

  const rotaList = rota.map((player, index) => {
    const marker = index === currentIndex ? '➡️ ' : '';
    const position = index + 1;
    return `${marker}**${position}.** <@${player.discord_id}>`;
  }).join('\n');

  embed.setDescription(rotaList);
  return embed;
}

// Build embed for games list
function buildGamesEmbed(games) {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Available Games')
    .setColor(0xFEE75C)
    .setTimestamp();

  if (!games || games.length === 0) {
    embed.setDescription('No games added yet. Use `/games add [name]` to add games.');
    return embed;
  }

  const gamesList = games.map((game, index) => {
    const hasImage = game.image_url ? '🖼️' : '';
    return `**${index + 1}.** ${game.name} ${hasImage}`;
  }).join('\n');

  embed.setDescription(gamesList);
  return embed;
}

// Build history embed
function buildHistoryEmbed(sessions) {
  const embed = new EmbedBuilder()
    .setTitle('📜 Recent Sessions')
    .setColor(0x9B59B6)
    .setTimestamp();

  if (!sessions || sessions.length === 0) {
    embed.setDescription('No session history yet.');
    return embed;
  }

  const historyList = sessions.slice(0, 10).map((session, index) => {
    const date = new Date(session.date).toLocaleDateString('en-GB');
    return `**${date}:** ${session.game_name || 'No game'} (picked by <@${session.picker_id}>)`;
  }).join('\n');

  embed.setDescription(historyList);
  return embed;
}

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  // Handle autocomplete for game names
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'game' || focusedOption.name === 'name') {
      const games = await apiGet('/rota/games');
      if (games) {
        const filtered = games.filter(game => 
          game.name.toLowerCase().includes(focusedOption.value.toLowerCase())
        ).slice(0, 25);
        
        await interaction.respond(
          filtered.map(game => ({ name: game.name, value: game.name }))
        );
      } else {
        await interaction.respond([]);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;
  const guildId = interaction.guildId;

  try {
    switch (commandName) {
      case 'rota': {
        const subcommand = options.getSubcommand();
        
        if (subcommand === 'add') {
          const user = options.getUser('user');
          const member = await interaction.guild.members.fetch(user.id);
          
          const result = await apiPost('/rota/players', {
            guild_id: guildId,
            discord_id: user.id,
            username: user.username,
            display_name: member.displayName,
            avatar_url: user.displayAvatarURL({ dynamic: true })
          });
          
          if (result) {
            await interaction.reply({
              content: `✅ Added **${member.displayName}** to the rota!`,
              ephemeral: false
            });
          } else {
            await interaction.reply({
              content: '❌ Failed to add user. They might already be in the rota.',
              ephemeral: true
            });
          }
        } else if (subcommand === 'remove') {
          const user = options.getUser('user');
          const result = await apiDelete(`/rota/players/${guildId}/${user.id}`);
          
          if (result) {
            await interaction.reply({
              content: `✅ Removed **${user.username}** from the rota.`,
              ephemeral: false
            });
          } else {
            await interaction.reply({
              content: '❌ Failed to remove user.',
              ephemeral: true
            });
          }
        } else if (subcommand === 'list') {
          const data = await apiGet(`/rota/state/${guildId}`);
          
          if (data) {
            const embed = buildRotaEmbed(data.players, data.current_index);
            await interaction.reply({ embeds: [embed] });
          } else {
            await interaction.reply({
              content: '❌ Failed to fetch rota.',
              ephemeral: true
            });
          }
        } else if (subcommand === 'reorder') {
          const user = options.getUser('user');
          const position = options.getInteger('position');
          
          const result = await apiPost(`/rota/reorder/${guildId}`, {
            discord_id: user.id,
            new_position: position - 1
          });
          
          if (result) {
            await interaction.reply({
              content: `✅ Moved **${user.username}** to position ${position}.`,
              ephemeral: false
            });
          } else {
            await interaction.reply({
              content: '❌ Failed to reorder.',
              ephemeral: true
            });
          }
        }
        break;
      }

      case 'next': {
        const data = await apiGet(`/rota/next/${guildId}`);
        
        if (data) {
          const embed = buildNextGameEmbed(
            data.current_session,
            data.current_picker,
            data.next_picker,
            data.game
          );
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({
            content: '❌ No rota set up yet. Use `/rota add @user` to get started.',
            ephemeral: true
          });
        }
        break;
      }

      case 'pick': {
        const gameName = options.getString('game');
        const userId = interaction.user.id;
        
        // Check if it's user's turn
        const state = await apiGet(`/rota/state/${guildId}`);
        if (!state || state.players.length === 0) {
          await interaction.reply({
            content: '❌ No rota set up yet.',
            ephemeral: true
          });
          return;
        }
        
        const currentPicker = state.players[state.current_index];
        if (currentPicker.discord_id !== userId) {
          await interaction.reply({
            content: `❌ It's not your turn! Current picker is <@${currentPicker.discord_id}>.`,
            ephemeral: true
          });
          return;
        }
        
        const result = await apiPost(`/rota/pick/${guildId}`, {
          game_name: gameName,
          picker_id: userId
        });
        
        if (result) {
          const embed = new EmbedBuilder()
            .setTitle('🎉 Game Selected!')
            .setDescription(`**${gameName}** has been selected for the next session!`)
            .setColor(0x57F287)
            .addFields({
              name: 'Selected by',
              value: `<@${userId}>`,
              inline: true
            })
            .setTimestamp();
          
          if (result.game && result.game.image_url) {
            embed.setImage(result.game.image_url);
          }
          
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({
            content: '❌ Failed to set game.',
            ephemeral: true
          });
        }
        break;
      }

      case 'games': {
        const subcommand = options.getSubcommand();
        
        if (subcommand === 'add') {
          const gameName = options.getString('name');
          let imageUrl = options.getString('image_url');
          
          await interaction.deferReply();
          
          // Try to fetch image from Steam if not provided
          if (!imageUrl) {
            imageUrl = await fetchSteamGameImage(gameName);
          }
          
          const result = await apiPost('/rota/games', {
            guild_id: guildId,
            name: gameName,
            image_url: imageUrl
          });
          
          if (result) {
            const embed = new EmbedBuilder()
              .setTitle('✅ Game Added!')
              .setDescription(`**${gameName}** has been added to the games list.`)
              .setColor(0x57F287);
            
            if (imageUrl) {
              embed.setThumbnail(imageUrl);
            }
            
            await interaction.editReply({ embeds: [embed] });
          } else {
            await interaction.editReply({
              content: '❌ Failed to add game. It might already exist.',
            });
          }
        } else if (subcommand === 'list') {
          const games = await apiGet(`/rota/games/${guildId}`);
          const embed = buildGamesEmbed(games);
          await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'preview') {
          const gameName = options.getString('name');
          const games = await apiGet(`/rota/games/${guildId}`);
          const game = games?.find(g => g.name.toLowerCase() === gameName.toLowerCase());
          
          if (game) {
            const embed = new EmbedBuilder()
              .setTitle(`🎮 ${game.name}`)
              .setColor(0x5865F2)
              .setTimestamp();
            
            if (game.image_url) {
              embed.setImage(game.image_url);
            } else {
              embed.setDescription('*No image available for this game*');
            }
            
            await interaction.reply({ embeds: [embed] });
          } else {
            await interaction.reply({
              content: `❌ Game "${gameName}" not found.`,
              ephemeral: true
            });
          }
        } else if (subcommand === 'remove') {
          const gameName = options.getString('name');
          const result = await apiDelete(`/rota/games/${guildId}/${encodeURIComponent(gameName)}`);
          
          if (result) {
            await interaction.reply({
              content: `✅ Removed **${gameName}** from the games list.`,
              ephemeral: false
            });
          } else {
            await interaction.reply({
              content: '❌ Failed to remove game.',
              ephemeral: true
            });
          }
        }
        break;
      }

      case 'skip': {
        const userId = interaction.user.id;
        const result = await apiPost(`/rota/skip/${guildId}`, { discord_id: userId });
        
        if (result) {
          await interaction.reply({
            content: `✅ <@${userId}> has skipped their turn. The rota has been advanced.`,
            ephemeral: false
          });
        } else {
          await interaction.reply({
            content: '❌ Failed to skip. Make sure it\'s your turn.',
            ephemeral: true
          });
        }
        break;
      }

      case 'cantattend': {
        const userId = interaction.user.id;
        
        // Check if this user is the current picker
        const state = await apiGet(`/rota/state/${guildId}`);
        const isCurrentPicker = state && state.players.length > 0 && 
          state.players[state.current_index]?.discord_id === userId;
        
        const result = await apiPost(`/rota/absence/${guildId}`, { discord_id: userId });
        
        if (result) {
          if (isCurrentPicker) {
            // Auto-skip to next person if current picker is absent
            await apiPost(`/rota/skip/${guildId}`, { discord_id: userId, auto_skip: true });
            
            // Get new current picker
            const newState = await apiGet(`/rota/state/${guildId}`);
            const newPicker = newState?.players[newState.current_index];
            
            await interaction.reply({
              content: `📢 <@${userId}> cannot attend and was scheduled to pick.\n➡️ Rota advanced - <@${newPicker?.discord_id}> is now picking!`,
              ephemeral: false
            });
          } else {
            await interaction.reply({
              content: `📢 <@${userId}> cannot attend the next gaming session.`,
              ephemeral: false
            });
          }
        } else {
          await interaction.reply({
            content: '❌ Failed to mark absence.',
            ephemeral: true
          });
        }
        break;
      }

      case 'attending': {
        const data = await apiGet(`/rota/next/${guildId}`);
        
        if (data && data.current_session) {
          const embed = new EmbedBuilder()
            .setTitle('📋 Attendance for Next Session')
            .setColor(0x5865F2)
            .setTimestamp();
          
          const absentees = data.current_session.absentees || [];
          const players = data.players || [];
          
          const attending = players.filter(p => !absentees.includes(p.discord_id));
          const notAttending = players.filter(p => absentees.includes(p.discord_id));
          
          if (attending.length > 0) {
            embed.addFields({
              name: '✅ Attending',
              value: attending.map(p => `<@${p.discord_id}>`).join('\n'),
              inline: true
            });
          }
          
          if (notAttending.length > 0) {
            embed.addFields({
              name: '❌ Cannot Attend',
              value: notAttending.map(p => `<@${p.discord_id}>`).join('\n'),
              inline: true
            });
          }
          
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({
            content: 'No session data available.',
            ephemeral: true
          });
        }
        break;
      }

      case 'remind': {
        await sendReminder(guildId, interaction.channel);
        await interaction.reply({
          content: '✅ Reminder sent!',
          ephemeral: true
        });
        break;
      }

      case 'setchannel': {
        const channel = options.getChannel('channel');
        const result = await apiPost(`/rota/settings/${guildId}`, {
          reminder_channel_id: channel.id
        });
        
        if (result) {
          await interaction.reply({
            content: `✅ Reminder channel set to <#${channel.id}>.`,
            ephemeral: false
          });
        } else {
          await interaction.reply({
            content: '❌ Failed to set channel.',
            ephemeral: true
          });
        }
        break;
      }

      case 'history': {
        const sessions = await apiGet(`/rota/history/${guildId}`);
        const embed = buildHistoryEmbed(sessions);
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'setpicker': {
        const user = options.getUser('user');
        const result = await apiPost(`/rota/setpicker/${guildId}`, {
          discord_id: user.id
        });
        
        if (result) {
          await interaction.reply({
            content: `✅ <@${user.id}> is now the current picker!`,
            ephemeral: false
          });
        } else {
          await interaction.reply({
            content: '❌ Failed to set picker. Make sure the user is in the rota.',
            ephemeral: true
          });
        }
        break;
      }

      case 'pickfor': {
        const user = options.getUser('user');
        const gameName = options.getString('game');
        
        // First set this user as the current picker
        const setResult = await apiPost(`/rota/setpicker/${guildId}`, {
          discord_id: user.id
        });
        
        if (!setResult) {
          await interaction.reply({
            content: '❌ Failed - user is not in the rota.',
            ephemeral: true
          });
          return;
        }
        
        // Now pick the game on their behalf
        const pickResult = await apiPost(`/rota/pick/${guildId}`, {
          game_name: gameName,
          picker_id: user.id
        });
        
        if (pickResult) {
          const embed = new EmbedBuilder()
            .setTitle('🎉 Game Selected!')
            .setDescription(`**${gameName}** has been selected for the next session!`)
            .setColor(0x57F287)
            .addFields({
              name: 'Picked for',
              value: `<@${user.id}>`,
              inline: true
            },
            {
              name: 'Set by',
              value: `<@${interaction.user.id}>`,
              inline: true
            })
            .setTimestamp();
          
          if (pickResult.game && pickResult.game.image_url) {
            embed.setImage(pickResult.game.image_url);
          }
          
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({
            content: '❌ Failed to set game.',
            ephemeral: true
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error('Command error:', error);
    const reply = {
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    };
    
    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else if (!interaction.replied) {
      await interaction.reply(reply);
    }
  }
});

// Send reminder function
async function sendReminder(guildId, channel) {
  const data = await apiGet(`/rota/next/${guildId}`);
  
  if (!data) return;
  
  const embed = new EmbedBuilder()
    .setTitle('🔔 Gaming Night Reminder!')
    .setDescription('Tonight is gaming night! Here\'s the current status:')
    .setColor(0xFF9500)
    .setTimestamp();
  
  if (data.current_session && data.current_session.game_name) {
    embed.addFields({
      name: '🎮 Game',
      value: data.current_session.game_name,
      inline: true
    });
  } else if (data.current_picker) {
    embed.addFields({
      name: '⚠️ No Game Selected',
      value: `<@${data.current_picker.discord_id}>, please pick a game using \`/pick [game]\`!`,
      inline: false
    });
  }
  
  if (data.current_picker) {
    embed.addFields({
      name: '🎯 Picker',
      value: `<@${data.current_picker.discord_id}>`,
      inline: true
    });
  }
  
  if (data.game && data.game.image_url) {
    embed.setImage(data.game.image_url);
  }
  
  await channel.send({ embeds: [embed] });
}

// Scheduled reminder - every Thursday at noon UK time
cron.schedule('0 12 * * 4', async () => {
  console.log('Running scheduled noon reminder...');
  
  try {
    // Get all guilds with reminder channels set
    const settings = await apiGet('/rota/all-settings');
    
    if (settings) {
      for (const setting of settings) {
        if (setting.reminder_channel_id) {
          try {
            const channel = await client.channels.fetch(setting.reminder_channel_id);
            if (channel) {
              await sendReminder(setting.guild_id, channel);
            }
          } catch (err) {
            console.error(`Failed to send reminder to guild ${setting.guild_id}:`, err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Scheduled reminder error:', error);
  }
}, {
  timezone: 'Europe/London'
});

// Scheduled rota advancement - every Thursday at 10 PM UK time (after gaming night)
cron.schedule('0 22 * * 4', async () => {
  console.log('Running scheduled rota advancement...');
  
  try {
    const settings = await apiGet('/rota/all-settings');
    
    if (settings) {
      for (const setting of settings) {
        try {
          // Advance the rota for this guild
          const result = await apiPost(`/rota/advance/${setting.guild_id}`, {});
          
          if (result && setting.reminder_channel_id) {
            const channel = await client.channels.fetch(setting.reminder_channel_id);
            if (channel) {
              // Get new state
              const data = await apiGet(`/rota/next/${setting.guild_id}`);
              
              if (data && data.current_picker) {
                const embed = new EmbedBuilder()
                  .setTitle('🔄 Rota Advanced!')
                  .setDescription(`Gaming night is over! The rota has moved to the next person.`)
                  .setColor(0x5865F2)
                  .addFields({
                    name: '🎯 Next Picker',
                    value: `<@${data.current_picker.discord_id}> - it's your turn to pick for next week!`,
                    inline: false
                  })
                  .setTimestamp();
                
                await channel.send({ embeds: [embed] });
              }
            }
          }
        } catch (err) {
          console.error(`Failed to advance rota for guild ${setting.guild_id}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('Scheduled advancement error:', error);
  }
}, {
  timezone: 'Europe/London'
});

// Bot ready event
client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('Gaming Rota', { type: ActivityType.Watching });
});

// Login
client.login(process.env.DISCORD_TOKEN);
