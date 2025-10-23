import fs from "fs";
import path from "path";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { seasonNumber } = body;

    // Prevent deletion of Season 60 (CSV Data)
    if (seasonNumber === 60) {
      return new Response(
        JSON.stringify({ 
          error: "Cannot delete Season 60 (CSV Data) - it's a special season" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const archivesDir = path.join(process.cwd(), "data", "archives");
    
    if (!fs.existsSync(archivesDir)) {
      return new Response(
        JSON.stringify({ error: "No archives directory found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find and delete the season file
    const files = fs.readdirSync(archivesDir);
    let deletedFile = null;
    
    for (const file of files) {
      if (file.startsWith("season-") && file.endsWith(".json")) {
        try {
          const filePath = path.join(archivesDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const seasonData = JSON.parse(content);
          
          if (seasonData.seasonNumber === seasonNumber) {
            fs.unlinkSync(filePath);
            deletedFile = file;
            break;
          }
        } catch (error) {
          console.error(`Error reading season file ${file}:`, error);
        }
      }
    }

    if (!deletedFile) {
      return new Response(
        JSON.stringify({ error: `Season ${seasonNumber} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Season ${seasonNumber} deleted successfully`,
        deletedFile
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting season:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete season" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
