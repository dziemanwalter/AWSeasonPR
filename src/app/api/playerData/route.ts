import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

interface Player {
  name: string;
  kills: number;
  deaths: number;
  killsPerNode: Record<string, number>;
  deathsPerNode: Record<string, number>;
  battlegroup?: string;
  powerRating?: number;
  difficultyRatingPerFight?: number;
  entries?: { node?: number; deaths?: number; war?: number; carryOver?: boolean }[];
  isCustom?: boolean; // Flag to identify custom players
}

interface CustomPlayer {
  name: string;
  battlegroup: "BG1" | "BG2" | "BG3";
  addedDate: string;
  hidden?: boolean;
}

interface HiddenPlayer {
  name: string;
  battlegroup?: string;
  hiddenDate: string;
  isCustom: boolean;
}

interface DeletedCSVPlayer {
  name: string;
  deletedDate: string;
}

// Column letters for 30 players
const playerNameCells = [
  "KH2","FR2","HZ2","GV2","EN2","JD2","DJ2","BB2","CF2","LL2",
  "TN2","SJ2","VV2","UR2","ZH2","WZ2","AAL2","RF2","YD2","ABP2",
  "APL2","AOH2","AKV2","AIN2","ALZ2","ART2","AQP2","AJR2","ASX2","AND2"
];

// Helper function to read custom players
function readCustomPlayers(): CustomPlayer[] {
  try {
    const customPlayersFile = path.join(process.cwd(), "data", "customPlayers.json");
    if (!fs.existsSync(customPlayersFile)) {
      return [];
    }
    const data = fs.readFileSync(customPlayersFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading custom players:", error);
    return [];
  }
}

// Helper function to read hidden players
function readHiddenPlayers(): HiddenPlayer[] {
  try {
    const hiddenPlayersFile = path.join(process.cwd(), "data", "hiddenPlayers.json");
    if (!fs.existsSync(hiddenPlayersFile)) {
      return [];
    }
    const data = fs.readFileSync(hiddenPlayersFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading hidden players:", error);
    return [];
  }
}

// Helper function to read deleted CSV players
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

// Helper function to read battlegroup deaths
function readBattlegroupDeaths(): { battlegroup: string; deaths: number; war: number; season: number; timestamp: string }[] {
  try {
    const battlegroupDeathsFile = path.join(process.cwd(), "data", "battlegroupDeaths.json");
    if (!fs.existsSync(battlegroupDeathsFile)) {
      return [];
    }
    const data = fs.readFileSync(battlegroupDeathsFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading battlegroup deaths:", error);
    return [];
  }
}

export async function GET() {
  try {
    // --- Read CSV for player names and battlegroups ---
    const csvFilePath = path.join(process.cwd(), "C.Av PR aDR.csv");
    
    if (!fs.existsSync(csvFilePath)) {
      console.error("CSV file not found:", csvFilePath);
      return new Response(
        JSON.stringify({ 
          error: "CSV file not found", 
          players: [], 
          totalAllianceKills: 0, 
          totalAllianceDeaths: 0 
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const fileContent = fs.readFileSync(csvFilePath, "utf-8");
    const records: string[][] = parse(fileContent, { skip_empty_lines: true });
    
    if (records.length < 53) {
      console.error("CSV file too short, expected at least 53 rows");
      return new Response(
        JSON.stringify({ 
          error: "CSV file format invalid", 
          players: [], 
          totalAllianceKills: 0, 
          totalAllianceDeaths: 0 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const nodeRows = records.slice(3, 53); // rows 4–53

    const battlegroups = ["BG1", "BG2", "BG3"];
    const playersPerGroup = 10;

    const players: Player[] = [];
    const allPlayers: Player[] = []; // For calculating totals including hidden players

    // --- Add custom players first (including hidden ones for totals) ---
    const customPlayers = readCustomPlayers();
    customPlayers.forEach((customPlayer) => {
      const playerData = {
        name: customPlayer.name,
        kills: 0,
        deaths: 0,
        killsPerNode: {},
        deathsPerNode: {},
        battlegroup: customPlayer.battlegroup,
        isCustom: true,
      };
      
      // Add to all players for totals calculation
      allPlayers.push(playerData);
      
      // Only add to visible players if not hidden
      if (!customPlayer.hidden) {
        players.push(playerData);
      }
    });

    // --- Parse CSV data for player names and battlegroups (but not kills/deaths) ---
    const hiddenPlayers = readHiddenPlayers();
    const deletedCSVPlayers = readDeletedCSVPlayers();
    const hiddenCSVPlayerNames = hiddenPlayers
      .filter(p => !p.isCustom)
      .map(p => p.name.toLowerCase());
    const deletedCSVPlayerNames = deletedCSVPlayers.map(p => p.name.toLowerCase());
    
    for (let i = 0; i < playerNameCells.length; i++) {
      try {
        const col = columnLetterToIndex(playerNameCells[i].replace(/\d+/, ""));
        const name = records[1]?.[col];
        if (!name) continue;

        // Initialize with empty data - we'll populate from live data later
        const killsPerNode: Record<string, number> = {};
        const deathsPerNode: Record<string, number> = {};
        let totalKills = 0;
        let totalDeaths = 0;

        const battlegroupIndex = Math.floor(i / playersPerGroup);
        const battlegroup = battlegroups[battlegroupIndex] || "Unknown";

        const playerData = {
          name,
          kills: totalKills,
          deaths: totalDeaths,
          killsPerNode,
          deathsPerNode,
          battlegroup,
        };

        // Skip players that were explicitly deleted from CSV
        if (deletedCSVPlayerNames.includes(name.toLowerCase())) {
          continue;
        }

        // Add to all players for totals calculation
        allPlayers.push(playerData);
        
        // Only add to visible players if not hidden
        if (!hiddenCSVPlayerNames.includes(name.toLowerCase())) {
          players.push(playerData);
        }
      } catch (err) {
        console.error(`Error parsing player ${i}:`, err);
        continue;
      }
    }

    // --- Merge saved node/death entries ---
    const savedFile = path.join(process.cwd(), "data", "playerNodes.json");
    if (fs.existsSync(savedFile)) {
      const savedRows: { player: string; entries: { node?: number; deaths?: number; war?: number; carryOver?: boolean }[] }[] =
        JSON.parse(fs.readFileSync(savedFile, "utf-8"));

      savedRows.forEach((row) => {
        // Update both visible and all players arrays
        const visiblePlayer = players.find((p) => p.name === row.player);
        const allPlayer = allPlayers.find((p) => p.name === row.player);
        
        if (!allPlayer || !row.entries) return;

        row.entries.forEach((e) => {
          if (!e.node) return;
          
          // Skip carry-over data for home page display
          if (e.carryOver) return;

          // Add 1 kill for each node
          allPlayer.killsPerNode[e.node.toString()] =
            (allPlayer.killsPerNode[e.node.toString()] || 0) + 1;

          // Add deaths if present (including 0)
          allPlayer.deathsPerNode[e.node.toString()] =
            (allPlayer.deathsPerNode[e.node.toString()] || 0) + (e.deaths || 0);
        });

        // Recalculate player totals for all players
        allPlayer.kills = Object.values(allPlayer.killsPerNode).reduce((a, b) => a + b, 0);
        allPlayer.deaths = Object.values(allPlayer.deathsPerNode).reduce((a, b) => a + b, 0);

        // If player is visible, update their data too
        if (visiblePlayer) {
          visiblePlayer.killsPerNode = { ...allPlayer.killsPerNode };
          visiblePlayer.deathsPerNode = { ...allPlayer.deathsPerNode };
          visiblePlayer.kills = allPlayer.kills;
          visiblePlayer.deaths = allPlayer.deaths;
        }
      });
    }

    // --- Read battlegroup deaths and add to totals ---
    const battlegroupDeaths = readBattlegroupDeaths();
    const totalBattlegroupDeaths = battlegroupDeaths.reduce((sum, bg) => sum + bg.deaths, 0);

    // --- Recalculate alliance totals after merging (including hidden players and battlegroup deaths) ---
    const totalAllianceKills = allPlayers.reduce((sum, p) => sum + p.kills, 0);
    const totalAllianceDeaths = allPlayers.reduce((sum, p) => sum + p.deaths, 0) + totalBattlegroupDeaths;

    // --- Calculate powerRating using dynamic difficulty ratings ---
    // Get node values from JSON difficulty ratings
    let nodeValues: { nodeNumber: string; nodeValue: number; killBonus: number; deathPenalty: number }[] = [];
    try {
      const difficultyFilePath = path.join(process.cwd(), "data", "difficultyRatings.json");
      if (fs.existsSync(difficultyFilePath)) {
        const fileContent = fs.readFileSync(difficultyFilePath, "utf-8");
        const difficultyData = JSON.parse(fileContent);
        
        // Convert JSON difficulty data to the format expected by the calculation
        nodeValues = Object.keys(difficultyData.nodes).map(nodeNumber => ({
          nodeNumber: nodeNumber,
          nodeValue: difficultyData.nodes[nodeNumber].currentValue,
          killBonus: difficultyData.nodes[nodeNumber].killBonus,
          deathPenalty: difficultyData.nodes[nodeNumber].deathPenalty,
        }));
      } else {
        // Fallback to CSV if JSON doesn't exist yet
        const csvFilePath = path.join(process.cwd(), "C.Av PR aDR.csv");
        if (fs.existsSync(csvFilePath)) {
          const fileContent = fs.readFileSync(csvFilePath, "utf-8");
          const records: string[][] = parse(fileContent, { skip_empty_lines: true });
          const nodeRows = records.slice(3, 53); // rows 4–53
          
          nodeValues = nodeRows.map((row, idx) => ({
            nodeNumber: (50 - idx).toString(),
            nodeValue: parseFloat(row[24] || "0"), // Column Y
            killBonus: parseFloat(row[25] || "0"), // Column Z  
            deathPenalty: parseFloat(row[26] || "0"), // Column AA
          }));
        }
      }
    } catch (err) {
      console.error("Error reading node values:", err);
    }

    const playersWithPR = players.map((player) => {
      let totalKillRating = 0;
      let totalDifficultyRating = 0;

      // Calculate power rating and difficulty rating based on dynamic node values
      nodeValues.forEach((node) => {
        const nodeVal = node.nodeValue;
        const deathPenalty = node.deathPenalty;
        const kills = player.killsPerNode[node.nodeNumber] || 0;
        const deaths = player.deathsPerNode[node.nodeNumber] || 0;
        totalKillRating += nodeVal * kills - deathPenalty * deaths;
        
        // Add difficulty rating for each fight (kill) on this node
        totalDifficultyRating += nodeVal * kills;
      });

      const playerSoloRate = player.kills / ((player.kills + player.deaths) || 1);
      const allianceSoloRate =
        totalAllianceKills / ((totalAllianceKills + totalAllianceDeaths) || 1);
      const soloRateBonus =
        totalKillRating * (playerSoloRate - allianceSoloRate) * 1.6;

      // Calculate difficulty rating per fight
      const difficultyRatingPerFight = player.kills > 0 ? totalDifficultyRating / player.kills : 0;

      return {
        ...player,
        powerRating: parseFloat((totalKillRating + soloRateBonus).toFixed(2)),
        difficultyRatingPerFight: parseFloat(difficultyRatingPerFight.toFixed(2)),
      };
    });

    // --- Return players + alliance totals ---
    return new Response(
      JSON.stringify({
        players: playersWithPR,
        totalAllianceKills,
        totalAllianceDeaths,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("API Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message, players: [], totalAllianceKills: 0, totalAllianceDeaths: 0 }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helper: Convert Excel column letters to index
function columnLetterToIndex(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col *= 26;
    col += letter.charCodeAt(i) - 64;
  }
  return col - 1;
}
