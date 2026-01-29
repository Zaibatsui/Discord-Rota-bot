from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Data file paths
DATA_DIR = ROOT_DIR / 'data'
DATA_DIR.mkdir(exist_ok=True)

ROTA_FILE = DATA_DIR / 'rota.json'
GAMES_FILE = DATA_DIR / 'games.json'
SESSIONS_FILE = DATA_DIR / 'sessions.json'
SETTINGS_FILE = DATA_DIR / 'settings.json'

# Create the main app
app = FastAPI(title="Gaming Rota API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic Models
class Player(BaseModel):
    discord_id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None

class PlayerCreate(BaseModel):
    guild_id: str
    discord_id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None

class Game(BaseModel):
    name: str
    image_url: Optional[str] = None

class GameCreate(BaseModel):
    guild_id: str
    name: str
    image_url: Optional[str] = None

class Session(BaseModel):
    id: str
    guild_id: str
    date: str
    picker_id: str
    game_name: Optional[str] = None
    absentees: List[str] = []
    completed: bool = False

class PickGame(BaseModel):
    game_name: str
    picker_id: str

class ReorderRequest(BaseModel):
    discord_id: str
    new_position: int

class AbsenceRequest(BaseModel):
    discord_id: str

class SkipRequest(BaseModel):
    discord_id: str
    auto_skip: bool = False

class SettingsUpdate(BaseModel):
    reminder_channel_id: Optional[str] = None

class GuildSettings(BaseModel):
    guild_id: str
    reminder_channel_id: Optional[str] = None

class RotaState(BaseModel):
    guild_id: str
    players: List[Player]
    current_index: int

# Data persistence helpers
def load_json(file_path: Path, default=None):
    if default is None:
        default = {}
    if file_path.exists():
        with open(file_path, 'r') as f:
            return json.load(f)
    return default

def save_json(file_path: Path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

def get_guild_rota(guild_id: str):
    data = load_json(ROTA_FILE)
    return data.get(guild_id, {"players": [], "current_index": 0})

def save_guild_rota(guild_id: str, rota_data):
    data = load_json(ROTA_FILE)
    data[guild_id] = rota_data
    save_json(ROTA_FILE, data)

def get_guild_games(guild_id: str):
    data = load_json(GAMES_FILE)
    return data.get(guild_id, [])

def save_guild_games(guild_id: str, games):
    data = load_json(GAMES_FILE)
    data[guild_id] = games
    save_json(GAMES_FILE, data)

def get_guild_sessions(guild_id: str):
    data = load_json(SESSIONS_FILE)
    return data.get(guild_id, [])

def save_guild_sessions(guild_id: str, sessions):
    data = load_json(SESSIONS_FILE)
    data[guild_id] = sessions
    save_json(SESSIONS_FILE, data)

def get_guild_settings(guild_id: str):
    data = load_json(SETTINGS_FILE)
    return data.get(guild_id, {"guild_id": guild_id, "reminder_channel_id": None})

def save_guild_settings(guild_id: str, settings):
    data = load_json(SETTINGS_FILE)
    data[guild_id] = settings
    save_json(SETTINGS_FILE, data)

def get_current_session(guild_id: str):
    sessions = get_guild_sessions(guild_id)
    # Find the most recent incomplete session
    for session in reversed(sessions):
        if not session.get("completed", False):
            return session
    return None

def create_new_session(guild_id: str, picker_id: str):
    sessions = get_guild_sessions(guild_id)
    new_session = {
        "id": f"{guild_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "guild_id": guild_id,
        "date": datetime.now(timezone.utc).isoformat(),
        "picker_id": picker_id,
        "game_name": None,
        "absentees": [],
        "completed": False
    }
    sessions.append(new_session)
    save_guild_sessions(guild_id, sessions)
    return new_session

class SetPickerRequest(BaseModel):
    discord_id: str

# API Routes

@api_router.get("/")
async def root():
    return {"message": "Gaming Rota API", "status": "running"}

# Player Management
@api_router.post("/rota/players")
async def add_player(player: PlayerCreate):
    rota = get_guild_rota(player.guild_id)
    
    # Check if player already exists
    for p in rota["players"]:
        if p["discord_id"] == player.discord_id:
            raise HTTPException(status_code=400, detail="Player already in rota")
    
    new_player = {
        "discord_id": player.discord_id,
        "username": player.username,
        "display_name": player.display_name,
        "avatar_url": player.avatar_url
    }
    rota["players"].append(new_player)
    save_guild_rota(player.guild_id, rota)
    
    # Create initial session if this is the first player
    if len(rota["players"]) == 1:
        create_new_session(player.guild_id, player.discord_id)
    
    return {"success": True, "player": new_player}

@api_router.delete("/rota/players/{guild_id}/{discord_id}")
async def remove_player(guild_id: str, discord_id: str):
    rota = get_guild_rota(guild_id)
    
    original_length = len(rota["players"])
    rota["players"] = [p for p in rota["players"] if p["discord_id"] != discord_id]
    
    if len(rota["players"]) == original_length:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Adjust current index if necessary
    if rota["current_index"] >= len(rota["players"]) and len(rota["players"]) > 0:
        rota["current_index"] = 0
    
    save_guild_rota(guild_id, rota)
    return {"success": True}

@api_router.get("/rota/state/{guild_id}")
async def get_rota_state(guild_id: str):
    rota = get_guild_rota(guild_id)
    return {
        "guild_id": guild_id,
        "players": rota["players"],
        "current_index": rota["current_index"]
    }

@api_router.post("/rota/reorder/{guild_id}")
async def reorder_player(guild_id: str, request: ReorderRequest):
    rota = get_guild_rota(guild_id)
    
    # Find the player
    player_index = None
    for i, p in enumerate(rota["players"]):
        if p["discord_id"] == request.discord_id:
            player_index = i
            break
    
    if player_index is None:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Remove and insert at new position
    player = rota["players"].pop(player_index)
    new_pos = max(0, min(request.new_position, len(rota["players"])))
    rota["players"].insert(new_pos, player)
    
    save_guild_rota(guild_id, rota)
    return {"success": True}

# Game Management
@api_router.post("/rota/games")
async def add_game(game: GameCreate):
    games = get_guild_games(game.guild_id)
    
    # Check if game already exists
    for g in games:
        if g["name"].lower() == game.name.lower():
            raise HTTPException(status_code=400, detail="Game already exists")
    
    new_game = {
        "name": game.name,
        "image_url": game.image_url
    }
    games.append(new_game)
    save_guild_games(game.guild_id, games)
    
    return {"success": True, "game": new_game}

@api_router.get("/rota/games/{guild_id}")
async def list_games(guild_id: str):
    return get_guild_games(guild_id)

@api_router.get("/rota/games")
async def list_all_games():
    """List all games across all guilds (for autocomplete)"""
    data = load_json(GAMES_FILE)
    all_games = []
    seen = set()
    for guild_games in data.values():
        for game in guild_games:
            if game["name"].lower() not in seen:
                all_games.append(game)
                seen.add(game["name"].lower())
    return all_games

class GameUpdate(BaseModel):
    name: str
    image_url: str

@api_router.post("/rota/games/update/{guild_id}")
async def update_game(guild_id: str, update: GameUpdate):
    games = get_guild_games(guild_id)
    
    # Find and update the game
    found = False
    for game in games:
        if game["name"].lower() == update.name.lower():
            game["image_url"] = update.image_url
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Game not found")
    
    save_guild_games(guild_id, games)
    return {"success": True}

@api_router.delete("/rota/games/{guild_id}/{game_name}")
async def remove_game(guild_id: str, game_name: str):
    games = get_guild_games(guild_id)
    original_length = len(games)
    games = [g for g in games if g["name"].lower() != game_name.lower()]
    
    if len(games) == original_length:
        raise HTTPException(status_code=404, detail="Game not found")
    
    save_guild_games(guild_id, games)
    return {"success": True}

# Session Management
@api_router.get("/rota/next/{guild_id}")
async def get_next_session(guild_id: str):
    rota = get_guild_rota(guild_id)
    
    if not rota["players"]:
        return None
    
    current_picker = rota["players"][rota["current_index"]] if rota["players"] else None
    next_index = (rota["current_index"] + 1) % len(rota["players"])
    next_picker = rota["players"][next_index] if len(rota["players"]) > 1 else None
    
    current_session = get_current_session(guild_id)
    if not current_session and current_picker:
        current_session = create_new_session(guild_id, current_picker["discord_id"])
    
    # Get game info if game is set
    game = None
    if current_session and current_session.get("game_name"):
        games = get_guild_games(guild_id)
        for g in games:
            if g["name"].lower() == current_session["game_name"].lower():
                game = g
                break
    
    return {
        "current_session": current_session,
        "current_picker": current_picker,
        "next_picker": next_picker,
        "players": rota["players"],
        "game": game
    }

@api_router.post("/rota/pick/{guild_id}")
async def pick_game(guild_id: str, pick: PickGame):
    rota = get_guild_rota(guild_id)
    
    if not rota["players"]:
        raise HTTPException(status_code=400, detail="No players in rota")
    
    current_picker = rota["players"][rota["current_index"]]
    if current_picker["discord_id"] != pick.picker_id:
        raise HTTPException(status_code=403, detail="Not your turn to pick")
    
    # Get or create current session
    current_session = get_current_session(guild_id)
    if not current_session:
        current_session = create_new_session(guild_id, pick.picker_id)
    
    # Update session with game
    sessions = get_guild_sessions(guild_id)
    for session in sessions:
        if session["id"] == current_session["id"]:
            session["game_name"] = pick.game_name
            break
    save_guild_sessions(guild_id, sessions)
    
    # Get game info
    game = None
    games = get_guild_games(guild_id)
    for g in games:
        if g["name"].lower() == pick.game_name.lower():
            game = g
            break
    
    # If game doesn't exist, add it
    if not game:
        game = {"name": pick.game_name, "image_url": None}
        games.append(game)
        save_guild_games(guild_id, games)
    
    return {"success": True, "game": game}

@api_router.post("/rota/skip/{guild_id}")
async def skip_turn(guild_id: str, request: SkipRequest):
    rota = get_guild_rota(guild_id)
    
    if not rota["players"]:
        raise HTTPException(status_code=400, detail="No players in rota")
    
    current_picker = rota["players"][rota["current_index"]]
    
    # Allow skip if it's the user's turn OR if it's an auto-skip due to absence
    if current_picker["discord_id"] != request.discord_id and not request.auto_skip:
        raise HTTPException(status_code=403, detail="Not your turn to skip")
    
    # Complete current session
    sessions = get_guild_sessions(guild_id)
    current_session = get_current_session(guild_id)
    if current_session:
        for session in sessions:
            if session["id"] == current_session["id"]:
                session["completed"] = True
                session["game_name"] = "Skipped (absent)" if request.auto_skip else "Skipped"
                break
        save_guild_sessions(guild_id, sessions)
    
    # Advance rota
    rota["current_index"] = (rota["current_index"] + 1) % len(rota["players"])
    save_guild_rota(guild_id, rota)
    
    # Create new session for next picker
    new_picker = rota["players"][rota["current_index"]]
    create_new_session(guild_id, new_picker["discord_id"])
    
    return {"success": True, "new_picker": new_picker}

@api_router.post("/rota/advance/{guild_id}")
async def advance_rota(guild_id: str):
    """Advance to next person in rota (after a session is complete)"""
    rota = get_guild_rota(guild_id)
    
    if not rota["players"]:
        raise HTTPException(status_code=400, detail="No players in rota")
    
    # Complete current session
    current_session = get_current_session(guild_id)
    if current_session:
        sessions = get_guild_sessions(guild_id)
        for session in sessions:
            if session["id"] == current_session["id"]:
                session["completed"] = True
                break
        save_guild_sessions(guild_id, sessions)
    
    # Advance rota
    rota["current_index"] = (rota["current_index"] + 1) % len(rota["players"])
    save_guild_rota(guild_id, rota)
    
    # Create new session for next picker
    new_picker = rota["players"][rota["current_index"]]
    create_new_session(guild_id, new_picker["discord_id"])
    
    return {"success": True}

@api_router.post("/rota/absence/{guild_id}")
async def mark_absence(guild_id: str, request: AbsenceRequest):
    current_session = get_current_session(guild_id)
    
    if not current_session:
        rota = get_guild_rota(guild_id)
        if rota["players"]:
            current_picker = rota["players"][rota["current_index"]]
            current_session = create_new_session(guild_id, current_picker["discord_id"])
        else:
            raise HTTPException(status_code=400, detail="No rota set up")
    
    sessions = get_guild_sessions(guild_id)
    for session in sessions:
        if session["id"] == current_session["id"]:
            if request.discord_id not in session["absentees"]:
                session["absentees"].append(request.discord_id)
            break
    save_guild_sessions(guild_id, sessions)
    
    return {"success": True}

@api_router.get("/rota/history/{guild_id}")
async def get_history(guild_id: str):
    sessions = get_guild_sessions(guild_id)
    # Return completed sessions, most recent first
    completed = [s for s in sessions if s.get("completed", False)]
    return list(reversed(completed))

@api_router.post("/rota/setpicker/{guild_id}")
async def set_picker(guild_id: str, request: SetPickerRequest):
    rota = get_guild_rota(guild_id)
    
    if not rota["players"]:
        raise HTTPException(status_code=400, detail="No players in rota")
    
    # Find the player index
    player_index = None
    for i, p in enumerate(rota["players"]):
        if p["discord_id"] == request.discord_id:
            player_index = i
            break
    
    if player_index is None:
        raise HTTPException(status_code=404, detail="Player not found in rota")
    
    # Set current index to this player
    rota["current_index"] = player_index
    save_guild_rota(guild_id, rota)
    
    # Create new session for this picker
    create_new_session(guild_id, request.discord_id)
    
    return {"success": True, "current_picker": rota["players"][player_index]}

# Settings Management
@api_router.post("/rota/settings/{guild_id}")
async def update_settings(guild_id: str, settings: SettingsUpdate):
    current = get_guild_settings(guild_id)
    if settings.reminder_channel_id is not None:
        current["reminder_channel_id"] = settings.reminder_channel_id
    save_guild_settings(guild_id, current)
    return {"success": True, "settings": current}

@api_router.get("/rota/settings/{guild_id}")
async def get_settings(guild_id: str):
    return get_guild_settings(guild_id)

@api_router.get("/rota/all-settings")
async def get_all_settings():
    """Get all guild settings (for scheduled reminders)"""
    data = load_json(SETTINGS_FILE)
    return [{"guild_id": k, **v} for k, v in data.items()]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
