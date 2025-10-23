import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export async function POST(): Promise<Response> {
  try {
    // Read the CSV file to get initial node values
    const csvFilePath = path.join(process.cwd(), "C.Av PR aDR.csv");
    
    if (!fs.existsSync(csvFilePath)) {
      return new Response(JSON.stringify({ error: "CSV file not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileContent = fs.readFileSync(csvFilePath, "utf-8");
    const records: string[][] = parse(fileContent, { skip_empty_lines: true });
    const nodeRows = records.slice(3, 53); // rows 4–53

    // Create difficulty ratings structure
    const difficultyRatings = {
      nodes: {} as Record<string, any>,
      settings: {
        adjustmentFactor: 0.1,
        minValue: 0.1,
        maxValue: 5.0,
        updateThreshold: 10
      }
    };

    // Initialize all nodes with values from CSV
    nodeRows.forEach((row, idx) => {
      const nodeNumber = (50 - idx).toString();
      const nodeValue = parseFloat(row[24] || "1.0"); // Column Y
      const killBonus = parseFloat(row[25] || "0.1"); // Column Z  
      const deathPenalty = parseFloat(row[26] || "0.1"); // Column AA

      difficultyRatings.nodes[nodeNumber] = {
        baseValue: nodeValue,
        currentValue: nodeValue,
        killBonus: killBonus,
        deathPenalty: deathPenalty,
        totalKills: 0,
        totalDeaths: 0,
        lastUpdated: null
      };
    });

    // Save to JSON file
    const difficultyFilePath = path.join(process.cwd(), "data", "difficultyRatings.json");
    
    // Ensure directory exists
    if (!fs.existsSync(path.dirname(difficultyFilePath))) {
      fs.mkdirSync(path.dirname(difficultyFilePath), { recursive: true });
    }
    
    fs.writeFileSync(difficultyFilePath, JSON.stringify(difficultyRatings, null, 2));

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Difficulty ratings initialized from CSV successfully",
      nodesCount: Object.keys(difficultyRatings.nodes).length
    }), {
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
