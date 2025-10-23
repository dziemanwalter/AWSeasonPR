import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { newSeasonNumber } = body;

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create archives directory if it doesn't exist
    const archivesDir = path.join(process.cwd(), "data", "archives");
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
    }

    // Read current data
    const playerNodesPath = path.join(process.cwd(), "data", "playerNodes.json");
    const battlegroupDeathsPath = path.join(process.cwd(), "data", "battlegroupDeaths.json");
    const customPlayersPath = path.join(process.cwd(), "data", "customPlayers.json");
    const hiddenPlayersPath = path.join(process.cwd(), "data", "hiddenPlayers.json");

    const playerNodes = fs.existsSync(playerNodesPath) ? 
      JSON.parse(fs.readFileSync(playerNodesPath, "utf-8")) : [];
    const battlegroupDeaths = fs.existsSync(battlegroupDeathsPath) ? 
      JSON.parse(fs.readFileSync(battlegroupDeathsPath, "utf-8")) : [];
    const customPlayers = fs.existsSync(customPlayersPath) ? 
      JSON.parse(fs.readFileSync(customPlayersPath, "utf-8")) : [];
    const hiddenPlayers = fs.existsSync(hiddenPlayersPath) ? 
      JSON.parse(fs.readFileSync(hiddenPlayersPath, "utf-8")) : [];

    // Calculate totals for Season 60
    const totalKills = playerNodes.reduce((sum: number, player: any) => {
      return sum + (player.entries?.reduce((playerSum: number, entry: any) => {
        return playerSum + (entry.node ? 1 : 0);
      }, 0) || 0);
    }, 0);

    const totalDeaths = playerNodes.reduce((sum: number, player: any) => {
      return sum + (player.entries?.reduce((playerSum: number, entry: any) => {
        return playerSum + (entry.deaths || 0);
      }, 0) || 0);
    }, 0) + battlegroupDeaths.reduce((sum: number, bg: any) => sum + (bg.deaths || 0), 0);

    // Create Season 60 archive
    const season60Data = {
      seasonNumber: 60,
      seasonName: "Season 60 (CSV Data)",
      playerNodes,
      battlegroupDeaths,
      customPlayers,
      hiddenPlayers,
      totalKills,
      totalDeaths,
      archivedAt: new Date().toISOString(),
      description: "Original CSV data and all accumulated live data"
    };

    // Save Season 60 archive
    const season60FileName = `season-60-${new Date().toISOString().split('T')[0]}.json`;
    const season60Path = path.join(archivesDir, season60FileName);
    fs.writeFileSync(season60Path, JSON.stringify(season60Data, null, 2));

    // Calculate current streaks from the ending season to carry over
    const carryOverStreaks: any[] = [];
    playerNodes.forEach((player: any) => {
      if (player.entries && player.entries.length > 0) {
        let currentStreak = 0;
        let totalKills = 0;
        let totalDeaths = 0;
        
        // Process entries chronologically to calculate final streaks
        const sortedEntries = [...player.entries].sort((a, b) => {
          const warA = a.war;
          const warB = b.war;
          
          if (warA === undefined && warB === undefined) return 0;
          if (warA === undefined) return -1;
          if (warB === undefined) return 1;
          
          return warA - warB;
        });
        
        sortedEntries.forEach((entry: any) => {
          const kills = entry.node ? 1 : 0;
          const deaths = entry.deaths || 0;
          
          if (kills > 0) {
            currentStreak += kills;
            totalKills += kills;
          }
          
          if (deaths > 0) {
            currentStreak = 0; // Deaths reset streak
            totalDeaths += deaths;
          }
        });
        
        // Only carry over if player has a current streak > 0
        if (currentStreak > 0) {
          // Create multiple entries to represent the carry-over streak
          const carryOverEntries = [];
          for (let i = 0; i < currentStreak; i++) {
            carryOverEntries.push({
              node: 1, // Each entry represents 1 kill
              war: undefined, // Unassigned to war
              deaths: 0,
              carryOver: true // Mark as carry-over data
            });
          }
          
          carryOverStreaks.push({
            player: player.player,
            entries: carryOverEntries
          });
        }
      }
    });

    // Reset current data for new season, but preserve carry-over streaks
    fs.writeFileSync(playerNodesPath, JSON.stringify(carryOverStreaks, null, 2));
    fs.writeFileSync(battlegroupDeathsPath, JSON.stringify([], null, 2));
    
    // IMPORTANT: Keep custom players, hidden players, and kill streaks unchanged
    // These continue across all seasons
    // Note: Streaks.csv is preserved automatically as it's not in the data/ directory

    // Update current season
    const currentSeasonPath = path.join(process.cwd(), "data", "currentSeason.json");
    const newSeasonData = { 
      seasonNumber: newSeasonNumber, 
      seasonName: `Season ${newSeasonNumber}` 
    };
    fs.writeFileSync(currentSeasonPath, JSON.stringify(newSeasonData, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Season 60 archived and Season ${newSeasonNumber} started`,
        season60File: season60FileName,
        newSeason: newSeasonData,
        archivedStats: {
          totalKills,
          totalDeaths,
          playerCount: playerNodes.length
        },
        carryOverStats: {
          playersWithStreaks: carryOverStreaks.length,
          carriedOverStreaks: carryOverStreaks.map(player => ({
            name: player.player,
            streak: player.entries[0].node
          }))
        }
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error starting new season:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start new season" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
