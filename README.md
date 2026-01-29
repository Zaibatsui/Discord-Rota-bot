# Gaming Rota Discord Bot

A Discord bot to manage your gaming group's rotating game selection.

## Features

- **Rotating Rota**: Fair turn-based game selection
- **Game Management**: Add games with auto-fetched Steam images
- **Reminders**: Automatic Thursday noon reminders
- **Absence Tracking**: Mark yourself as unavailable
- **Admin Controls**: Set picker, pick on behalf of others

## Discord Commands

| Command | Description |
|---------|-------------|
| `/rota add @user` | Add user to rota |
| `/rota remove @user` | Remove user from rota |
| `/rota list` | View current rota |
| `/next` | Show next game & picker |
| `/pick [game]` | Select game (your turn only) |
| `/games add [name]` | Add game to list |
| `/games list` | Show all games |
| `/games preview [name]` | Preview game with image |
| `/games update [name]` | Re-fetch/update game image |
| `/cantattend` | Mark yourself as absent |
| `/skip` | Skip your turn |
| `/remind` | Send manual reminder |
| `/setchannel #channel` | Set reminder channel |
| `/history` | View past sessions |

### Admin Commands (require Administrator permission)
| Command | Description |
|---------|-------------|
| `/setpicker @user` | Manually set current picker |
| `/pickfor @user [game]` | Pick game for someone else |

## Deployment with Docker

### Prerequisites
- Docker & Docker Compose
- Discord Bot Token ([create here](https://discord.com/developers/applications))
- Steam API Key ([get here](https://steamcommunity.com/dev/apikey))

### Quick Start

1. **Clone and configure**
   ```bash
   cp .env.example .env
   # Edit .env with your tokens
   ```

2. **Build and run**
   ```bash
   docker-compose up -d --build
   ```

3. **Check logs**
   ```bash
   docker-compose logs -f discord-bot
   ```

4. **Stop**
   ```bash
   docker-compose down
   ```

### Bot Invite URL

Replace `YOUR_CLIENT_ID` with your bot's Application ID:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147485696&scope=bot%20applications.commands
```

Required permissions:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `STEAM_API_KEY` | Steam API key for game images |
| `BACKEND_URL` | API URL (default: `http://backend:8001/api`) |
| `GAMING_DAY` | Day of week for reminders (4 = Thursday) |
| `REMINDER_HOUR` | Hour for reminder (default: 12) |
| `TIMEZONE` | Timezone (default: `Europe/London`) |

## Manual Deployment (without Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Discord Bot
```bash
cd discord-bot
npm install
npm run deploy-commands  # First time only
npm start
```

## Data Storage

Data is stored in JSON files in the `data/` directory:
- `rota.json` - Player rotas per guild
- `games.json` - Games list per guild
- `sessions.json` - Session history
- `settings.json` - Guild settings (reminder channel)

## Scheduled Tasks

- **12:00 PM Thursday (UK)**: Reminder sent to configured channel
- **10:00 PM Thursday (UK)**: Rota automatically advances to next picker

## License

MIT
