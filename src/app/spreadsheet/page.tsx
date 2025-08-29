"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PlayerAPI {
  name: string;
  battlegroup?: string;
}

interface NodeEntry {
  node?: number;
  deaths?: number;
}

interface PlayerRow {
  player: string;
  entries: NodeEntry[];
  active: boolean;
}

export default function NodeTrackerPage() {
  const [players, setPlayers] = useState<PlayerAPI[]>([]);
  const [selectedBG, setSelectedBG] = useState<"" | "BG1" | "BG2" | "BG3">("");
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [nodeKills, setNodeKills] = useState<Record<number, number>>({});

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

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

  useEffect(() => {
    setRows(
      Array.from({ length: 10 }).map(() => ({
        player: "",
        entries: Array.from({ length: 10 }).map(() => ({})),
        active: false,
      }))
    );
    inputRefs.current = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => null)
    );
  }, []);

  const filteredPlayers = players.filter((p) => p.battlegroup === selectedBG);

  const handleBGChange = (bg: "BG1" | "BG2" | "BG3") => {
    setSelectedBG(bg);
    const filtered = players.filter((p) => p.battlegroup === bg);

    setRows((prev) =>
      prev.map((row, i) => ({
        ...row,
        player: filtered[i]?.name || "",
        entries: row.entries,
        active: !!filtered[i],
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
      const newRows = prev.map((row, i) => {
        if (i === rowIndex) {
          const newEntries = [...row.entries];
          newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value };
          return { ...row, entries: newEntries };
        }
        return row;
      });

      // Scroll the row horizontally so the active input is visible
      const inputEl = inputRefs.current[rowIndex][entryIndex];
      if (inputEl && newRows[rowIndex].active) {
        inputEl.scrollIntoView({ behavior: "smooth", inline: "end", block: "nearest" });
      }

      return newRows;
    });

    // Update total kills
    setNodeKills(() => {
      const allEntries = rows.flatMap((r, idx) =>
        idx === rowIndex
          ? r.entries.map((e, i) =>
              i === entryIndex ? { ...e, [field]: value ?? 0 } : e
            )
          : r.entries
      );
      const newKills: Record<number, number> = {};
      allEntries.forEach((e) => {
        if (e.node) newKills[e.node] = (newKills[e.node] || 0) + 1;
      });
      return newKills;
    });
  };

  const handleFocusRow = (rowIndex: number) => {
    setRows((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, active: true } : row))
    );
  };

  const handleBlurRow = (rowIndex: number) => {
    setTimeout(() => {
      const rowEl = rowRefs.current[rowIndex];
      if (rowEl && !rowEl.contains(document.activeElement)) {
        setRows((prev) =>
          prev.map((row, i) => {
            if (i === rowIndex) {
              // Keep only filled entries and first pair
              const cleanedEntries = row.entries.map((e, idx) =>
                idx === 0 || e.node || e.deaths ? e : {}
              );
              return { ...row, active: false, entries: cleanedEntries };
            }
            return row;
          })
        );
      }
    }, 150);
  };

  const handleSubmit = () => {
    console.log("Submitted data:", rows);
  };

  const totalKills = Object.values(nodeKills).reduce((sum, val) => sum + val, 0);
  const totalDeaths = rows.reduce(
    (sum, row) =>
      sum +
      row.entries.reduce((rowSum, entry) => rowSum + (entry.deaths ?? 0), 0),
    0
  );

  return (
    <main className="p-2 bg-gray-900 text-white min-h-screen">
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

      <div className="space-y-1">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            ref={(el) => { rowRefs.current[rowIndex] = el }}
            className="bg-gray-800 p-1 rounded flex gap-1 overflow-x-auto"
          >
            <div className="w-16 sm:w-20 text-center text-xs font-semibold flex-shrink-0">
              {row.player || "—"}
            </div>

            <div className="flex gap-1 flex-nowrap">
              {row.entries.map((entry, entryIndex) => {
                const first = entryIndex === 0;
                const prev = row.entries[entryIndex - 1];
                const hasValue = entry.node || entry.deaths;
                const show =
                  first || hasValue || (row.active && prev && (prev.node || prev.deaths));
                if (!show) return null;

                return (
                  <div key={entryIndex} className="flex gap-1 flex-none w-20">
                    <input
                      ref={(el) => {
                        if (!inputRefs.current[rowIndex]) inputRefs.current[rowIndex] = [];
                        inputRefs.current[rowIndex][entryIndex] = el;
                      }}
                      type="number"
                      min={1}
                      max={50}
                      placeholder="Node"
                      value={entry.node ?? ""}
                      onFocus={() => handleFocusRow(rowIndex)}
                      onBlur={() => handleBlurRow(rowIndex)}
                      onChange={(e) =>
                        handleEntryChange(
                          rowIndex,
                          entryIndex,
                          "node",
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                      className="bg-gray-700 p-1 rounded text-center text-xs w-full no-spin focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Deaths"
                      value={entry.deaths ?? ""}
                      onFocus={() => handleFocusRow(rowIndex)}
                      onBlur={() => handleBlurRow(rowIndex)}
                      onChange={(e) =>
                        handleEntryChange(
                          rowIndex,
                          entryIndex,
                          "deaths",
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                      className="bg-gray-700 p-1 rounded text-center text-xs w-full no-spin focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-center text-sm font-semibold">
        Total Kills: {totalKills} | Total Deaths: {totalDeaths}
      </div>

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
