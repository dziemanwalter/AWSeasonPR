import fs from "fs";
import path from "path";

interface HiddenPlayer {
  name: string;
  battlegroup?: string;
  hiddenDate: string;
  isCustom: boolean; // true for custom players, false for CSV players
}

const HIDDEN_PLAYERS_FILE = path.join(process.cwd(), "data", "hiddenPlayers.json");

// Helper function to read hidden players
function readHiddenPlayers(): HiddenPlayer[] {
  try {
    if (!fs.existsSync(HIDDEN_PLAYERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(HIDDEN_PLAYERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading hidden players:", error);
    return [];
  }
}

// Helper function to write hidden players
function writeHiddenPlayers(players: HiddenPlayer[]): void {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(path.dirname(HIDDEN_PLAYERS_FILE))) {
      fs.mkdirSync(path.dirname(HIDDEN_PLAYERS_FILE), { recursive: true });
    }
    fs.writeFileSync(HIDDEN_PLAYERS_FILE, JSON.stringify(players, null, 2));
  } catch (error) {
    console.error("Error writing hidden players:", error);
    throw error;
  }
}

export async function GET() {
  try {
    const hiddenPlayers = readHiddenPlayers();
    return new Response(JSON.stringify(hiddenPlayers), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const { name, battlegroup, isCustom }: { name: string; battlegroup?: string; isCustom: boolean } = await req.json();

    if (!name || typeof isCustom !== 'boolean') {
      return new Response(JSON.stringify({ error: "Player name and isCustom flag are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hiddenPlayers = readHiddenPlayers();
    
    // Check if player is already hidden
    if (hiddenPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Player is already hidden" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newHiddenPlayer: HiddenPlayer = {
      name: name.trim(),
      battlegroup,
      hiddenDate: new Date().toISOString(),
      isCustom,
    };

    hiddenPlayers.push(newHiddenPlayer);
    writeHiddenPlayers(hiddenPlayers);

    return new Response(JSON.stringify({ success: true, player: newHiddenPlayer }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const { name }: { name: string } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "Player name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hiddenPlayers = readHiddenPlayers();
    const initialLength = hiddenPlayers.length;
    
    // Remove player by name (case insensitive)
    const filteredPlayers = hiddenPlayers.filter(p => p.name.toLowerCase() !== name.toLowerCase());
    
    if (filteredPlayers.length === initialLength) {
      return new Response(JSON.stringify({ error: "Player not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    writeHiddenPlayers(filteredPlayers);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
