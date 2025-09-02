import fs from "fs";
import path from "path";

interface NodeEntry {
  node?: number;
  deaths?: number;
}

interface PlayerRowData {
  player: string;
  entries: NodeEntry[];
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "playerNodes.json");
    
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const rows = JSON.parse(data);

    return new Response(JSON.stringify(rows), {
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
    const rows: PlayerRowData[] = await req.json();

    const filePath = path.join(process.cwd(), "data", "playerNodes.json");

    // Save to JSON (create folder/data file if it doesn't exist)
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath));
    }
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));

    return new Response(JSON.stringify({ success: true }), {
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
