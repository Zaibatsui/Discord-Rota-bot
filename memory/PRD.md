# Gaming Rota Discord Bot - PRD

## Original Problem Statement
Build a Discord-integrated app for a small gaming group to manage game selection using a rotating rota system. Primary interface is Discord bot with slash commands, automatic reminders, and game image fetching from Steam.

## User Personas
- **Gaming Group Members**: Friends who regularly game together on Discord, need fair/visible game selection
- **Rota Manager**: Person who sets up the bot and manages the rota order

## Core Requirements (Static)
- Discord bot as primary interface
- Rotating rota for game picker selection
- Display current game and next picker
- Game list management with Steam image fetching
- Automatic reminders on gaming day (Thursdays at noon UK time)
- Absence tracking for sessions
- Simple JSON file persistence

## What's Been Implemented (December 2025)

### Discord Bot (Node.js)
- **Slash Commands**:
  - `/rota add @user` - Add user to rota
  - `/rota remove @user` - Remove user from rota
  - `/rota list` - View rota order with current picker highlighted
  - `/rota reorder @user [position]` - Reorder rota
  - `/next` - Show next game and upcoming picker
  - `/pick [game]` - Select game (only works for current picker)
  - `/games add [name]` - Add game (auto-fetches Steam image)
  - `/games list` - Show all games
  - `/games remove [name]` - Remove game
  - `/skip` - Skip your turn
  - `/cantattend` - Mark yourself as absent
  - `/attending` - Show attendance status
  - `/remind` - Manual reminder trigger
  - `/setchannel #channel` - Set reminder channel
  - `/history` - View past sessions

### Backend API (FastAPI)
- Full CRUD for players, games, sessions, settings
- JSON file persistence in `/app/backend/data/`
- No MongoDB dependency

### Features
- Rich Discord embeds with game images
- Steam API integration for game artwork
- Scheduled reminders via node-cron (Thursdays 12:00 UK)
- Autocomplete for game names in commands
- Turn enforcement (only current picker can use /pick)

## Prioritized Backlog

### P0 - Critical (Done)
- ✅ Bot login and slash command registration
- ✅ Rota CRUD operations
- ✅ Game selection flow
- ✅ Scheduled reminders

### P1 - Important (Future)
- Confirmation before session advances (post-gaming night)
- Vote system for game selection (optional mode)
- Weekly summary embed

### P2 - Nice to Have (Future)
- Game ratings/reviews from group
- Statistics dashboard (most played games, picker streaks)
- Web UI for non-Discord management

## Technical Architecture
- **Discord Bot**: Node.js + discord.js v14, runs on port 3001 internally
- **Backend**: FastAPI on port 8001
- **Storage**: JSON files in `/app/backend/data/`
- **Scheduling**: node-cron with Europe/London timezone

## Next Action Items
1. Test bot in actual Discord server with real users
2. Add `/complete` command to advance rota after gaming session
3. Consider vote mode for democratic game selection
