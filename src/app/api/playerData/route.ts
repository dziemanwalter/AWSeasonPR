import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const playerNameCells = [
  "KH2", "FR2", "HZ2", "GV2", "EN2", "JD2", "DJ2", "BB2", "CF2",
  "LL2", "TN2", "SJ2","VV2", "UR2", "ZH2", "WZ2", "AAL2", "RF2",
  "YD2", "ABP2", "APL2", "AOH2", "AKV2", "AIN2", "ALZ2", "ART2",
  "AQP2", "AJR2", "ASX2", "AND2"
];

export async function GET() {
  try {
    const csvFilePath = path.join(process.cwd(), "C.Av PR aDR.csv");
    const fileContent = fs.readFileSync(csvFilePath, "utf-8");

    const records = parse(fileContent, { skip_empty_lines: true });

    // Rows 4–53 (0-indexed: 3–52) correspond to nodes 50–1
    const nodeRows = records.slice(3, 53);

    const players: any[] = [];

    let totalAllianceKills = 0;
    let totalAllianceDeaths = 0;

    // Loop over player columns
    for (const cell of playerNameCells) {
      const col = columnLetterToIndex(cell.replace(/\d+/, ""));
      const name = records[1][col]; // Row 2 (index 1) has player names
      if (!name) continue;

      const killsPerNode: Record<string, number> = {};
      const deathsPerNode: Record<string, number> = {};
      let totalKills = 0;
      let totalDeaths = 0;

      // Loop nodes
      nodeRows.forEach((row, idx) => {
        const nodeNumber = (50 - idx).toString(); // nodes 50 → 1
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
        deathsPerNode
      });
    }

    return new Response(
      JSON.stringify({ players, totalAllianceKills, totalAllianceDeaths }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helper to convert column letter (e.g., "BB") to 0-index
function columnLetterToIndex(letter: string) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col *= 26;
    col += letter.charCodeAt(i) - 64; // 'A' = 1
  }
  return col - 1;
}
