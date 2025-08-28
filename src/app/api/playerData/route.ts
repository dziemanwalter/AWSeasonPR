import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

interface Player {
  name: string;
  kills: number;
  deaths: number;
  killsPerNode: Record<string, number>;
  deathsPerNode: Record<string, number>;
}

const playerNameCells = [
  "KH2", "FR2", "HZ2", "GV2", "EN2", "JD2", "DJ2", "BB2", "CF2",
  "LL2", "TN2", "SJ2","VV2", "UR2", "ZH2", "WZ2", "AAL2", "RF2",
  "YD2", "ABP2", "APL2", "AOH2", "AKV2", "AIN2", "ALZ2", "ART2",
  "AQP2", "AJR2", "ASX2", "AND2"
];

export async function GET(): Promise<Response> {
  try {
    const csvFilePath = path.join(process.cwd(), "C.Av PR aDR.csv");
    const fileContent = fs.readFileSync(csvFilePath, "utf-8");
    const records: string[][] = parse(fileContent, { skip_empty_lines: true });

    const nodeRows = records.slice(3, 53); // Rows 4–53
    const players: Player[] = [];

    let totalAllianceKills = 0;
    let totalAllianceDeaths = 0;

    for (const cell of playerNameCells) {
      const col = columnLetterToIndex(cell.replace(/\d+/, ""));
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

      totalAllianceKills += totalKills;
      totalAllianceDeaths += totalDeaths;

      players.push({
        name,
        kills: totalKills,
        deaths: totalDeaths,
        killsPerNode,
        deathsPerNode,
      });
    }

    return new Response(
      JSON.stringify({ players, totalAllianceKills, totalAllianceDeaths }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
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
