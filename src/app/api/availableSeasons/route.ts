import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const archivesDir = path.join(process.cwd(), "data", "archives");
    const seasons = [];

    // Add Season 60 (CSV Data) as a special option
    seasons.push({
      seasonNumber: 60,
      seasonName: "Season 60 (CSV Data)",
      description: "Original CSV data and all accumulated data",
      isCSVData: true
    });

    // Read archived seasons
    if (fs.existsSync(archivesDir)) {
      const files = fs.readdirSync(archivesDir);
      
      for (const file of files) {
        if (file.startsWith("season-") && file.endsWith(".json")) {
          try {
            const filePath = path.join(archivesDir, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, "utf-8");
            const seasonData = JSON.parse(content);
            
            seasons.push({
              seasonNumber: seasonData.seasonNumber,
              seasonName: seasonData.seasonName || `Season ${seasonData.seasonNumber}`,
              description: seasonData.description || `Archived season data`,
              archivedAt: seasonData.archivedAt,
              fileSize: stats.size,
              fileName: file,
              isCSVData: false
            });
          } catch (error) {
            console.error(`Error reading season file ${file}:`, error);
          }
        }
      }
    }

    // Remove duplicates based on season number (keep the first occurrence)
    const uniqueSeasons = seasons.filter((season, index, self) => 
      index === self.findIndex(s => s.seasonNumber === season.seasonNumber)
    );

    // Sort seasons by season number
    uniqueSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

    return new Response(
      JSON.stringify({ seasons: uniqueSeasons }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting available seasons:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get available seasons" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
