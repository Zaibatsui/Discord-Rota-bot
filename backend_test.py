import requests
import sys
import json
from datetime import datetime

class GamingRotaAPITester:
    def __init__(self, base_url="https://gamerota.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_guild_id = "test_guild_123"
        self.test_user_id = "test_user_456"
        self.test_user_id_2 = "test_user_789"

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_status(self):
        """Test basic API status endpoint"""
        return self.run_test(
            "API Status",
            "GET",
            "api/",
            200
        )

    def test_add_player(self, discord_id, username, display_name):
        """Test adding a player to the rota"""
        return self.run_test(
            f"Add Player ({username})",
            "POST",
            "api/rota/players",
            200,
            data={
                "guild_id": self.test_guild_id,
                "discord_id": discord_id,
                "username": username,
                "display_name": display_name,
                "avatar_url": f"https://example.com/avatar_{discord_id}.png"
            }
        )

    def test_get_rota_state(self):
        """Test getting rota state"""
        return self.run_test(
            "Get Rota State",
            "GET",
            f"api/rota/state/{self.test_guild_id}",
            200
        )

    def test_remove_player(self, discord_id):
        """Test removing a player from the rota"""
        return self.run_test(
            f"Remove Player ({discord_id})",
            "DELETE",
            f"api/rota/players/{self.test_guild_id}/{discord_id}",
            200
        )

    def test_add_game(self, game_name, image_url=None):
        """Test adding a game"""
        return self.run_test(
            f"Add Game ({game_name})",
            "POST",
            "api/rota/games",
            200,
            data={
                "guild_id": self.test_guild_id,
                "name": game_name,
                "image_url": image_url
            }
        )

    def test_list_games(self):
        """Test listing games for a guild"""
        return self.run_test(
            "List Games",
            "GET",
            f"api/rota/games/{self.test_guild_id}",
            200
        )

    def test_get_next_session(self):
        """Test getting next session info"""
        return self.run_test(
            "Get Next Session",
            "GET",
            f"api/rota/next/{self.test_guild_id}",
            200
        )

    def test_pick_game(self, game_name, picker_id):
        """Test picking a game when it's user's turn"""
        return self.run_test(
            f"Pick Game ({game_name})",
            "POST",
            f"api/rota/pick/{self.test_guild_id}",
            200,
            data={
                "game_name": game_name,
                "picker_id": picker_id
            }
        )

    def test_mark_absence(self, discord_id):
        """Test marking absence"""
        return self.run_test(
            f"Mark Absence ({discord_id})",
            "POST",
            f"api/rota/absence/{self.test_guild_id}",
            200,
            data={
                "discord_id": discord_id
            }
        )

    def test_skip_turn(self, discord_id):
        """Test skipping turn"""
        return self.run_test(
            f"Skip Turn ({discord_id})",
            "POST",
            f"api/rota/skip/{self.test_guild_id}",
            200,
            data={
                "discord_id": discord_id
            }
        )

    def test_get_history(self):
        """Test getting session history"""
        return self.run_test(
            "Get Session History",
            "GET",
            f"api/rota/history/{self.test_guild_id}",
            200
        )

    def test_update_settings(self, channel_id):
        """Test updating reminder settings"""
        return self.run_test(
            "Update Settings",
            "POST",
            f"api/rota/settings/{self.test_guild_id}",
            200,
            data={
                "reminder_channel_id": channel_id
            }
        )

    def test_get_settings(self):
        """Test getting settings"""
        return self.run_test(
            "Get Settings",
            "GET",
            f"api/rota/settings/{self.test_guild_id}",
            200
        )

def main():
    print("🎮 Gaming Rota API Testing Suite")
    print("=" * 50)
    
    tester = GamingRotaAPITester()
    
    # Test 1: API Status
    success, _ = tester.test_api_status()
    if not success:
        print("❌ API is not responding. Stopping tests.")
        return 1

    # Test 2: Add players to rota
    tester.test_add_player(tester.test_user_id, "testuser1", "Test User 1")
    tester.test_add_player(tester.test_user_id_2, "testuser2", "Test User 2")

    # Test 3: Get rota state
    success, rota_data = tester.test_get_rota_state()
    
    # Test 4: Add games
    tester.test_add_game("Counter-Strike 2", "https://example.com/cs2.jpg")
    tester.test_add_game("Valorant", "https://example.com/valorant.jpg")
    
    # Test 5: List games
    tester.test_list_games()
    
    # Test 6: Get next session info
    success, next_data = tester.test_get_next_session()
    
    # Test 7: Pick a game (should be first user's turn)
    if success and next_data and next_data.get('current_picker'):
        current_picker_id = next_data['current_picker']['discord_id']
        tester.test_pick_game("Counter-Strike 2", current_picker_id)
    
    # Test 8: Mark absence
    tester.test_mark_absence(tester.test_user_id_2)
    
    # Test 9: Get session history
    tester.test_get_history()
    
    # Test 10: Update settings
    tester.test_update_settings("test_channel_123")
    
    # Test 11: Get settings
    tester.test_get_settings()
    
    # Test 12: Skip turn (advance rota)
    if success and next_data and next_data.get('current_picker'):
        current_picker_id = next_data['current_picker']['discord_id']
        tester.test_skip_turn(current_picker_id)
    
    # Test 13: Remove player (cleanup)
    tester.test_remove_player(tester.test_user_id_2)
    
    # Final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())