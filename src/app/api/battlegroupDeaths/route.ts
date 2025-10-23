import fs from "fs";
import path from "path";

interface BattlegroupDeathEntry {
  battlegroup: string;
  deaths: number;
  war: number;
  season: number;
  timestamp: string;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "battlegroupDeaths.json");
    
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const entries = JSON.parse(data);

    return new Response(JSON.stringify(entries), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const newEntry: BattlegroupDeathEntry = await req.json();

    const filePath = path.join(process.cwd(), "data", "battlegroupDeaths.json");

    // Read existing entries
    let entries: BattlegroupDeathEntry[] = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      entries = JSON.parse(data);
    }

    // Add new entry
    entries.push(newEntry);

    // Save to JSON (create folder/data file if it doesn't exist)
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath));
    }
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));

    return new Response(JSON.stringify({ success: true, entry: newEntry }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

