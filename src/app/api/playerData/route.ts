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
  entries?: { node?: number; deaths?: number }[];
}

// Column letters for 30 players
const playerNameCells = [
  "KH2","FR2","HZ2","GV2","EN2","JD2","DJ2","BB2","CF2","LL2",
  "TN2","SJ2","VV2","UR2","ZH2","WZ2","AAL2","RF2","YD2","ABP2",
  "APL2","AOH2","AKV2","AIN2","ALZ2","ART2","AQP2","AJR2","ASX2","AND2"
];

export async function GET() {
  try {
    // --- Read CSV ---
    const csvFilePath = path.join(process.cwd(), "C.Av PR aDR.csv");
    const fileContent = fs.readFileSync(csvFilePath, "utf-8");
    const records: string[][] = parse(fileContent, { skip_empty_lines: true });
    const nodeRows = records.slice(3, 53); // rows 4–53

    const battlegroups = ["BG1", "BG2", "BG3"];
    const playersPerGroup = 10;

    const players: Player[] = [];

    // --- Parse CSV data ---
    for (let i = 0; i < playerNameCells.length; i++) {
      const col = columnLetterToIndex(playerNameCells[i].replace(/\d+/, ""));
      const name = records[1][col];
      if (!name) continue;

      const killsPerNode: Record<string, number> = {};
      const deathsPerNode: Record<string, number> = {};
      let totalKills = 0;
      let totalDeaths = 0;

      nodeRows.forEach((row, idx) => {
        const nodeNumber = (50 - idx).toString();
        const kills = parseFloat(row[col] || "0");
        const deaths = parseFloat(row[col + 1] || "0");
        killsPerNode[nodeNumber] = kills;
        deathsPerNode[nodeNumber] = deaths;
        totalKills += kills;
        totalDeaths += deaths;
      });

      const battlegroupIndex = Math.floor(i / playersPerGroup);
      const battlegroup = battlegroups[battlegroupIndex] || "Unknown";

      players.push({
        name,
        kills: totalKills,
        deaths: totalDeaths,
        killsPerNode,
        deathsPerNode,
        battlegroup,
      });
    }

    // --- Merge saved node/death entries ---
    const savedFile = path.join(process.cwd(), "data", "playerNodes.json");
    if (fs.existsSync(savedFile)) {
      const savedRows: { player: string; entries: { node?: number; deaths?: number }[] }[] =
        JSON.parse(fs.readFileSync(savedFile, "utf-8"));

      savedRows.forEach((row) => {
        const player = players.find((p) => p.name === row.player);
        if (!player || !row.entries) return;

        row.entries.forEach((e) => {
          if (!e.node) return;

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

    // --- Recalculate alliance totals after merging ---
    const totalAllianceKills = players.reduce((sum, p) => sum + p.kills, 0);
    const totalAllianceDeaths = players.reduce((sum, p) => sum + p.deaths, 0);

    // --- Fetch node values for power rating ---
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const nodeRes = await fetch(`${baseUrl}/api/nodeValues`);
    const nodeValues: { nodeNumber: string; nodeValue: string; deathPenalty: string }[] =
      await nodeRes.json();

    // --- Calculate powerRating ---
    const playersWithPR = players.map((player) => {
      let totalKillRating = 0;

      nodeValues.forEach((node) => {
        const nodeVal = parseFloat(node.nodeValue) || 0;
        const deathPenalty = parseFloat(node.deathPenalty) || 0;
        const kills = player.killsPerNode[node.nodeNumber] || 0;
        const deaths = player.deathsPerNode[node.nodeNumber] || 0;
        totalKillRating += nodeVal * kills - deathPenalty * deaths;
      });

      const playerSoloRate = player.kills / ((player.kills + player.deaths) || 1);
      const allianceSoloRate =
        totalAllianceKills / ((totalAllianceKills + totalAllianceDeaths) || 1);
      const soloRateBonus =
        totalKillRating * (playerSoloRate - allianceSoloRate) * 1.6;

      return {
        ...player,
        powerRating: parseFloat((totalKillRating + soloRateBonus).toFixed(2)),
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
