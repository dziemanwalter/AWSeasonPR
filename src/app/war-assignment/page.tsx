"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

interface NodeEntry {
  node?: number;
  deaths?: number;
  war?: number;
}

interface PlayerRowData {
  player: string;
  entries: NodeEntry[];
}

export default function WarAssignmentPage() {
  const [rows, setRows] = useState<PlayerRowData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filterText, setFilterText] = useState<string>("");
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState<boolean>(false);
  const [currentWar, setCurrentWar] = useState<number>(1);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/savePlayerNodes");
        if (!res.ok) throw new Error("Failed to load saved entries");
        const data: PlayerRowData[] = await res.json();
        setRows(data || []);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    const byText = text
      ? rows.filter((r) => (r.player || "").toLowerCase().includes(text))
      : rows;

    if (!showOnlyUnassigned) return byText;

    return byText
      .map((r) => ({
        ...r,
        entries: r.entries.filter((e) => (e.node !== undefined || e.deaths !== undefined) && !e.war),
      }))
      .filter((r) => r.entries.length > 0);
  }, [rows, filterText, showOnlyUnassigned]);

  const handleEntryChange = (
    rowIndex: number,
    entryIndex: number,
    field: "node" | "deaths" | "war",
    value: number | undefined
  ) => {
    setRows((prev) => {
      const copy = [...prev];
      const entries = [...copy[rowIndex].entries];
      entries[entryIndex] = {
        ...entries[entryIndex],
        [field]: value,
      };
      copy[rowIndex] = { ...copy[rowIndex], entries };
      return copy;
    });
  };

  const handleBulkAssignWar = (rowIndex: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const entries = copy[rowIndex].entries.map((e) => {
        if ((e.node !== undefined || e.deaths !== undefined) && !e.war) {
          return { ...e, war: currentWar };
        }
        return e;
      });
      copy[rowIndex] = { ...copy[rowIndex], entries };
      return copy;
    });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/savePlayerNodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      if (!res.ok) throw new Error("Failed to save updates");
      alert("Saved successfully");
    } catch (err: any) {
      setError(err.message || "Unknown error while saving");
      alert("Save failed: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
        </div>
        <div className="flex items-center gap-2 text-xs">
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
          <Button onClick={handleSave} className="text-xs px-2 py-1">
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 text-xs">
        <input
          type="text"
          placeholder="Filter by player name"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="bg-gray-700 p-1 rounded text-xs w-full sm:w-64"
          aria-label="Filter by player name"
        />
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showOnlyUnassigned}
            onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
          />
          <span>Show only unassigned</span>
        </label>
      </div>

      {error && (
        <div className="text-red-400 text-xs mb-2">{error}</div>
      )}

      {isLoading && rows.length === 0 ? (
        <div className="text-xs text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row, rowIndex) => (
            <div key={rowIndex} className="border border-gray-700 rounded p-2 bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{row.player || "(empty slot)"}</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="hover:bg-yellow-500 hover:text-white text-xs px-2 py-1"
                    onClick={() => handleBulkAssignWar(rowIndex)}
                    title="Assign current war to all unassigned entries for this player"
                  >
                    Assign War {currentWar}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-gray-300">
                    <tr>
                      <th className="text-left p-1">#</th>
                      <th className="text-left p-1">Node</th>
                      <th className="text-left p-1">Deaths</th>
                      <th className="text-left p-1">War</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.entries.map((entry, entryIndex) => (
                      <tr key={entryIndex} className="border-t border-gray-700">
                        <td className="p-1 text-gray-400">{entryIndex + 1}</td>
                        <td className="p-1">
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
                            className="bg-gray-700 p-0.5 rounded text-xs w-20 text-center"
                          />
                        </td>
                        <td className="p-1">
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
                            className="bg-gray-700 p-0.5 rounded text-xs w-20 text-center"
                          />
                        </td>
                        <td className="p-1">
                          <select
                            aria-label="War"
                            value={entry.war ?? ""}
                            onChange={(e) =>
                              handleEntryChange(
                                rowIndex,
                                entryIndex,
                                "war",
                                e.target.value === "" ? undefined : Number(e.target.value)
                              )
                            }
                            className="bg-gray-700 text-white p-0.5 rounded text-xs w-16"
                          >
                            <option value="">—</option>
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

