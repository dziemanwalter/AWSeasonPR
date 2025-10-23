import fs from "fs";
import path from "path";

interface SeasonData {
  season: number;
  wars: WarData[];
  startDate: string;
  endDate?: string;
}

interface WarData {
  war: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

const SEASON_DATA_FILE = path.join(process.cwd(), "data", "seasonData.json");

// Helper function to read season data
function readSeasonData(): SeasonData[] {
  try {
    if (!fs.existsSync(SEASON_DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SEASON_DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading season data:", error);
    return [];
  }
}

// Helper function to write season data
function writeSeasonData(seasons: SeasonData[]): void {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(path.dirname(SEASON_DATA_FILE))) {
      fs.mkdirSync(path.dirname(SEASON_DATA_FILE), { recursive: true });
    }
    fs.writeFileSync(SEASON_DATA_FILE, JSON.stringify(seasons, null, 2));
  } catch (error) {
    console.error("Error writing season data:", error);
    throw error;
  }
}

export async function GET() {
  try {
    const seasonData = readSeasonData();
    return new Response(JSON.stringify(seasonData), {
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
    const { season, war, action }: { season: number; war?: number; action: "create_season" | "start_war" | "end_war" } = await req.json();

    if (!season || !action) {
      return new Response(JSON.stringify({ error: "Season and action are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const seasonData = readSeasonData();
    let seasonIndex = seasonData.findIndex(s => s.season === season);

    if (action === "create_season") {
      if (seasonIndex >= 0) {
        return new Response(JSON.stringify({ error: "Season already exists" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Create new season with 12 wars
      const newSeason: SeasonData = {
        season,
        wars: Array.from({ length: 12 }, (_, i) => ({
          war: i + 1,
          startDate: "",
          isActive: false,
        })),
        startDate: new Date().toISOString(),
      };

      seasonData.push(newSeason);
      seasonData.sort((a, b) => a.season - b.season);
    } else if (action === "start_war" && war) {
      if (seasonIndex < 0) {
        return new Response(JSON.stringify({ error: "Season not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const warIndex = seasonData[seasonIndex].wars.findIndex(w => w.war === war);
      if (warIndex < 0) {
        return new Response(JSON.stringify({ error: "War not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // End any currently active war in this season
      seasonData[seasonIndex].wars.forEach(w => {
        if (w.isActive) {
          w.isActive = false;
          w.endDate = new Date().toISOString();
        }
      });

      // Start the new war
      seasonData[seasonIndex].wars[warIndex].isActive = true;
      seasonData[seasonIndex].wars[warIndex].startDate = new Date().toISOString();
    } else if (action === "end_war" && war) {
      if (seasonIndex < 0) {
        return new Response(JSON.stringify({ error: "Season not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const warIndex = seasonData[seasonIndex].wars.findIndex(w => w.war === war);
      if (warIndex < 0) {
        return new Response(JSON.stringify({ error: "War not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      seasonData[seasonIndex].wars[warIndex].isActive = false;
      seasonData[seasonIndex].wars[warIndex].endDate = new Date().toISOString();
    }

    writeSeasonData(seasonData);

    return new Response(JSON.stringify({ success: true, seasonData }), {
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

