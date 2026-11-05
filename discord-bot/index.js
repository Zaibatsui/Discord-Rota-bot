import { Client, GatewayIntentBits, EmbedBuilder, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import axios from 'axios';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001/api';
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// API helpers
async function apiGet(endpoint) {
  try {
    return (await axios.get(`${BACKEND_URL}${endpoint}`)).data;
  } catch (e) {
    console.error(`GET ${endpoint}:`, e.message);
    return null;
  }
}

async function apiPost(endpoint, data) {
  try {
    return (await axios.post(`${BACKEND_URL}${endpoint}`, data)).data;
  } catch (e) {
    console.error(`POST ${endpoint}:`, e.message);
    return null;
  }
}

async function apiDelete(endpoint) {
  try {
    return (await axios.delete(`${BACKEND_URL}${endpoint}`)).data;
  } catch (e) {
    console.error(`DELETE ${endpoint}:`, e.message);
    return null;
  }
}

// Steam game image lookup
async function fetchSteamGameImage(gameName) {
  try {
    const r = await axios.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=en&cc=us`);
    if (r.data?.items?.length > 0) {
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${r.data.items[0].id}/header.jpg`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Embed builders
function buildNextGameEmbed(session, currentPicker, nextPicker, game) {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Next Gaming Session')
    .setColor(0x5865F2)
    .setTimestamp();
  embed.setDescription(session?.game_name ? `**Game:** ${session.game_name}` : '**Game:** Not yet selected');
  if (game?.image_url) embed.setImage(game.image_url);
  if (currentPicker) embed.addFields({ name: '🎯 Current Picker', value: `<@${currentPicker.discord_id}>`, inline: true });
  if (nextPicker) embed.addFields({ name: '⏭️ Next Picker', value: `<@${nextPicker.discord_id}>`, inline: true });
  if (session?.absentees?.length > 0) embed.addFields({ name: '❌ Cannot Attend', value: session.absentees.map(id => `<@${id}>`).join(', '), inline: false });
  return embed;
}

function buildRotaEmbed(rota, currentIndex) {
  const embed = new EmbedBuilder().setTitle('📋 Gaming Rota').setColor(0x57F287).setTimestamp();
  if (!rota?.length) {
    embed.setDescription('No players in the rota. Use `/rota add @user` to add players.');
    return embed;
  }
  embed.setDescription(rota.map((p, i) => `${i === currentIndex ? '➡️ ' : ''}**${i + 1}.** <@${p.discord_id}>`).join('\n'));
  return embed;
}

function buildGamesEmbed(games) {
  const embed = new EmbedBuilder().setTitle('🎮 Available Games').setColor(0xFEE75C).setTimestamp();
  if (!games?.length) {
    embed.setDescription('No games added yet. Use `/games add [name]` to add games.');
    return embed;
  }
  embed.setDescription(games.map((g, i) => `**${i + 1}.** ${g.name} ${g.image_url ? '🖼️' : ''}`).join('\n'));
  return embed;
}

function buildHistoryEmbed(sessions) {
  const embed = new EmbedBuilder().setTitle('📜 Recent Sessions').setColor(0x9B59B6).setTimestamp();
  if (!sessions?.length) {
    embed.setDescription('No session history yet.');
    return embed;
  }
  embed.setDescription(sessions.slice(0, 10).map(s => `**${new Date(s.date).toLocaleDateString('en-GB')}:** ${s.game_name || 'No game'} (<@${s.picker_id}>)`).join('\n'));
  return embed;
}

// Gaming night scheduling helpers
const ROTA_TZ = 'Europe/London';
const GAMING_NIGHT_WEEKDAY = 4; // Thursday (0 = Sunday)
const ROTA_ADVANCE_HOUR = 22;   // the rota advances at 22:00, so after that the night is done

// Break a moment down into the calendar date and hour as seen in the rota's timezone.
function zonedNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: ROTA_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hour12: false
    }).formatToParts(now).map(({ type, value }) => [type, value])
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  // Anchor at midday UTC so adding whole days can never slip across a DST boundary.
  const middayUTC = Date.UTC(year, month - 1, day, 12);
  return {
    hour: Number(parts.hour) % 24,
    weekday: new Date(middayUTC).getUTCDay(),
    middayUTC
  };
}

// How many days until the next gaming night, and the date it falls on.
function nextGamingNight(now = new Date()) {
  const today = zonedNow(now);
  let daysAway = (GAMING_NIGHT_WEEKDAY - today.weekday + 7) % 7;
  if (daysAway === 0 && today.hour >= ROTA_ADVANCE_HOUR) daysAway = 7;
  return { daysAway, date: new Date(today.middayUTC + daysAway * 86400000) };
}

function formatGamingNight(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  }).format(date);
}

// One line saying when the next gaming night is, in plain English.
function gamingNightBlurb(now = new Date()) {
  const { daysAway, date } = nextGamingNight(now);
  const when = formatGamingNight(date);
  if (daysAway === 0) return `**Tonight** is gaming night! (${when})`;
  if (daysAway === 1) return `Gaming night is **tomorrow** — ${when}.`;
  if (daysAway <= 3) return `Gaming night is **${when}** — only ${daysAway} days away!`;
  return `Gaming night is **${when}** — ${daysAway} days away.`;
}

// Send reminder
async function sendReminder(guildId, channel) {
  const data = await apiGet(`/rota/next/${guildId}`);
  if (!data) return;
  const embed = new EmbedBuilder()
    .setTitle('🔔 Gaming Night Reminder!')
    .setDescription(gamingNightBlurb())
    .setColor(0xFF9500)
    .setTimestamp();
  if (data.current_session?.game_name) {
    embed.addFields({ name: '🎮 Game', value: data.current_session.game_name, inline: true });
  } else if (data.current_picker) {
    embed.addFields({ name: '⚠️ No Game Selected', value: `<@${data.current_picker.discord_id}>, please pick a game using \`/pick [game]\`!`, inline: false });
  }
  if (data.current_picker) embed.addFields({ name: '🎯 Picker', value: `<@${data.current_picker.discord_id}>`, inline: true });
  if (data.game?.image_url) embed.setImage(data.game.image_url);
  await channel.send({ embeds: [embed] });
}

// Chase the picker by DM while the next session still has no game.
// Returns true only when a DM actually went out, so the caller can log honestly.
async function nudgePicker(guildId) {
  const data = await apiGet(`/rota/next/${guildId}`);
  const picker = data?.current_picker;
  const session = data?.current_session;
  if (!picker || !session) return false;
  if (session.game_name) return false;                                     // already picked
  if ((session.absentees || []).includes(picker.discord_id)) return false; // told us they're out

  const embed = new EmbedBuilder()
    .setTitle('🎮 Your turn to pick!')
    .setDescription(`${gamingNightBlurb()}\n\nNo game is set yet and you're up — use \`/pick [game]\` in the server to choose one.`)
    .setColor(0xFF9500)
    .setFooter({ text: "Can't make it? Use /cantattend and the rota will move on." })
    .setTimestamp();

  const user = await client.users.fetch(picker.discord_id);
  await user.send({ embeds: [embed] });
  return true;
}

// Command handler
client.on('interactionCreate', async (interaction) => {
  // Autocomplete
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'game' || focused.name === 'name') {
      const games = await apiGet('/rota/games');
      const filtered = (games || []).filter(g => g.name.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);
      await interaction.respond(filtered.map(g => ({ name: g.name, value: g.name })));
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName, options } = interaction;
  const guildId = interaction.guildId;

  try {
    if (commandName === 'rota') {
      const sub = options.getSubcommand();
      if (sub === 'add') {
        const user = options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        const result = await apiPost('/rota/players', { guild_id: guildId, discord_id: user.id, username: user.username, display_name: member.displayName, avatar_url: user.displayAvatarURL({ dynamic: true }) });
        await interaction.reply(result ? `✅ Added **${member.displayName}** to the rota!` : { content: '❌ Failed to add user. They may already be in the rota.', ephemeral: true });
      } else if (sub === 'remove') {
        const user = options.getUser('user');
        const result = await apiDelete(`/rota/players/${guildId}/${user.id}`);
        await interaction.reply(result ? `✅ Removed **${user.username}** from the rota.` : { content: '❌ Failed to remove user.', ephemeral: true });
      } else if (sub === 'list') {
        const data = await apiGet(`/rota/state/${guildId}`);
        await interaction.reply(data ? { embeds: [buildRotaEmbed(data.players, data.current_index)] } : { content: '❌ Failed to fetch rota.', ephemeral: true });
      } else if (sub === 'reorder') {
        const user = options.getUser('user');
        const pos = options.getInteger('position');
        const result = await apiPost(`/rota/reorder/${guildId}`, { discord_id: user.id, new_position: pos - 1 });
        await interaction.reply(result ? `✅ Moved **${user.username}** to position ${pos}.` : { content: '❌ Failed to reorder.', ephemeral: true });
      }
    } else if (commandName === 'next') {
      const data = await apiGet(`/rota/next/${guildId}`);
      await interaction.reply(data ? { embeds: [buildNextGameEmbed(data.current_session, data.current_picker, data.next_picker, data.game)] } : { content: '❌ No rota set up yet. Use `/rota add @user` to get started.', ephemeral: true });
    } else if (commandName === 'pick') {
      const gameName = options.getString('game');
      const state = await apiGet(`/rota/state/${guildId}`);
      if (!state?.players?.length) { await interaction.reply({ content: '❌ No rota set up yet.', ephemeral: true }); return; }
      const currentPicker = state.players[state.current_index];
      if (currentPicker.discord_id !== interaction.user.id) { await interaction.reply({ content: `❌ It's not your turn! Current picker is <@${currentPicker.discord_id}>.`, ephemeral: true }); return; }
      const result = await apiPost(`/rota/pick/${guildId}`, { game_name: gameName, picker_id: interaction.user.id });
      if (result) {
        const embed = new EmbedBuilder().setTitle('🎉 Game Selected!').setDescription(`**${gameName}** has been selected for the next session!`).setColor(0x57F287).addFields({ name: 'Selected by', value: `<@${interaction.user.id}>`, inline: true }).setTimestamp();
        if (result.game?.image_url) embed.setImage(result.game.image_url);
        await interaction.reply({ embeds: [embed] });
      } else await interaction.reply({ content: '❌ Failed to set game.', ephemeral: true });
    } else if (commandName === 'games') {
      const sub = options.getSubcommand();
      if (sub === 'add') {
        const name = options.getString('name');
        let imageUrl = options.getString('image_url');
        await interaction.deferReply();
        if (!imageUrl) imageUrl = await fetchSteamGameImage(name);
        const result = await apiPost('/rota/games', { guild_id: guildId, name, image_url: imageUrl });
        if (result) {
          const embed = new EmbedBuilder().setTitle('✅ Game Added!').setDescription(`**${name}** has been added to the games list.`).setColor(0x57F287);
          if (imageUrl) embed.setThumbnail(imageUrl);
          await interaction.editReply({ embeds: [embed] });
        } else await interaction.editReply('❌ Failed to add game. It might already exist.');
      } else if (sub === 'list') {
        const games = await apiGet(`/rota/games/${guildId}`);
        await interaction.reply({ embeds: [buildGamesEmbed(games)] });
      } else if (sub === 'preview') {
        const name = options.getString('name');
        const games = await apiGet(`/rota/games/${guildId}`);
        const game = games?.find(g => g.name.toLowerCase() === name.toLowerCase());
        if (game) {
          const embed = new EmbedBuilder().setTitle(`🎮 ${game.name}`).setColor(0x5865F2).setTimestamp();
          if (game.image_url) embed.setImage(game.image_url);
          else embed.setDescription('*No image available - use `/games update` to add one*');
          await interaction.reply({ embeds: [embed] });
        } else await interaction.reply({ content: `❌ Game "${name}" not found.`, ephemeral: true });
      } else if (sub === 'update') {
        const name = options.getString('name');
        let imageUrl = options.getString('image_url');
        await interaction.deferReply();
        if (!imageUrl) imageUrl = await fetchSteamGameImage(name);
        if (!imageUrl) { await interaction.editReply(`❌ Could not find image for "${name}" on Steam. Try providing a manual image URL.`); return; }
        const result = await apiPost(`/rota/games/update/${guildId}`, { name, image_url: imageUrl });
        if (result) {
          const embed = new EmbedBuilder().setTitle(`✅ Updated: ${name}`).setColor(0x57F287).setImage(imageUrl).setTimestamp();
          await interaction.editReply({ embeds: [embed] });
        } else await interaction.editReply(`❌ Failed to update "${name}". Make sure the game exists.`);
      } else if (sub === 'remove') {
        const name = options.getString('name');
        const result = await apiDelete(`/rota/games/${guildId}/${encodeURIComponent(name)}`);
        await interaction.reply(result ? `✅ Removed **${name}** from the games list.` : { content: '❌ Failed to remove game.', ephemeral: true });
      }
    } else if (commandName === 'skip') {
      const result = await apiPost(`/rota/skip/${guildId}`, { discord_id: interaction.user.id });
      await interaction.reply(result ? `✅ <@${interaction.user.id}> has skipped their turn. The rota has been advanced.` : { content: '❌ Failed to skip. Make sure it\'s your turn.', ephemeral: true });
    } else if (commandName === 'cantattend') {
      const state = await apiGet(`/rota/state/${guildId}`);
      const isCurrentPicker = state?.players?.length > 0 && state.players[state.current_index]?.discord_id === interaction.user.id;
      const result = await apiPost(`/rota/absence/${guildId}`, { discord_id: interaction.user.id });
      if (result && isCurrentPicker) {
        await apiPost(`/rota/skip/${guildId}`, { discord_id: interaction.user.id, auto_skip: true });
        const newState = await apiGet(`/rota/state/${guildId}`);
        const newPicker = newState?.players[newState.current_index];
        await interaction.reply(`📢 <@${interaction.user.id}> cannot attend and was scheduled to pick.\n➡️ Rota advanced - <@${newPicker?.discord_id}> is now picking!`);
      } else await interaction.reply(result ? `📢 <@${interaction.user.id}> cannot attend the next gaming session.` : { content: '❌ Failed to mark absence.', ephemeral: true });
    } else if (commandName === 'attending') {
      const data = await apiGet(`/rota/next/${guildId}`);
      if (data?.current_session) {
        const embed = new EmbedBuilder().setTitle('📋 Attendance for Next Session').setColor(0x5865F2).setTimestamp();
        const absentees = data.current_session.absentees || [];
        const attending = (data.players || []).filter(p => !absentees.includes(p.discord_id));
        const notAttending = (data.players || []).filter(p => absentees.includes(p.discord_id));
        if (attending.length) embed.addFields({ name: '✅ Attending', value: attending.map(p => `<@${p.discord_id}>`).join('\n'), inline: true });
        if (notAttending.length) embed.addFields({ name: '❌ Cannot Attend', value: notAttending.map(p => `<@${p.discord_id}>`).join('\n'), inline: true });
        await interaction.reply({ embeds: [embed] });
      } else await interaction.reply({ content: 'No session data available.', ephemeral: true });
    } else if (commandName === 'remind') {
      await sendReminder(guildId, interaction.channel);
      await interaction.reply({ content: '✅ Reminder sent!', ephemeral: true });
    } else if (commandName === 'setchannel') {
      const channel = options.getChannel('channel');
      const result = await apiPost(`/rota/settings/${guildId}`, { reminder_channel_id: channel.id });
      await interaction.reply(result ? `✅ Reminder channel set to <#${channel.id}>.` : { content: '❌ Failed to set channel.', ephemeral: true });
    } else if (commandName === 'history') {
      const sessions = await apiGet(`/rota/history/${guildId}`);
      await interaction.reply({ embeds: [buildHistoryEmbed(sessions)] });
    } else if (commandName === 'setpicker') {
      const user = options.getUser('user');
      const result = await apiPost(`/rota/setpicker/${guildId}`, { discord_id: user.id });
      await interaction.reply(result ? `✅ <@${user.id}> is now the current picker!` : { content: '❌ Failed to set picker. Make sure the user is in the rota.', ephemeral: true });
    } else if (commandName === 'pickfor') {
      const user = options.getUser('user');
      const gameName = options.getString('game');
      const setResult = await apiPost(`/rota/setpicker/${guildId}`, { discord_id: user.id });
      if (!setResult) { await interaction.reply({ content: '❌ Failed - user is not in the rota.', ephemeral: true }); return; }
      const pickResult = await apiPost(`/rota/pick/${guildId}`, { game_name: gameName, picker_id: user.id });
      if (pickResult) {
        const embed = new EmbedBuilder().setTitle('🎉 Game Selected!').setDescription(`**${gameName}** has been selected for the next session!`).setColor(0x57F287).addFields({ name: 'Picked for', value: `<@${user.id}>`, inline: true }, { name: 'Set by', value: `<@${interaction.user.id}>`, inline: true }).setTimestamp();
        if (pickResult.game?.image_url) embed.setImage(pickResult.game.image_url);
        await interaction.reply({ embeds: [embed] });
      } else await interaction.reply({ content: '❌ Failed to set game.', ephemeral: true });
    }
  } catch (error) {
    console.error('Command error:', error);
    const reply = { content: '❌ An error occurred. Please try again.', ephemeral: true };
    if (interaction.deferred) await interaction.editReply(reply);
    else if (!interaction.replied) await interaction.reply(reply);
  }
});

// Scheduled reminders - Thursday noon UK time
cron.schedule('0 12 * * 4', async () => {
  console.log('Running scheduled noon reminder...');
  const settings = await apiGet('/rota/all-settings');
  if (settings) {
    for (const s of settings) {
      if (s.reminder_channel_id) {
        try {
          const ch = await client.channels.fetch(s.reminder_channel_id);
          if (ch) await sendReminder(s.guild_id, ch);
        } catch (e) {
          console.error(`Failed to send reminder to guild ${s.guild_id}:`, e.message);
        }
      }
    }
  }
}, { timezone: 'Europe/London' });

// Scheduled rota advancement - Thursday 10 PM UK time
cron.schedule('0 22 * * 4', async () => {
  console.log('Running scheduled rota advancement...');
  const settings = await apiGet('/rota/all-settings');
  if (settings) {
    for (const s of settings) {
      try {
        const result = await apiPost(`/rota/advance/${s.guild_id}`, {});
        if (result && s.reminder_channel_id) {
          const ch = await client.channels.fetch(s.reminder_channel_id);
          if (ch) {
            const data = await apiGet(`/rota/next/${s.guild_id}`);
            if (data?.current_picker) {
              const embed = new EmbedBuilder()
                .setTitle('🔄 Rota Advanced!')
                .setDescription('Gaming night is over! The rota has moved to the next person.')
                .setColor(0x5865F2)
                .addFields({ name: '🎯 Next Picker', value: `<@${data.current_picker.discord_id}> - it's your turn to pick for next week!`, inline: false })
                .setTimestamp();
              await ch.send({ embeds: [embed] });
            }
          }
        }
      } catch (e) {
        console.error(`Failed to advance rota for guild ${s.guild_id}:`, e.message);
      }
    }
  }
}, { timezone: 'Europe/London' });

// Daily picker nudge - 1 PM UK time, every day until a game is chosen
cron.schedule('0 13 * * *', async () => {
  console.log('Running daily picker nudge...');
  for (const guild of client.guilds.cache.values()) {
    try {
      if (await nudgePicker(guild.id)) console.log(`Nudged the picker in guild ${guild.id}.`);
    } catch (e) {
      console.error(`Failed to nudge picker for guild ${guild.id}:`, e.message);
    }
  }
}, { timezone: 'Europe/London' });

// Bot ready
client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('Gaming Rota', { type: ActivityType.Watching });
});

// Login
client.login(process.env.DISCORD_TOKEN);
