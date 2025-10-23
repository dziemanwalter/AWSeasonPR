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
  entries?: { node?: number; deaths?: number }[];
  isCustom?: boolean;
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

interface BattlegroupTotals {
  battlegroup: string;
  totalKills: number;
  totalDeaths: number;
  totalPR: number;
  avgSoloRate: number;
  playerCount: number;
  visiblePlayerCount: number;
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

// Helper: Convert Excel column letters to index
function columnLetterToIndex(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col *= 26;
    col += letter.charCodeAt(i) - 64;
  }
  return col - 1;
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
          battlegroupTotals: [], 
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
          battlegroupTotals: [], 
          totalAllianceKills: 0, 
          totalAllianceDeaths: 0 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const nodeRows = records.slice(3, 53); // rows 4–53

    const battlegroups = ["BG1", "BG2", "BG3"];
    const playersPerGroup = 10;

    const allPlayers: Player[] = []; // All players including hidden ones

    // --- Add custom players (including hidden ones for totals) ---
    const customPlayers = readCustomPlayers();
    customPlayers.forEach((customPlayer) => {
      allPlayers.push({
        name: customPlayer.name,
        kills: 0,
        deaths: 0,
        killsPerNode: {},
        deathsPerNode: {},
        battlegroup: customPlayer.battlegroup,
        isCustom: true,
      });
    });

    // --- Parse CSV data for player names and battlegroups (but not kills/deaths) ---
    const deletedCSVPlayerNames = readDeletedCSVPlayers().map(p => p.name.toLowerCase());
    for (let i = 0; i < playerNameCells.length; i++) {
      try {
        const col = columnLetterToIndex(playerNameCells[i].replace(/\d+/, ""));
        const name = records[1]?.[col];
        if (!name) continue;
        if (deletedCSVPlayerNames.includes(name.toLowerCase())) continue;

        // Initialize with empty data - we'll populate from live data later
        const killsPerNode: Record<string, number> = {};
        const deathsPerNode: Record<string, number> = {};
        let totalKills = 0;
        let totalDeaths = 0;

        const battlegroupIndex = Math.floor(i / playersPerGroup);
        const battlegroup = battlegroups[battlegroupIndex] || "Unknown";

        allPlayers.push({
          name,
          kills: totalKills,
          deaths: totalDeaths,
          killsPerNode,
          deathsPerNode,
          battlegroup,
        });
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

      // Filter out deleted CSV players from playerNodes.json data
      const deletedCSVPlayerNames = readDeletedCSVPlayers().map(p => p.name.toLowerCase());
      const filteredRows = savedRows.filter(row => !deletedCSVPlayerNames.includes(row.player.toLowerCase()));

      filteredRows.forEach((row) => {
        const player = allPlayers.find((p) => p.name === row.player);
        if (!player || !row.entries) return;

        row.entries.forEach((e) => {
          if (!e.node) return;
          
          // Skip carry-over data (same as playerData API)
          if (e.carryOver) return;

          // Add 1 kill for each node
          player.killsPerNode[e.node.toString()] =
            (player.killsPerNode[e.node.toString()] || 0) + 1;

          // Add deaths if present (including 0)
          player.deathsPerNode[e.node.toString()] =
            (player.deathsPerNode[e.node.toString()] || 0) + (e.deaths || 0);
        });

        // Recalculate player totals
        player.kills = Object.values(player.killsPerNode).reduce((a, b) => a + b, 0);
        player.deaths = Object.values(player.deathsPerNode).reduce((a, b) => a + b, 0);
      });
    }

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

    const playersWithPR = allPlayers.map((player) => {
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

      const totalAllianceKills = allPlayers.reduce((sum, p) => sum + p.kills, 0);
      const totalAllianceDeaths = allPlayers.reduce((sum, p) => sum + p.deaths, 0);
      
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

    // --- Read battlegroup deaths ---
    const battlegroupDeaths = readBattlegroupDeaths();

    // --- Calculate battlegroup totals (including hidden players and battlegroup deaths) ---
    const battlegroupTotals: BattlegroupTotals[] = battlegroups.map((bg) => {
      const bgPlayers = playersWithPR.filter(p => p.battlegroup === bg);
      const totalKills = bgPlayers.reduce((sum, p) => sum + p.kills, 0);
      
      // Add battlegroup deaths to player deaths
      const bgDeaths = battlegroupDeaths
        .filter(bgDeath => bgDeath.battlegroup === bg)
        .reduce((sum, bgDeath) => sum + bgDeath.deaths, 0);
      const totalDeaths = bgPlayers.reduce((sum, p) => sum + p.deaths, 0) + bgDeaths;
      
      const totalPR = bgPlayers.reduce((sum, p) => sum + (p.powerRating || 0), 0);
      const avgSoloRate = bgPlayers.length > 0 
        ? bgPlayers.reduce((sum, p) => sum + p.kills / (p.kills + p.deaths || 1), 0) / bgPlayers.length
        : 0;

      // Count visible players (excluding hidden ones)
      const hiddenPlayers = readHiddenPlayers();
      const hiddenPlayerNames = hiddenPlayers.map(p => p.name.toLowerCase());
      const visiblePlayerCount = bgPlayers.filter(p => !hiddenPlayerNames.includes(p.name.toLowerCase())).length;


      return {
        battlegroup: bg,
        totalKills,
        totalDeaths,
        totalPR,
        avgSoloRate,
        playerCount: bgPlayers.length,
        visiblePlayerCount,
      };
    });

    // --- Calculate alliance totals (including hidden players and battlegroup deaths) ---
    const totalAllianceKills = playersWithPR.reduce((sum, p) => sum + p.kills, 0);
    const totalBattlegroupDeaths = battlegroupDeaths.reduce((sum, bg) => sum + bg.deaths, 0);
    const totalAllianceDeaths = playersWithPR.reduce((sum, p) => sum + p.deaths, 0) + totalBattlegroupDeaths;

    // --- Return battlegroup totals + alliance totals ---
    return new Response(
      JSON.stringify({
        battlegroupTotals,
        totalAllianceKills,
        totalAllianceDeaths,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("API Error:", err.message);
    return new Response(
      JSON.stringify({ 
        error: err.message, 
        battlegroupTotals: [], 
        totalAllianceKills: 0, 
        totalAllianceDeaths: 0 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
