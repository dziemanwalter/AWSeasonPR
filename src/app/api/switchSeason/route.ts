import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seasonNumber } = body;

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Update current season
    const currentSeasonPath = path.join(process.cwd(), "data", "currentSeason.json");
    let seasonName = `Season ${seasonNumber}`;
    
    // Special case for Season 60
    if (seasonNumber === 60) {
      seasonName = "Season 60 (CSV Data)";
    }
    
    const seasonData = { seasonNumber, seasonName };
    fs.writeFileSync(currentSeasonPath, JSON.stringify(seasonData, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        season: seasonData,
        message: `Switched to ${seasonName}`
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error switching season:", error);
    return new Response(
      JSON.stringify({ error: "Failed to switch season" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
