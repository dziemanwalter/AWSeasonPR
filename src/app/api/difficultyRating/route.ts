import fs from "fs";
import path from "path";

interface NodeDifficulty {
  baseValue: number;
  currentValue: number;
  killBonus: number;
  deathPenalty: number;
  totalKills: number;
  totalDeaths: number;
  lastUpdated: string | null;
}

interface DifficultySettings {
  adjustmentFactor: number;
  minValue: number;
  maxValue: number;
  updateThreshold: number;
}

interface DifficultyRatings {
  nodes: Record<string, NodeDifficulty>;
  settings: DifficultySettings;
}

// Helper function to read difficulty ratings
function readDifficultyRatings(): DifficultyRatings {
  const filePath = path.join(process.cwd(), "data", "difficultyRatings.json");
  
  if (!fs.existsSync(filePath)) {
    // Return default structure if file doesn't exist
    return {
      nodes: {},
      settings: {
        adjustmentFactor: 0.1,
        minValue: 0.1,
        maxValue: 5.0,
        updateThreshold: 10
      }
    };
  }
  
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading difficulty ratings:", error);
    return {
      nodes: {},
      settings: {
        adjustmentFactor: 0.1,
        minValue: 0.1,
        maxValue: 5.0,
        updateThreshold: 10
      }
    };
  }
}

// Helper function to save difficulty ratings
function saveDifficultyRatings(ratings: DifficultyRatings): void {
  const filePath = path.join(process.cwd(), "data", "difficultyRatings.json");
  
  // Ensure directory exists
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(ratings, null, 2));
}

// GET: Retrieve current difficulty ratings
export async function GET(): Promise<Response> {
  try {
    const ratings = readDifficultyRatings();
    
    return new Response(JSON.stringify(ratings), {
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

// POST: Update difficulty ratings based on live data
export async function POST(request: Request): Promise<Response> {
  try {
    const { recalculate } = await request.json();
    
    if (recalculate) {
      // Recalculate difficulty ratings based on live performance data
      const updatedRatings = await recalculateDifficultyRatings();
      saveDifficultyRatings(updatedRatings);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Difficulty ratings recalculated successfully",
        ratings: updatedRatings 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Update specific node values
    const { nodeNumber, baseValue, currentValue, killBonus, deathPenalty } = await request.json();
    
    const ratings = readDifficultyRatings();
    
    if (nodeNumber && ratings.nodes[nodeNumber]) {
      ratings.nodes[nodeNumber] = {
        ...ratings.nodes[nodeNumber],
        baseValue: baseValue ?? ratings.nodes[nodeNumber].baseValue,
        currentValue: currentValue ?? ratings.nodes[nodeNumber].currentValue,
        killBonus: killBonus ?? ratings.nodes[nodeNumber].killBonus,
        deathPenalty: deathPenalty ?? ratings.nodes[nodeNumber].deathPenalty,
        lastUpdated: new Date().toISOString()
      };
      
      saveDifficultyRatings(ratings);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Node ${nodeNumber} difficulty updated` 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Function to recalculate difficulty ratings based on live performance
async function recalculateDifficultyRatings(): Promise<DifficultyRatings> {
  const ratings = readDifficultyRatings();
  
  // Read live player data
  const playerNodesPath = path.join(process.cwd(), "data", "playerNodes.json");
  if (!fs.existsSync(playerNodesPath)) {
    return ratings;
  }
  
  try {
    const playerData = JSON.parse(fs.readFileSync(playerNodesPath, "utf-8"));
    
    // Calculate total kills and deaths per node from live data
    const nodeStats: Record<string, { kills: number; deaths: number }> = {};
    
    // Initialize all nodes
    for (let i = 1; i <= 50; i++) {
      nodeStats[i.toString()] = { kills: 0, deaths: 0 };
    }
    
    // Aggregate data from all players
    playerData.forEach((player: any) => {
      if (player.entries) {
        player.entries.forEach((entry: any) => {
          if (entry.node && !entry.carryOver) {
            const nodeNum = entry.node.toString();
            if (nodeStats[nodeNum]) {
              nodeStats[nodeNum].kills += 1; // Each node entry is 1 kill
              nodeStats[nodeNum].deaths += entry.deaths || 0;
            }
          }
        });
      }
    });
    
    // Calculate total deaths across all nodes
    const totalDeaths = Object.values(nodeStats).reduce((sum, stats) => sum + stats.deaths, 0);
    
    // Calculate total difficulty rating using your formula
    // totalDeaths / ((150 * (419 + 0)) * 1)
    const totalDifficultyRating = totalDeaths / ((150 * (419 + 0)) * 1);
    
    // Update difficulty ratings for each node using your formula
    Object.keys(nodeStats).forEach(nodeNumber => {
      const stats = nodeStats[nodeNumber];
      const currentRating = ratings.nodes[nodeNumber] || {
        baseValue: 1.0,
        currentValue: 1.0,
        killBonus: 0.1,
        deathPenalty: 0.1,
        totalKills: 0,
        totalDeaths: 0,
        lastUpdated: null
      };
      
      // Calculate new difficulty using your formula:
      // ((totalDeaths / ((150 * (419 + 12)) * 1)) / totalDifficultyRating) * 10) + 1
      let newValue = currentRating.baseValue;
      
      if (totalDifficultyRating > 0) {
        const nodeDifficulty = ((stats.deaths / ((150 * (419 + 12)) * 1)) / totalDifficultyRating) * 10 + 1;
        newValue = Math.max(ratings.settings.minValue, Math.min(ratings.settings.maxValue, nodeDifficulty));
      }
      
      ratings.nodes[nodeNumber] = {
        ...currentRating,
        currentValue: newValue,
        totalKills: stats.kills,
        totalDeaths: stats.deaths,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return ratings;
  } catch (error) {
    console.error("Error recalculating difficulty ratings:", error);
    return ratings;
  }
}
