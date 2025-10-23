import fs from "fs";
import path from "path";

interface CustomPlayer {
  name: string;
  battlegroup: "BG1" | "BG2" | "BG3";
  addedDate: string;
  hidden?: boolean; // New field to track if player is hidden
}

const CUSTOM_PLAYERS_FILE = path.join(process.cwd(), "data", "customPlayers.json");

// Helper function to read custom players
function readCustomPlayers(): CustomPlayer[] {
  try {
    if (!fs.existsSync(CUSTOM_PLAYERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(CUSTOM_PLAYERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading custom players:", error);
    return [];
  }
}

// Helper function to write custom players
function writeCustomPlayers(players: CustomPlayer[]): void {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(path.dirname(CUSTOM_PLAYERS_FILE))) {
      fs.mkdirSync(path.dirname(CUSTOM_PLAYERS_FILE), { recursive: true });
    }
    fs.writeFileSync(CUSTOM_PLAYERS_FILE, JSON.stringify(players, null, 2));
  } catch (error) {
    console.error("Error writing custom players:", error);
    throw error;
  }
}

export async function GET() {
  try {
    const customPlayers = readCustomPlayers();
    return new Response(JSON.stringify(customPlayers), {
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
    const { name, battlegroup }: { name: string; battlegroup: "BG1" | "BG2" | "BG3" } = await req.json();

    if (!name || !battlegroup) {
      return new Response(JSON.stringify({ error: "Name and battlegroup are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const customPlayers = readCustomPlayers();
    
    // Check if player already exists
    if (customPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Player already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newPlayer: CustomPlayer = {
      name: name.trim(),
      battlegroup,
      addedDate: new Date().toISOString(),
    };

    customPlayers.push(newPlayer);
    writeCustomPlayers(customPlayers);

    return new Response(JSON.stringify({ success: true, player: newPlayer }), {
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

export async function PATCH(req: Request) {
  try {
    const { name, hidden }: { name: string; hidden: boolean } = await req.json();

    if (!name || typeof hidden !== 'boolean') {
      return new Response(JSON.stringify({ error: "Player name and hidden status are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const customPlayers = readCustomPlayers();
    const playerIndex = customPlayers.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (playerIndex === -1) {
      return new Response(JSON.stringify({ error: "Player not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update the hidden status
    customPlayers[playerIndex].hidden = hidden;
    writeCustomPlayers(customPlayers);

    return new Response(JSON.stringify({ success: true, player: customPlayers[playerIndex] }), {
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

export async function DELETE(req: Request) {
  try {
    const { name }: { name: string } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "Player name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const customPlayers = readCustomPlayers();
    const initialLength = customPlayers.length;
    
    // Remove player by name (case insensitive)
    const filteredPlayers = customPlayers.filter(p => p.name.toLowerCase() !== name.toLowerCase());
    
    if (filteredPlayers.length === initialLength) {
      return new Response(JSON.stringify({ error: "Player not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    writeCustomPlayers(filteredPlayers);

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
