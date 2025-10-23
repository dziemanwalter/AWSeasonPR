import fs from "fs";
import path from "path";

interface DeletedCSVPlayer {
  name: string;
  deletedDate: string;
}

const DELETED_CSV_FILE = path.join(process.cwd(), "data", "deletedCSVPlayers.json");
const PLAYER_NODES_FILE = path.join(process.cwd(), "data", "playerNodes.json");

function readDeletedCSVPlayers(): DeletedCSVPlayer[] {
  try {
    if (!fs.existsSync(DELETED_CSV_FILE)) return [];
    return JSON.parse(fs.readFileSync(DELETED_CSV_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading deleted CSV players:", err);
    return [];
  }
}

function writeDeletedCSVPlayers(players: DeletedCSVPlayer[]): void {
  if (!fs.existsSync(path.dirname(DELETED_CSV_FILE))) {
    fs.mkdirSync(path.dirname(DELETED_CSV_FILE), { recursive: true });
  }
  fs.writeFileSync(DELETED_CSV_FILE, JSON.stringify(players, null, 2));
}

export async function GET() {
  try {
    const players = readDeletedCSVPlayers();
    return new Response(JSON.stringify(players), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: Request) {
  try {
    const { name }: { name: string } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Player name is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const players = readDeletedCSVPlayers();
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Player already deleted" }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    const record: DeletedCSVPlayer = { name: name.trim(), deletedDate: new Date().toISOString() };
    const updated = [...players, record];
    writeDeletedCSVPlayers(updated);

    // Also purge any playerNodes entries for this name
    try {
      if (fs.existsSync(PLAYER_NODES_FILE)) {
        const rows: { player: string; entries: any[] }[] = JSON.parse(fs.readFileSync(PLAYER_NODES_FILE, "utf-8"));
        const filtered = rows.filter(r => r.player.toLowerCase() !== name.toLowerCase());
        if (filtered.length !== rows.length) {
          fs.writeFileSync(PLAYER_NODES_FILE, JSON.stringify(filtered, null, 2));
        }
      }
    } catch (err) {
      console.error("Error purging player nodes for deleted CSV player:", err);
    }

    return new Response(JSON.stringify({ success: true, player: record }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function DELETE(req: Request) {
  try {
    const { name }: { name: string } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Player name is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const players = readDeletedCSVPlayers();
    const filtered = players.filter(p => p.name.toLowerCase() !== name.toLowerCase());
    if (filtered.length === players.length) {
      return new Response(JSON.stringify({ error: "Player not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    writeDeletedCSVPlayers(filtered);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}



