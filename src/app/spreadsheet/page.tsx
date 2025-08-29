"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PlayerAPI {
  name: string;
  battlegroup?: string;
}

interface BaseRow {
  label: string;
  section: "Paths Set 1" | "Paths Set 2" | "Nodes";
}

interface PathRow extends BaseRow {
  player1: string;
  defender1: string;
  attacker1: string;
  deaths1: number;
  player2: string;
  defender2: string;
  attacker2: string;
  deaths2: number;
  notes: string;
}

interface NodeRow extends BaseRow {
  player: string;
  defender: string;
  attacker: string;
  deaths: number;
  notes: string;
}

type RowData = PathRow | NodeRow;

export default function SpreadsheetPage() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [players, setPlayers] = useState<PlayerAPI[]>([]);
  const [selectedBG, setSelectedBG] = useState<"BG1" | "BG2" | "BG3">("BG1");

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
    const initial: RowData[] = [];

    for (let i = 1; i <= 9; i++) {
      initial.push({
        section: "Paths Set 1",
        label: `Path ${i}`,
        player1: "",
        defender1: "",
        attacker1: "",
        deaths1: 0,
        player2: "",
        defender2: "",
        attacker2: "",
        deaths2: 0,
        notes: "",
      });
    }

    for (let i = 1; i <= 9; i++) {
      initial.push({
        section: "Paths Set 2",
        label: `Path ${i}`,
        player1: "",
        defender1: "",
        attacker1: "",
        deaths1: 0,
        player2: "",
        defender2: "",
        attacker2: "",
        deaths2: 0,
        notes: "",
      });
    }

    for (let i = 37; i <= 50; i++) {
      initial.push({
        section: "Nodes",
        label: `Node ${i}`,
        player: "", // start as empty string
        defender: "",
        attacker: "",
        deaths: 0,
        notes: "",
      });
    }

    setRows(initial);
  }, []);

  const sectionDisplayNames: Record<RowData["section"], string> = {
    "Paths Set 1": "Section 1",
    "Paths Set 2": "Section 2",
    Nodes: "Boss Fights",
  };

  const handleChange = <T extends RowData>(
    index: number,
    field: keyof T,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } as RowData : row))
    );
  };

  const handleSubmit = () => {
    console.log("Submitted rows:", rows);
  };

  const filteredPlayers = players.filter((p) => p.battlegroup === selectedBG);

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

      <h1 className="text-2xl font-bold mb-4 text-center">War Planner Spreadsheet</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-gray-700 text-center">
            <tr>
              <th className="p-1 sm:p-2">Label</th>
              <th className="p-1 sm:p-2">Player / Roles</th>
              <th className="p-1 sm:p-2">Notes</th>
            </tr>
          </thead>

          {(Object.keys(sectionDisplayNames) as RowData["section"][]).map((section) => (
            <tbody key={section}>
              <tr>
                <td colSpan={3} className="bg-gray-800 font-semibold text-center p-2">
                  {sectionDisplayNames[section]}
                </td>
              </tr>

              {rows
                .filter((row) => row.section === section)
                .map((row, idx) => {
                  const rowIndex = rows.findIndex((r) => r === row);

                  if (row.section === "Nodes") {
                    const node = row as NodeRow;
                    return (
                      <tr key={node.label} className="even:bg-gray-900 odd:bg-gray-800">
                        <td className="p-1 sm:p-2">{node.label}</td>
                        <td className="p-1 sm:p-2">
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* Player Dropdown with placeholder */}
                            <select
                              value={node.player}
                              onChange={(e) => handleChange<NodeRow>(rowIndex, "player", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                              required
                            >
                              <option value="" disabled>
                                Player
                              </option>
                              {filteredPlayers.map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              placeholder="Defender"
                              value={node.defender}
                              onChange={(e) => handleChange<NodeRow>(rowIndex, "defender", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Attacker"
                              value={node.attacker}
                              onChange={(e) => handleChange<NodeRow>(rowIndex, "attacker", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                            />
                            <input
                              type="number"
                              value={node.deaths === 0 ? "" : node.deaths}
                              onChange={(e) =>
                                handleChange<NodeRow>(
                                  rowIndex,
                                  "deaths",
                                  e.target.value === "" ? 0 : Number(e.target.value)
                                )
                              }
                              className="bg-gray-700 text-center rounded h-8 w-12 sm:w-16 p-1"
                              min={0}
                            />
                          </div>
                        </td>
                        <td className="p-1 sm:p-2">
                          <input
                            type="text"
                            placeholder="Enter notes..."
                            value={node.notes}
                            onChange={(e) => handleChange<NodeRow>(rowIndex, "notes", e.target.value)}
                            className="bg-gray-700 p-1 rounded w-full text-left"
                          />
                        </td>
                      </tr>
                    );
                  } else {
                    const path = row as PathRow;
                    return (
                      <tr key={path.label} className="even:bg-gray-900 odd:bg-gray-800">
                        <td className="p-1 sm:p-2">{path.label}</td>
                        <td className="p-1 sm:p-2">
                          <div className="flex flex-col sm:flex-row gap-2 w-full">
                            {/* First Set Player Dropdown */}
                            <select
                              value={path.player1}
                              onChange={(e) => handleChange<PathRow>(rowIndex, "player1", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                              required
                            >
                              <option value="" disabled>
                                Player
                              </option>
                              {filteredPlayers.map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Defender"
                              value={path.defender1}
                              onChange={(e) => handleChange<PathRow>(rowIndex, "defender1", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Attacker"
                              value={path.attacker1}
                              onChange={(e) => handleChange<PathRow>(rowIndex, "attacker1", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                            />
                            <input
                              type="number"
                              value={path.deaths1 === 0 ? "" : path.deaths1}
                              onChange={(e) =>
                                handleChange<PathRow>(
                                  rowIndex,
                                  "deaths1",
                                  e.target.value === "" ? 0 : Number(e.target.value)
                                )
                              }
                              className="bg-gray-700 text-center rounded h-8 w-12 sm:w-16 p-1"
                              min={0}
                            />

                            {/* Second Set Player Dropdown */}
                            <select
                              value={path.player2}
                              onChange={(e) => handleChange<PathRow>(rowIndex, "player2", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                              required
                            >
                              <option value="" disabled>
                                Player
                              </option>
                              {filteredPlayers.map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Defender"
                              value={path.defender2}
                              onChange={(e) => handleChange<PathRow>(rowIndex, "defender2", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Attacker"
                              value={path.attacker2}
                              onChange={(e) => handleChange<PathRow>(rowIndex, "attacker2", e.target.value)}
                              className="bg-gray-700 p-1 rounded flex-1 text-center"
                            />
                            <input
                              type="number"
                              value={path.deaths2 === 0 ? "" : path.deaths2}
                              onChange={(e) =>
                                handleChange<PathRow>(
                                  rowIndex,
                                  "deaths2",
                                  e.target.value === "" ? 0 : Number(e.target.value)
                                )
                              }
                              className="bg-gray-700 text-center rounded h-8 w-12 sm:w-16 p-1"
                              min={0}
                            />
                          </div>
                        </td>
                        <td className="p-1 sm:p-2">
                          <input
                            type="text"
                            placeholder="Enter notes..."
                            value={path.notes}
                            onChange={(e) => handleChange<PathRow>(rowIndex, "notes", e.target.value)}
                            className="bg-gray-700 p-1 rounded w-full text-left"
                          />
                        </td>
                      </tr>
                    );
                  }
                })}
            </tbody>
          ))}
        </table>
      </div>

      <div className="flex justify-center mt-4">
        <Button onClick={handleSubmit} variant="outline" className="hover:bg-white hover:text-black">
          Submit Data
        </Button>
      </div>
    </main>
  );
}
