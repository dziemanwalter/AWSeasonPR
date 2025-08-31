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
}

interface PlayerRow {
  player: string;
  entries: NodeEntry[];
  summary?: { kills: number; deaths: number };
}

interface PlayerAPI {
  name: string;
  battlegroup?: string;
  killsPerNode: Record<string, number>;
  deathsPerNode: Record<string, number>;
}

export default function NodeTrackerPage() {
  const [players, setPlayers] = useState<PlayerAPI[]>([]);
  const [selectedBG, setSelectedBG] = useState<"" | "BG1" | "BG2" | "BG3">("");
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [nodeKills, setNodeKills] = useState<Record<number, number>>({});
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());

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

    setRows(
      Array.from({ length: 10 }).map((_, i) => ({
        player: filtered[i]?.name || "",
        entries: [{}],
      }))
    );
  };

  const handleEntryChange = (
    rowIndex: number,
    entryIndex: number,
    field: "node" | "deaths",
    value: number | undefined
  ) => {
    setRows((prev) => {
      const newRows = [...prev];
      const entries = [...newRows[rowIndex].entries];
      entries[entryIndex] = { ...entries[entryIndex], [field]: value };
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
      await fetch("/api/savePlayerNodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      alert("Player node data saved!");
    } catch (err) {
      console.error(err);
      alert("Error saving data");
    }
  };

  const totalKills = Object.values(nodeKills).reduce((sum, val) => sum + val, 0);
  const totalDeaths = rows.reduce(
    (sum, row) => sum + row.entries.reduce((rowSum, e) => rowSum + (e.deaths ?? 0), 0),
    0
  );

  return (
    <main className="p-2 bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 mb-2 text-sm">
        <Link href="/">
          <Button
            variant="outline"
            className="hover:bg-white hover:text-black text-xs px-2 py-1"
          >
            ← Home
          </Button>
        </Link>
        <div className="flex items-center gap-1 text-xs">
          <span>Battlegroup:</span>
          <select
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
      </div>

      <h1 className="text-xl font-bold mb-2 text-center">Node Tracker</h1>

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
                    <div key={entryIndex} className="flex gap-1 w-full">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        placeholder="Node"
                        id={`node-${rowIndex}-${entryIndex}`}
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
                            const deathInput = document.getElementById(
                              `death-${rowIndex}-${entryIndex}`
                            );
                            deathInput?.focus();
                          }
                        }}
                        className="bg-gray-700 p-0.5 rounded text-center text-xs w-16 no-spin focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Deaths"
                        id={`death-${rowIndex}-${entryIndex}`}
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
                                `node-${rowIndex}-${nextEntryIndex}`
                              );
                              nextNode?.focus();
                            }, 50);
                          }
                        }}
                        className="bg-gray-700 p-0.5 rounded text-center text-xs w-16 no-spin focus:outline-none"
                      />
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

      {/* Submit */}
      <div className="flex justify-center mt-2">
        <Button
          onClick={handleSubmit}
          variant="outline"
          className="hover:bg-white hover:text-black text-xs px-3 py-1"
        >
          Submit
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
    </main>
  );
}
