"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface NodeEntry {
  node?: number;
  deaths?: number;
  war?: number; // War number (1-12)
}

interface PlayerRow {
  player: string;
  entries: NodeEntry[];
  summary?: { kills: number; deaths: number };
}

interface BattlegroupDeathEntry {
  battlegroup: string;
  deaths: number;
  war: number;
  season: number;
  timestamp: string;
}

interface PlayerAPI {
  name: string;
  battlegroup?: string;
  killsPerNode: Record<string, number>;
  deathsPerNode: Record<string, number>;
  isCustom?: boolean;
}

export default function NodeTrackerPage() {
  const [players, setPlayers] = useState<PlayerAPI[]>([]);
  const [selectedBG, setSelectedBG] = useState<"" | "BG1" | "BG2" | "BG3">("");
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [nodeKills, setNodeKills] = useState<Record<number, number>>({});
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [currentWar, setCurrentWar] = useState<number>(1);
  const [currentSeason, setCurrentSeason] = useState<number>(60);
  const [battlegroupDeaths, setBattlegroupDeaths] = useState<number>(0);

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch("/api/playerData");
        const data = await res.json();
        setPlayers(data.players);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPlayers();
  }, []);

  const handleBGChange = (bg: "BG1" | "BG2" | "BG3") => {
    setSelectedBG(bg);
    const filtered = players.filter((p) => p.battlegroup === bg);

    // Always start fresh with empty data entries, but populate player names
    // Use the actual number of players in this battlegroup, with a minimum of 10 slots
    const maxSlots = Math.max(10, filtered.length);
    setRows(
      Array.from({ length: maxSlots }).map((_, i) => ({
        player: filtered[i]?.name || "",
        entries: [{}], // Start with one empty entry
      }))
    );
    
    // Reset node kills for fresh start
    setNodeKills({});
  };

  const handleEntryChange = (
    rowIndex: number,
    entryIndex: number,
    field: "node" | "deaths" | "war",
    value: number | undefined
  ) => {
    setRows((prev) => {
      const newRows = [...prev];
      const entries = [...newRows[rowIndex].entries];
      entries[entryIndex] = { 
        ...entries[entryIndex], 
        [field]: value,
        // Only set war to currentWar for new entries (when field is not "war")
        ...(field !== "war" && !entries[entryIndex].war ? { war: currentWar } : {})
      };
      newRows[rowIndex].entries = entries;

      // Auto-add next input if last node filled
      if (entryIndex === entries.length - 1 && entries[entryIndex].node !== undefined) {
        entries.push({});
        newRows[rowIndex].entries = entries;
      }

      // Update summary for this row in real-time
      const kills = entries.filter((e) => e.node).length;
      const deaths = entries.reduce((s, e) => s + (e.deaths ?? 0), 0);
      newRows[rowIndex] = { ...newRows[rowIndex], summary: { kills, deaths } };

      // Update node kills
      const newKills: Record<number, number> = {};
      newRows.forEach((r) => {
        r.entries.forEach((e) => {
          if (e.node) newKills[e.node] = (newKills[e.node] || 0) + 1;
        });
      });
      setNodeKills(newKills);

      return newRows;
    });
  };



  const handleSubmit = async () => {
    try {
      // First, get existing saved data
      const existingRes = await fetch("/api/savePlayerNodes");
      let existingData: PlayerRow[] = [];
      
      if (existingRes.ok) {
        existingData = await existingRes.json();
      }
      
      // Get current rows with actual data entered
      const currentRowsWithData = rows.filter(row => 
        row.player && row.entries.some(entry => entry.node !== undefined)
      );
      
      // For each player with new data, merge with existing data
      const mergedData = [...existingData]; // Start with all existing data
      
      currentRowsWithData.forEach(currentRow => {
        const existingPlayerIndex = mergedData.findIndex(row => row.player === currentRow.player);
        
        if (existingPlayerIndex >= 0) {
          // Player exists - ADD new entries to existing entries
          const existingPlayer = mergedData[existingPlayerIndex];
          const newEntries = currentRow.entries.filter(entry => entry.node !== undefined);
          
          mergedData[existingPlayerIndex] = {
            ...existingPlayer,
            entries: [...existingPlayer.entries, ...newEntries]
          };
        } else {
          // New player - add to data
          mergedData.push(currentRow);
        }
      });
      
      console.log('Merging data:', {
        existingDataCount: existingData.length,
        newEntriesCount: currentRowsWithData.length,
        totalAfterMerge: mergedData.length
      });
      
      // Save player data
      await fetch("/api/savePlayerNodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedData),
      });

      // Save battlegroup deaths if any
      if (battlegroupDeaths > 0 && selectedBG) {
        const battlegroupDeathEntry: BattlegroupDeathEntry = {
          battlegroup: selectedBG,
          deaths: battlegroupDeaths,
          war: currentWar,
          season: currentSeason,
          timestamp: new Date().toISOString()
        };

        await fetch("/api/battlegroupDeaths", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(battlegroupDeathEntry),
        });
      }

      alert("Data saved successfully!");
      
      // Reset the current rows to empty for fresh data entry
      const filtered = players.filter((p) => p.battlegroup === selectedBG);
      const maxSlots = Math.max(10, filtered.length);
      setRows(
        Array.from({ length: maxSlots }).map((_, i) => ({
          player: filtered[i]?.name || "",
          entries: [{}],
        }))
      );
      
      // Reset node kills for the current view
      setNodeKills({});
      
    } catch (err) {
      console.error(err);
      alert("Error saving data");
    }
  };

  const handleResetCurrentBG = () => {
    if (!selectedBG) return;
    
    const filtered = players.filter((p) => p.battlegroup === selectedBG);
    const maxSlots = Math.max(10, filtered.length);
      setRows(
        Array.from({ length: maxSlots }).map((_, i) => ({
          player: filtered[i]?.name || "",
          entries: [{}],
        }))
      );
      setNodeKills({});
      setBattlegroupDeaths(0);
  };

  const handleBulkAssignWar = () => {
    setRows((prev) => {
      const newRows = [...prev];
      newRows.forEach((row) => {
        row.entries.forEach((entry) => {
          // Only assign war if entry has data but no war assigned
          if ((entry.node !== undefined || entry.deaths !== undefined) && !entry.war) {
            entry.war = currentWar;
          }
        });
      });
      return newRows;
    });
  };

  const totalKills = Object.values(nodeKills).reduce((sum, val) => sum + val, 0);
  const totalDeaths = rows.reduce(
    (sum, row) => sum + row.entries.reduce((rowSum, e) => rowSum + (e.deaths ?? 0), 0),
    0
  );

  return (
    <div className="p-2 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 mb-2 text-sm">
        <div className="flex gap-1">
          <Link href="/manage-players">
            <Button
              variant="outline"
              className="hover:bg-blue-500 hover:text-white text-xs px-2 py-1"
            >
              Manage Players
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <label htmlFor="battlegroup-select">BG:</label>
            <select
              id="battlegroup-select"
              aria-label="Battlegroup"
              value={selectedBG}
              onChange={(e) =>
                handleBGChange(e.target.value as "BG1" | "BG2" | "BG3")
              }
              className="bg-gray-700 text-white p-1 rounded text-xs"
            >
              <option value="" disabled>
                Select
              </option>
              <option value="BG1">BG1</option>
              <option value="BG2">BG2</option>
              <option value="BG3">BG3</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="war-select">War:</label>
            <select
              id="war-select"
              aria-label="War"
              value={currentWar}
              onChange={(e) => setCurrentWar(Number(e.target.value))}
              className="bg-gray-700 text-white p-1 rounded text-xs"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  War {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="season-select">Season:</label>
            <select
              id="season-select"
              aria-label="Season"
              value={currentSeason}
              onChange={(e) => setCurrentSeason(Number(e.target.value))}
              className="bg-gray-700 text-white p-1 rounded text-xs"
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 55} value={i + 55}>
                  Season {i + 55}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Battlegroup Deaths Input */}
      {selectedBG && (
        <div className="flex items-center justify-center gap-2 mb-3 p-2 bg-gray-800 rounded border border-gray-600">
          <label htmlFor="bg-deaths" className="text-sm font-medium">
            {selectedBG} Battlegroup Deaths:
          </label>
          <input
            id="bg-deaths"
            type="number"
            min={0}
            placeholder="0"
            value={battlegroupDeaths}
            onChange={(e) => setBattlegroupDeaths(Number(e.target.value) || 0)}
            className="bg-gray-700 text-white p-1 rounded text-sm w-20 text-center focus:outline-none"
            title="Deaths that affect the entire battlegroup"
          />
          <span className="text-xs text-gray-400">
            (affects entire {selectedBG})
          </span>
        </div>
      )}

      <h1 className="text-xl font-bold mb-2 text-center">Node Tracker</h1>

      {/* Info message */}
      <div className="text-center text-xs text-gray-400 mb-2">
        Enter data for Season {currentSeason}, War {currentWar}. Submit saves data and resets form for next session.
        <br />
        Use individual dropdowns to assign war numbers to entries.
        <br />
        {selectedBG && "Enter battlegroup deaths above to track casualties that affect the entire battlegroup."}
      </div>



      {/* Rows */}
      <div className="space-y-1">
        {rows.map((row, rowIndex) => (
                     <Collapsible key={rowIndex} open={openRows.has(rowIndex)} onOpenChange={(open) => {
             if (open) {
               // Close all other rows when opening a new one
               setOpenRows(new Set([rowIndex]));
             } else {
               // Update summary when closing
               setRows((prev) =>
                 prev.map((row, i) => {
                   if (i === rowIndex) {
                     const kills = row.entries.filter((e) => e.node).length;
                     const deaths = row.entries.reduce((s, e) => s + (e.deaths ?? 0), 0);
                     return { ...row, summary: { kills, deaths } };
                   }
                   return row;
                 })
               );
               setOpenRows((prev) => {
                 const newSet = new Set(prev);
                 newSet.delete(rowIndex);
                 return newSet;
               });
             }
           }}>
                         <CollapsibleTrigger asChild>
               <div
                 ref={(el) => {rowRefs.current[rowIndex] = el;}}
                 className="bg-gray-800 p-2 rounded mb-1 cursor-pointer flex justify-between items-center collapsible-trigger"
                 data-row-index={rowIndex}
                 tabIndex={0}
                                   onClick={(e) => {
                    e.stopPropagation();
                  }}
               >
                <div className="text-sm font-semibold">{row.player || "—"}</div>
                <div className="flex items-center gap-1">
                  {row.summary && (
                    <span className="text-xs text-gray-400">
                      {row.summary.kills} K / {row.summary.deaths} D
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    openRows.has(rowIndex) ? "rotate-180" : ""
                  }`} />
                </div>
              </div>
            </CollapsibleTrigger>

                         <CollapsibleContent className="overflow-y-auto mt-2 max-h-96">
               <div
                 className="flex flex-col gap-1"
                 data-row-index={rowIndex}
                 onClick={(e) => {
                   e.stopPropagation();
                 }}
               >
                {row.entries.map((entry, entryIndex) => {
                  const prevFilled =
                    entryIndex === 0 || row.entries[entryIndex - 1].node !== undefined;
                  if (!prevFilled) return null;

                  return (
                    <div key={entryIndex} className="flex gap-1 w-full items-center">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        placeholder="Node"
                        value={entry.node ?? ""}
                        onChange={(e) =>
                          handleEntryChange(
                            rowIndex,
                            entryIndex,
                            "node",
                            e.target.value === "" ? undefined : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            // Focus next input in the same row
                            const currentInput = e.target as HTMLInputElement;
                            const nextInput = currentInput.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                            nextInput?.focus();
                          }
                        }}
                        className="bg-gray-700 p-0.5 rounded text-center text-xs w-16 no-spin focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Deaths"
                        value={entry.deaths ?? ""}
                        onChange={(e) =>
                          handleEntryChange(
                            rowIndex,
                            entryIndex,
                            "deaths",
                            e.target.value === "" ? undefined : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const nextEntryIndex = entryIndex + 1;
                            if (!row.entries[nextEntryIndex]) {
                              setRows((prev) => {
                                const newRows = [...prev];
                                newRows[rowIndex].entries.push({});
                                return newRows;
                              });
                            }
                            setTimeout(() => {
                   const nextNode = document.getElementById(
                     `node-${sessionId}-${rowIndex}-${nextEntryIndex}-${row.player.replace(/\s+/g, '-')}`
                   );
                              nextNode?.focus();
                            }, 50);
                          }
                        }}
                        className="bg-gray-700 p-0.5 rounded text-center text-xs w-16 no-spin focus:outline-none"
                      />
                      <select
                        value={entry.war ?? ""}
                        onChange={(e) =>
                          handleEntryChange(
                            rowIndex,
                            entryIndex,
                            "war",
                            e.target.value === "" ? undefined : Number(e.target.value)
                          )
                        }
                        className="bg-gray-700 text-white p-0.5 rounded text-xs w-12 focus:outline-none"
                        title="Assign War"
                      >
                        <option value="">War</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-2 text-center text-sm font-semibold">
        Total Kills: {totalKills} | Total Deaths: {totalDeaths}
      </div>

      {/* Submit and Reset */}
      <div className="flex justify-center gap-2 mt-2">
        <Button
          onClick={handleSubmit}
          variant="outline"
          className="hover:bg-white hover:text-black text-xs px-3 py-1"
        >
          Submit
        </Button>
        {selectedBG && (
          <Button
            onClick={handleResetCurrentBG}
            variant="outline"
            className="hover:bg-red-500 hover:text-white text-xs px-3 py-1"
          >
            Reset Current BG
          </Button>
        )}
        <Button
          onClick={async () => {
            try {
              const res = await fetch("/api/savePlayerNodes");
              if (res.ok) {
                const data = await res.json();
                console.log('All saved data:', data);
                alert(`Total players with data: ${data.length}\nCheck console for details.`);
              }
            } catch (err) {
              console.error(err);
              alert("Error loading data");
            }
          }}
          variant="outline"
          className="hover:bg-blue-500 hover:text-white text-xs px-3 py-1"
        >
          View All Data
        </Button>
      </div>

      <style jsx>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
