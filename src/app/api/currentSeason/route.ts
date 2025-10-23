import fs from "fs";
import path from "path";

export async function GET(): Promise<Response> {
  try {
    const currentSeasonPath = path.join(process.cwd(), "data", "currentSeason.json");
    
    if (!fs.existsSync(currentSeasonPath)) {
      // Return default if file doesn't exist
      return new Response(JSON.stringify({
        seasonNumber: 60,
        seasonName: "Season 60"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const data = fs.readFileSync(currentSeasonPath, "utf-8");
    const currentSeason = JSON.parse(data);
    
    return new Response(JSON.stringify(currentSeason), {
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
