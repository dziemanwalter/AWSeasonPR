import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface NodeData {
  nodeNumber: string;
  nodeValue: string;
  killBonus: string;
  deathPenalty: string;
}

export async function GET(): Promise<Response> {
  try {
    const csvFilePath = path.join(process.cwd(), 'C.Av PR aDR.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    const records: string[][] = parse(fileContent, { skip_empty_lines: true });

    // Get rows 4–53 (0-based: 3–52)
    const selectedRows = records.slice(3, 53);

    const result: NodeData[] = selectedRows.map((row) => ({
      nodeNumber: row[1], // Column B
      nodeValue: row[24], // Column Y
      killBonus: row[25], // Column Z
      deathPenalty: row[26], // Column AA
    }));

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
