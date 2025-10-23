"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function DifficultyManagement() {
  const [difficultyRatings, setDifficultyRatings] = useState<DifficultyRatings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchDifficultyRatings();
  }, []);

  const fetchDifficultyRatings = async () => {
    try {
      const response = await fetch("/api/difficultyRating");
      const data = await response.json();
      setDifficultyRatings(data);
    } catch (error) {
      console.error("Error fetching difficulty ratings:", error);
      setMessage("Error loading difficulty ratings");
    } finally {
      setLoading(false);
    }
  };

  const recalculateDifficultyRatings = async () => {
    setUpdating(true);
    setMessage("");
    
    try {
      const response = await fetch("/api/difficultyRating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recalculate: true }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage("Difficulty ratings recalculated successfully!");
        await fetchDifficultyRatings(); // Refresh the data
      } else {
        setMessage("Error recalculating difficulty ratings");
      }
    } catch (error) {
      console.error("Error recalculating difficulty ratings:", error);
      setMessage("Error recalculating difficulty ratings");
    } finally {
      setUpdating(false);
    }
  };

  const initializeFromCSV = async () => {
    setUpdating(true);
    setMessage("");
    
    try {
      const response = await fetch("/api/initializeDifficultyRatings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage("Difficulty ratings initialized from CSV successfully!");
        await fetchDifficultyRatings(); // Refresh the data
      } else {
        setMessage("Error initializing difficulty ratings");
      }
    } catch (error) {
      console.error("Error initializing difficulty ratings:", error);
      setMessage("Error initializing difficulty ratings");
    } finally {
      setUpdating(false);
    }
  };

  const updateNodeValue = async (nodeNumber: string, field: keyof NodeDifficulty, value: number) => {
    try {
      const response = await fetch("/api/difficultyRating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeNumber,
          [field]: value,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`Node ${nodeNumber} ${field} updated successfully!`);
        await fetchDifficultyRatings(); // Refresh the data
      } else {
        setMessage("Error updating node value");
      }
    } catch (error) {
      console.error("Error updating node value:", error);
      setMessage("Error updating node value");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading difficulty ratings...</div>
      </div>
    );
  }

  if (!difficultyRatings) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">Error loading difficulty ratings</div>
      </div>
    );
  }

  const nodes = Object.entries(difficultyRatings.nodes).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Difficulty Rating Management</h1>
        <div className="space-x-2">
          <Button 
            onClick={recalculateDifficultyRatings} 
            disabled={updating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updating ? "Recalculating..." : "Recalculate All Ratings"}
          </Button>
          <Button 
            onClick={initializeFromCSV} 
            disabled={updating}
            className="bg-green-600 hover:bg-green-700"
          >
            {updating ? "Initializing..." : "Initialize from CSV"}
          </Button>
          <Button onClick={fetchDifficultyRatings} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        }`}>
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Configure how difficulty ratings are calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Adjustment Factor</label>
              <Input 
                value={difficultyRatings.settings.adjustmentFactor} 
                disabled 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Min Value</label>
              <Input 
                value={difficultyRatings.settings.minValue} 
                disabled 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Value</label>
              <Input 
                value={difficultyRatings.settings.maxValue} 
                disabled 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Update Threshold</label>
              <Input 
                value={difficultyRatings.settings.updateThreshold} 
                disabled 
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Node Difficulty Ratings</CardTitle>
          <CardDescription>
            Current difficulty ratings for each node. Values are automatically adjusted based on player performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node</TableHead>
                  <TableHead>Base Value</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Kill Bonus</TableHead>
                  <TableHead>Death Penalty</TableHead>
                  <TableHead>Total Kills</TableHead>
                  <TableHead>Total Deaths</TableHead>
                  <TableHead>K/D Ratio</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map(([nodeNumber, node]) => {
                  const kdRatio = node.totalDeaths > 0 ? (node.totalKills / node.totalDeaths).toFixed(2) : node.totalKills.toString();
                  const lastUpdated = node.lastUpdated ? new Date(node.lastUpdated).toLocaleString() : "Never";
                  
                  return (
                    <TableRow key={nodeNumber}>
                      <TableCell className="font-medium">Node {nodeNumber}</TableCell>
                      <TableCell>
                        <Input
                          value={node.baseValue}
                          onChange={(e) => updateNodeValue(nodeNumber, "baseValue", parseFloat(e.target.value))}
                          className="w-20"
                          type="number"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={node.currentValue}
                          onChange={(e) => updateNodeValue(nodeNumber, "currentValue", parseFloat(e.target.value))}
                          className="w-20"
                          type="number"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={node.killBonus}
                          onChange={(e) => updateNodeValue(nodeNumber, "killBonus", parseFloat(e.target.value))}
                          className="w-20"
                          type="number"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={node.deathPenalty}
                          onChange={(e) => updateNodeValue(nodeNumber, "deathPenalty", parseFloat(e.target.value))}
                          className="w-20"
                          type="number"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>{node.totalKills}</TableCell>
                      <TableCell>{node.totalDeaths}</TableCell>
                      <TableCell>{kdRatio}</TableCell>
                      <TableCell className="text-sm text-gray-500">{lastUpdated}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

       <Card>
         <CardHeader>
           <CardTitle>How It Works</CardTitle>
         </CardHeader>
         <CardContent className="space-y-2">
           <p>
             <strong>Formula Used:</strong> Node difficulty is calculated using your specific formula:
           </p>
           <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
             <p>1. Total Difficulty Rating = totalDeaths / ((150 * (419 + 0)) * 1)</p>
             <p>2. Node Difficulty = ((nodeDeaths / ((150 * (419 + 12)) * 1)) / totalDifficultyRating) * 10 + 1</p>
           </div>
           <p>
             <strong>Total Deaths:</strong> {Object.values(difficultyRatings.nodes).reduce((sum, node) => sum + node.totalDeaths, 0)} across all nodes
           </p>
           <p>
             <strong>Total Difficulty Rating:</strong> {(() => {
               const totalDeaths = Object.values(difficultyRatings.nodes).reduce((sum, node) => sum + node.totalDeaths, 0);
               return (totalDeaths / ((150 * (419 + 0)) * 1)).toFixed(6);
             })()}
           </p>
           <p>
             <strong>Min/Max Values:</strong> Difficulty is capped between {difficultyRatings.settings.minValue} and {difficultyRatings.settings.maxValue}
           </p>
         </CardContent>
       </Card>
    </div>
  );
}
