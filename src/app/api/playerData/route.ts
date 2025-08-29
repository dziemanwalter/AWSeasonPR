import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface Player {
  name: string;
  kills: number;
  deaths: number;
  killsPerNode: Record<string, number>;
  deathsPerNode: Record<string, number>;
  battlegroup?: string;
  powerRating?: number;
}

interface NodeData {
  nodeNumber: string;
  nodeValue: string;
  deathPenalty: string;
}

// Column letters for your 30 players
const playerNameCells = [
  'KH2',
  'FR2',
  'HZ2',
  'GV2',
  'EN2',
  'JD2',
  'DJ2',
  'BB2',
  'CF2',
  'LL2',
  'TN2',
  'SJ2',
  'VV2',
  'UR2',
  'ZH2',
  'WZ2',
  'AAL2',
  'RF2',
  'YD2',
  'ABP2',
  'APL2',
  'AOH2',
  'AKV2',
  'AIN2',
  'ALZ2',
  'ART2',
  'AQP2',
  'AJR2',
  'ASX2',
  'AND2',
];

export async function GET(): Promise<Response> {
  try {
    // --- Read player CSV ---
    const csvFilePath = path.join(process.cwd(), 'C.Av PR aDR.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records: string[][] = parse(fileContent, { skip_empty_lines: true });
    const nodeRows = records.slice(3, 53); // Rows 4–53

    const players: Player[] = [];
    let totalAllianceKills = 0;
    let totalAllianceDeaths = 0;

    const battlegroups = ['BG1', 'BG2', 'BG3'];
    const playersPerGroup = 10;

    // --- Parse player data ---
    for (let i = 0; i < playerNameCells.length; i++) {
      const cell = playerNameCells[i];
      const col = columnLetterToIndex(cell.replace(/\d+/, ''));
      const name = records[1][col];
      if (!name) continue;

      const killsPerNode: Record<string, number> = {};
      const deathsPerNode: Record<string, number> = {};
      let totalKills = 0;
      let totalDeaths = 0;

      nodeRows.forEach((row, idx) => {
        const nodeNumber = (50 - idx).toString();
        const kills = parseFloat(row[col] || '0');
        const deaths = parseFloat(row[col + 1] || '0');
        killsPerNode[nodeNumber] = kills;
        deathsPerNode[nodeNumber] = deaths;
        totalKills += kills;
        totalDeaths += deaths;
      });

      totalAllianceKills += totalKills;
      totalAllianceDeaths += totalDeaths;

      const battlegroupIndex = Math.floor(i / playersPerGroup);
      const battlegroup = battlegroups[battlegroupIndex] || 'Unknown';

      players.push({
        name,
        kills: totalKills,
        deaths: totalDeaths,
        killsPerNode,
        deathsPerNode,
        battlegroup,
      });
    }

    // --- Fetch node values from /api/nodeValues ---
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const nodeRes = await fetch(`${baseUrl}/api/nodeValues`);
    const nodeValues: NodeData[] = await nodeRes.json();

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

      const playerSoloRate = player.kills / (player.kills + player.deaths || 1);
      const allianceSoloRate =
        totalAllianceKills / (totalAllianceKills + totalAllianceDeaths || 1);
      const soloRateBonus =
        totalKillRating * (playerSoloRate - allianceSoloRate) * 1.6;

      return {
        ...player,
        powerRating: parseFloat((totalKillRating + soloRateBonus).toFixed(2)),
      };
    });

    return new Response(
      JSON.stringify({
        players: playersWithPR,
        totalAllianceKills,
        totalAllianceDeaths,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('API error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage, players: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Helper: column letters to 0-based index (e.g., "BB" → 53)
function columnLetterToIndex(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col *= 26;
    col += letter.charCodeAt(i) - 64; // 'A' = 1
  }
  return col - 1;
}
