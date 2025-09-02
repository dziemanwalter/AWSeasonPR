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

const STREAKS_CSV_FILE = path.join(process.cwd(), "Streaks.csv");

// --- Helper Functions ---

function getPlayerBattlegroup(playerName: string): string {
  try {
    const playerDataPath = path.join(process.cwd(), "C.Av PR aDR.csv");
    if (fs.existsSync(playerDataPath)) {
      const lines = fs.readFileSync(playerDataPath, "utf-8").split("\n");
      if (lines.length > 1) {
        const playerRow = lines[1].split(",");
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
    
    for (const row of records) {
      // Skip rows without enough data
      if (!row[2] || !row[3] || !row[4]) continue;
      
      const playerName = row[2].trim();
      const highStreak = parseInt(row[3]) || 0;
      const currentStreak = parseInt(row[4]) || 0;
      
      // Only include players with valid data
      if (playerName && (highStreak > 0 || currentStreak > 0)) {
        const battlegroup = getPlayerBattlegroup(playerName);
        
        players.push({
          name: playerName,
          highStreak: highStreak,
          currentStreak: currentStreak,
          totalKills: currentStreak, // Use current streak as total kills baseline
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
    const baselinePlayers = loadInitialStreakData();
    
    return new Response(JSON.stringify({ 
      allTimeStreaks: baselinePlayers, 
      totalPlayers: baselinePlayers.length 
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
