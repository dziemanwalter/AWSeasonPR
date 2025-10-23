import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

interface PlayerStreak {
  name: string;
  highStreak: number;
  currentStreak: number;
  totalKills: number;
  totalDeaths: number;
  battlegroup: string;
  isNewHigh: boolean;
}

interface DeletedCSVPlayer {
  name: string;
  deletedDate: string;
}

const STREAKS_CSV_FILE = path.join(process.cwd(), "Streaks.csv");

// --- Helper Functions ---

function readDeletedCSVPlayers(): DeletedCSVPlayer[] {
  try {
    const deletedFile = path.join(process.cwd(), "data", "deletedCSVPlayers.json");
    if (!fs.existsSync(deletedFile)) {
      return [];
    }
    const data = fs.readFileSync(deletedFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading deleted CSV players:", error);
    return [];
  }
}

function getPlayerBattlegroup(playerName: string): string {
  try {
    const playerDataPath = path.join(process.cwd(), "C.Av PR aDR.csv");
    if (fs.existsSync(playerDataPath)) {
      const fileContent = fs.readFileSync(playerDataPath, "utf-8");
      const records: string[][] = parse(fileContent, { skip_empty_lines: true });
      
      if (records.length > 1) {
        const playerRow = records[1]; // Row 2 (0-indexed)
        const playerIndex = playerRow.findIndex(cell => cell.trim() === playerName);
        if (playerIndex !== -1) {
          if (playerIndex >= 2 && playerIndex <= 11) return "BG1";
          if (playerIndex >= 12 && playerIndex <= 21) return "BG2";
          if (playerIndex >= 22 && playerIndex <= 31) return "BG3";
        }
      }
    }
  } catch (err) {
    console.error("Error reading player data:", err);
  }
  return "Unknown";
}

function loadInitialStreakData(): PlayerStreak[] {
  const players: PlayerStreak[] = [];
  
  if (!fs.existsSync(STREAKS_CSV_FILE)) {
    console.error("Streaks.csv file not found");
    return players;
  }

  try {
    const records: string[][] = parse(fs.readFileSync(STREAKS_CSV_FILE, "utf-8"), { skip_empty_lines: true });
    // Read deleted CSV player names (case-insensitive)
    let deletedNames: string[] = [];
    try {
      const deletedFile = path.join(process.cwd(), "data", "deletedCSVPlayers.json");
      if (fs.existsSync(deletedFile)) {
        const deletedPlayers: DeletedCSVPlayer[] = JSON.parse(fs.readFileSync(deletedFile, "utf-8"));
        deletedNames = deletedPlayers.map(p => p.name.toLowerCase());
      }
    } catch (err) {
      console.error("Error reading deleted CSV players:", err);
    }
    
    for (const row of records) {
      // Skip header row and rows without enough data
      if (row[0] === 'Player' || !row[0] || !row[1] || !row[2]) continue;
      
      const playerName = row[0].trim();
      if (deletedNames.includes(playerName.toLowerCase())) continue;
      const highStreak = parseInt(row[1]) || 0;
      const currentStreak = parseInt(row[2]) || 0;
      
      // Only include players with valid data
      if (playerName && (highStreak > 0 || currentStreak > 0)) {
        const battlegroup = getPlayerBattlegroup(playerName);
        
        
        players.push({
          name: playerName,
          highStreak: highStreak,
          currentStreak: currentStreak,
          totalKills: highStreak, // Use high streak as total kills baseline
          totalDeaths: 0, // No deaths in CSV baseline
          battlegroup: battlegroup,
          isNewHigh: false
        });
      }
    }
  } catch (err) {
    console.error("Error parsing CSV:", err);
  }

  return players;
}

// --- API Handlers ---

export async function GET() {
  try {
    // Process live data from playerNodes.json only
    const savedFile = path.join(process.cwd(), "data", "playerNodes.json");
    if (fs.existsSync(savedFile)) {
      const savedRows: { player: string; entries: { node?: number; deaths?: number; war?: number; carryOver?: boolean }[] }[] =
        JSON.parse(fs.readFileSync(savedFile, "utf-8"));

      // Filter out deleted CSV players from playerNodes.json data
      const deletedCSVPlayerNames = readDeletedCSVPlayers().map(p => p.name.toLowerCase());
      const filteredRows = savedRows.filter(row => !deletedCSVPlayerNames.includes(row.player.toLowerCase()));

      // Create a map for all players from live data
      const playerMap = new Map<string, PlayerStreak>();
      
      // Process live data for each player
      filteredRows.forEach((row) => {
        const playerName = row.player;
        let player = playerMap.get(playerName);
        
        if (!player) {
          // Create new player entry
          const battlegroup = getPlayerBattlegroup(playerName);
          player = {
            name: playerName,
            highStreak: 0,
            currentStreak: 0,
            totalKills: 0,
            totalDeaths: 0,
            battlegroup: battlegroup,
            isNewHigh: false
          };
          playerMap.set(playerName, player);
        }

        // Calculate current streak and track highest streak from live data
        let currentStreak = 0;
        let highestStreak = 0;
        let liveKills = 0;
        let liveDeaths = 0;

        // Sort entries chronologically
        const sortedEntries = [...(row.entries || [])].sort((a, b) => {
          const warA = a.war;
          const warB = b.war;
          
          if (warA === undefined && warB === undefined) return 0;
          if (warA === undefined) return -1;
          if (warB === undefined) return 1;
          
          return warA - warB;
        });

        sortedEntries.forEach((entry) => {
          const kills = entry.node ? 1 : 0;
          const deaths = entry.deaths || 0;
          
          // Process kills first
          if (kills > 0) {
            currentStreak += kills;
            liveKills += kills;
            // Track highest streak achieved
            if (currentStreak > highestStreak) {
              highestStreak = currentStreak;
            }
          }
          
          // Process deaths (this resets the streak)
          if (deaths > 0) {
            currentStreak = 0; // Deaths reset streak
            liveDeaths += deaths;
          }
        });

        // Update player data with live data
        player.currentStreak = currentStreak;
        player.totalKills = liveKills;
        player.totalDeaths = liveDeaths;
        
        // Set high streak to the highest streak achieved in live data
        if (highestStreak > player.highStreak) {
          player.highStreak = highestStreak;
          player.isNewHigh = currentStreak === highestStreak;
        } else {
          player.isNewHigh = false;
        }
      });

      // Convert map back to array
      const updatedPlayers = Array.from(playerMap.values());
      
      return new Response(JSON.stringify({ 
        allTimeStreaks: updatedPlayers, 
        totalPlayers: updatedPlayers.length 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // If no live data file, return empty array
    return new Response(JSON.stringify({ 
      allTimeStreaks: [], 
      totalPlayers: 0 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { player, kills, deaths } = body;
    
    if (!player || kills === undefined || deaths === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // For now, just return success - you can implement CSV writing logic here later
    return new Response(JSON.stringify({ 
      message: "Entry added successfully",
      player,
      kills,
      deaths
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
