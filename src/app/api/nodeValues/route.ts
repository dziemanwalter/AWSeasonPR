import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export async function GET() {
  try {
    const csvFilePath = path.join(process.cwd(), "C.Av PR aDR.csv");
    const fileContent = fs.readFileSync(csvFilePath, "utf-8");

    const records = parse(fileContent, {
      skip_empty_lines: true,
    });

    // Get rows 4–54 (0-based, so slice(3, 53))
    const selectedRows = records.slice(3, 53);

   const result = selectedRows.map(row => ({
  nodeNumber: row[1],       // B
  nodeValue: row[24],       // Y
  killBonus: row[25],       // Z
  deathPenalty: row[26],    // AA
}));


    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
6