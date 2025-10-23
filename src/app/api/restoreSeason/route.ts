import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seasonNumber } = body;

    const archivesDir = path.join(process.cwd(), "data", "archives");
    
    if (!fs.existsSync(archivesDir)) {
      return new Response(
        JSON.stringify({ error: "No archives directory found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find the season file
    const files = fs.readdirSync(archivesDir);
    let seasonFile = null;
    let seasonData = null;
    
    for (const file of files) {
      if (file.startsWith("season-") && file.endsWith(".json")) {
        try {
          const filePath = path.join(archivesDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const data = JSON.parse(content);
          
          if (data.seasonNumber === seasonNumber) {
            seasonFile = file;
            seasonData = data;
            break;
          }
        } catch (error) {
          console.error(`Error reading season file ${file}:`, error);
        }
      }
    }

    if (!seasonData) {
      return new Response(
        JSON.stringify({ error: `Season ${seasonNumber} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create backup of current data before restore
    const backupDir = path.join(process.cwd(), "data", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFileName = `backup-before-restore-${new Date().toISOString().split('T')[0]}.json`;
    const backupPath = path.join(backupDir, backupFileName);

    // Backup current data
    const currentData = {
      playerNodes: fs.existsSync(path.join(process.cwd(), "data", "playerNodes.json")) ? 
        JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "playerNodes.json"), "utf-8")) : [],
      battlegroupDeaths: fs.existsSync(path.join(process.cwd(), "data", "battlegroupDeaths.json")) ? 
        JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "battlegroupDeaths.json"), "utf-8")) : [],
      backupDate: new Date().toISOString(),
    };

    // Save backup
    fs.writeFileSync(backupPath, JSON.stringify(currentData, null, 2));

    // Restore the archived data
    const playerNodesPath = path.join(process.cwd(), "data", "playerNodes.json");
    const battlegroupDeathsPath = path.join(process.cwd(), "data", "battlegroupDeaths.json");
    
    fs.writeFileSync(playerNodesPath, JSON.stringify(seasonData.playerNodes || [], null, 2));
    fs.writeFileSync(battlegroupDeathsPath, JSON.stringify(seasonData.battlegroupDeaths || [], null, 2));
    
    // Update current season to the restored season
    const currentSeasonPath = path.join(process.cwd(), "data", "currentSeason.json");
    const restoredSeasonData = { 
      seasonNumber: seasonData.seasonNumber, 
      seasonName: seasonData.seasonName || `Season ${seasonData.seasonNumber}` 
    };
    fs.writeFileSync(currentSeasonPath, JSON.stringify(restoredSeasonData, null, 2));
    
    // Note: We don't restore customPlayers and hiddenPlayers as they are meant to be persistent
    // The current custom/hidden players remain unchanged

    return new Response(
      JSON.stringify({
        success: true,
        message: `Season ${seasonData.seasonNumber} restored successfully`,
        season: restoredSeasonData,
        backupFile: backupFileName
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error restoring season:", error);
    return new Response(
      JSON.stringify({ error: "Failed to restore season" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
