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
  const [selectedBG, setSelectedBG] = useState<"BG1" | "BG2" | "BG3">("BG1");
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [nodeKills, setNodeKills] = useState<Record<number, number>>({});
  const totalKills = Object.values(nodeKills).reduce((sum, val) => sum + val, 0);

const totalDeaths = rows.reduce(
  (sum, row) =>
    sum +
    row.entries.reduce((rowSum, entry) => rowSum + (entry.deaths ?? 0), 0),
  0
);


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

  useEffect(() => {
    setRows(
      Array.from({ length: 10 }).map(() => ({
        player: "",
        entries: Array.from({ length: 10 }).map(() => ({})),
        active: false,
      }))
    );
  }, []);

  const filteredPlayers = players.filter((p) => p.battlegroup === selectedBG);

  // Only show players not already selected in other rows
  const getAvailablePlayers = (rowIndex: number) => {
    const selectedPlayers = rows
      .filter((_, i) => i !== rowIndex)
      .map((r) => r.player)
      .filter(Boolean);
    return filteredPlayers.filter((p) => !selectedPlayers.includes(p.name));
  };

  const handlePlayerChange = (rowIndex: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, player: value, active: true } : row))
    );
  };

  const handleEntryChange = (
    rowIndex: number,
    entryIndex: number,
    field: "node" | "deaths",
    value: number | undefined
  ) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i === rowIndex) {
          const newEntries = [...row.entries];
          newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value };
          return { ...row, entries: newEntries };
        }
        return row;
      })
    );

    // Update node kills internally
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
          prev.map((row, i) => (i === rowIndex ? { ...row, active: false } : row))
        );
      }
    }, 400); // 400ms delay handles mobile dropdown
  };

  const handleSubmit = () => {
    console.log("Submitted data:", rows);
  };

  return (
    <main className="p-4 sm:p-6 bg-gray-900 text-white min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
        <Link href="/">
          <Button variant="outline" className="hover:bg-white hover:text-black">
            ← Back to Home
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span>Choose Battlegroup:</span>
          <select
            value={selectedBG}
            onChange={(e) => setSelectedBG(e.target.value as "BG1" | "BG2" | "BG3")}
            className="bg-gray-700 text-white p-1 rounded"
          >
            <option value="BG1">BG1</option>
            <option value="BG2">BG2</option>
            <option value="BG3">BG3</option>
          </select>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4 text-center">Kill and Death Tracker</h1>

      <div className="space-y-4">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            ref={(el) => {rowRefs.current[rowIndex] = el}}
            className="bg-gray-800 p-3 rounded flex flex-col sm:flex-row sm:items-start gap-4 flex-wrap"
          >
            {/* Player dropdown */}
            <select
              value={row.player}
              onChange={(e) => handlePlayerChange(rowIndex, e.target.value)}
              onFocus={() => handleFocusRow(rowIndex)}
              onBlur={() => handleBlurRow(rowIndex)}
              className="bg-gray-700 p-1 rounded w-full sm:w-36 text-center flex-shrink-0"
            >
              <option value="" disabled>
                Player
              </option>
              {getAvailablePlayers(rowIndex).map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Node/Deaths inputs */}
            <div className="flex flex-wrap gap-2 flex-1">
              {row.entries
                .filter((entry, idx) => {
                  const isFilled = entry.node !== undefined || entry.deaths !== undefined;
                  const firstEmpty =
                    row.active &&
                    idx <= row.entries.findIndex((e) => !e.node && !e.deaths);
                  return isFilled || firstEmpty;
                })
                .map((entry, entryIndex) => (
                  <div key={entryIndex} className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      placeholder="Node 1-50"
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
                      className="bg-gray-700 p-1 rounded w-24 text-center no-arrows"
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
                      className="bg-gray-700 p-1 rounded w-20 text-center no-arrows"
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-4 gap-6 text-lg font-semibold">
  <div>Total Kills: {totalKills}</div>
  <div>Total Deaths: {totalDeaths}</div>
</div>


      <div className="flex justify-center mt-4">
        <Button onClick={handleSubmit} variant="outline" className="hover:bg-white hover:text-black">
          Submit Data
        </Button>
      </div>
    </main>
  );
}
