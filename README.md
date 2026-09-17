# Gaming Rota Discord Bot

A Discord bot to manage your gaming group's rotating game selection rota.

**Developed by Zaibatsui Labs**

## Features

- **Rotating Rota**: Fair turn-based game picker selection
- **Game Library**: Add games with auto-fetched Steam images
- **Automatic Reminders**: Thursday noon reminders + 10 PM rota advancement
- **Absence Tracking**: Mark yourself unavailable, auto-skip if you're the picker
- **Admin Controls**: Set picker manually, pick on behalf of others

## Discord Commands

| Command | Description |
|---------|-------------|
| `/rota add @user` | Add user to rota |
| `/rota remove @user` | Remove user from rota |
| `/rota list` | View current rota order |
| `/rota reorder @user [position]` | Move user in rota |
| `/next` | Show next game & picker info |
| `/pick [game]` | Select game (your turn only) |
| `/games add [name]` | Add game (auto-fetches Steam image) |
| `/games list` | Show all games |
| `/games preview [name]` | Preview game with image |
| `/games update [name]` | Update/re-fetch game image |
| `/games remove [name]` | Remove a game |
| `/cantattend` | Mark yourself as absent |
| `/skip` | Skip your turn |
| `/attending` | Show attendance status |
| `/remind` | Send manual reminder |
| `/setchannel #channel` | Set reminder channel |
| `/history` | View past sessions |

### Admin Commands (require Administrator permission)

| Command | Description |
|---------|-------------|
| `/setpicker @user` | Manually set current picker |
| `/pickfor @user [game]` | Pick game for someone else |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Discord Bot Token ([create here](https://discord.com/developers/applications))
- Steam API Key ([get here](https://steamcommunity.com/dev/apikey))

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → Name it (e.g., "Gaming Rota Bot")
3. Go to **Bot** section → Reset Token → Copy it
4. Enable **Server Members Intent** and **Message Content Intent**
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`
6. Copy the generated URL and invite the bot to your server

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/gaming-rota-bot.git
cd gaming-rota-bot

# Create environment file
cp .env.example .env
# Edit .env with your tokens

# Start the bot
docker compose up -d --build

# Check logs
docker compose logs -f discord-bot
```

### Configuration

Edit `.env` with your values:

```env
DISCORD_TOKEN=your_discord_bot_token
STEAM_API_KEY=your_steam_api_key
```

## Architecture

```
├── backend/          # FastAPI REST API
│   ├── server.py     # Main API server
│   ├── Dockerfile
│   └── requirements.txt
├── discord-bot/      # Discord.js bot
│   ├── index.js      # Bot logic
│   ├── deploy-commands.js
│   ├── package.json
│   └── Dockerfile
├── frontend/         # React status page (optional)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── data/             # JSON data storage
├── docker-compose.yml
└── .env.example
```

## Scheduled Tasks

| Time | Action |
|------|--------|
| **12:00 PM Thursday (UK)** | Reminder sent to configured channel |
| **10:00 PM Thursday (UK)** | Rota automatically advances to next picker |

## Data Storage

Data is stored in JSON files in the `data/` directory:

- `rota.json` - Player rotas per guild
- `games.json` - Games list per guild  
- `sessions.json` - Session history
- `settings.json` - Guild settings (reminder channel)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | Yes |
| `STEAM_API_KEY` | Steam API key for game images | Yes |
| `BACKEND_URL` | API URL (default: `http://backend:8001/api`) | No |

## Ports

| Service | Internal | Default External |
|---------|----------|------------------|
| Backend API | 8001 | 8003 |
| Frontend | 80 | 3002 |

Adjust external ports in `docker-compose.yml` if needed.

## Development

### Running Locally (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

**Discord Bot:**
```bash
cd discord-bot
npm install
npm run deploy-commands  # First time only
npm start
```

### Useful Commands

```bash
# View logs
docker compose logs -f

# Restart bot
docker compose restart discord-bot

# Rebuild after changes
docker compose up -d --build

# Stop everything
docker compose down
```

## License

MIT License - See [LICENSE](LICENSE)

---

*Built with ❤️ by Zaibatsui Labs*
