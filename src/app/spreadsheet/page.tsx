"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";


interface PlayerAPI {
  name: string;
}

// Base interface for all rows
interface BaseRow {
  label: string;
  section: "Paths Set 1" | "Paths Set 2" | "Nodes";
  player: string;
}

// Paths rows (first 18)
interface PathRow extends BaseRow {
  defender1: string;
  attacker1: string;
  deaths1: number;
  defender2: string;
  attacker2: string;
  deaths2: number;
}

// Nodes rows (last 14)
interface NodeRow extends BaseRow {
  defender: string;
  attacker: string;
  deaths: number;
}

type RowData = PathRow | NodeRow;

export default function SpreadsheetPage() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [players, setPlayers] = useState<string[]>([]);

  // Fetch player names from API
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch("/api/playerData");
        const data = await res.json();
        const names: string[] = data.players.map((p: PlayerAPI) => p.name);
        setPlayers(names);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPlayers();
  }, []);

  // Initialize rows
  useEffect(() => {
    const initial: RowData[] = [];

    // Paths Set 1
    for (let i = 1; i <= 9; i++) {
      initial.push({
        section: "Paths Set 1",
        label: `Path ${i}`,
        player: "",
        defender1: "",
        attacker1: "",
        deaths1: 0,
        defender2: "",
        attacker2: "",
        deaths2: 0,
      });
    }

    // Paths Set 2
    for (let i = 1; i <= 9; i++) {
      initial.push({
        section: "Paths Set 2",
        label: `Path ${i}`,
        player: "",
        defender1: "",
        attacker1: "",
        deaths1: 0,
        defender2: "",
        attacker2: "",
        deaths2: 0,
      });
    }

    // Nodes 37–50 (Boss Fights)
    for (let i = 37; i <= 50; i++) {
      initial.push({
        section: "Nodes",
        label: `Node ${i}`,
        player: "",
        defender: "",
        attacker: "",
        deaths: 0,
      });
    }

    setRows(initial);
  }, []);

  const sectionDisplayNames: Record<RowData["section"], string> = {
    "Paths Set 1": "Section 1",
    "Paths Set 2": "Section 2",
    Nodes: "Boss Fights",
  };

  // Generic handleChange for all fields
  const handleChange = <T extends RowData>(
    index: number,
    field: keyof T,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, [field]: value } as RowData
          : row
      )
    );
  };

  const handleSubmit = () => {
    console.log("Submitted rows:", rows);
  };

  return (
    <main className="p-6 bg-gray-900 text-white min-h-screen">
        <div className="flex justify-between items-left mb-4">
        <Link href="/">
          <Button variant="outline">← Back to Home</Button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4 text-center">War Planner SpreadSheet</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-700 text-center">
            <tr>
              <th className="p-2">Label</th>
              <th className="p-2">Player</th>
              <th className="p-2">Defender 1</th>
              <th className="p-2">Attacker 1</th>
              <th className="p-2">Deaths 1</th>
              <th className="p-2">Defender 2</th>
              <th className="p-2">Attacker 2</th>
              <th className="p-2">Deaths 2</th>
            </tr>
          </thead>

          {(Object.keys(sectionDisplayNames) as RowData["section"][]).map(
            (section) => (
              <tbody key={section}>
                <tr>
                  <td colSpan={8} className="bg-gray-800 font-semibold text-center p-2">
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
                        <tr
                          key={`${node.label}-${idx}`}
                          className="even:bg-gray-900 odd:bg-gray-800 text-center"
                        >
                          <td className="p-2">{node.label}</td>
                          <td className="p-2">
                            <select
                              value={node.player}
                              onChange={(e) =>
                                handleChange<NodeRow>(rowIndex, "player", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-32 mx-auto text-center"
                              required
                            >
                              <option value="" disabled>
                                Player
                              </option>
                              {players.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Defender"
                              value={node.defender}
                              onChange={(e) =>
                                handleChange<NodeRow>(rowIndex, "defender", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-32 mx-auto text-center"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Attacker"
                              value={node.attacker}
                              onChange={(e) =>
                                handleChange<NodeRow>(rowIndex, "attacker", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-32 mx-auto text-center"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              placeholder="0"
                              value={node.deaths}
                              onChange={(e) =>
                                handleChange<NodeRow>(rowIndex, "deaths", Number(e.target.value))
                              }
                              className="bg-gray-700 p-1 rounded w-20 mx-auto text-center"
                              min={0}
                            />
                          </td>
                          {/* empty cells */}
                          <td className="p-2 text-center"></td>
                          <td className="p-2 text-center"></td>
                          <td className="p-2 text-center"></td>
                        </tr>
                      );
                    } else {
                      const path = row as PathRow;
                      return (
                        <tr key={`${path.label}-${idx}`} className="even:bg-gray-900 odd:bg-gray-800">
                          <td className="p-2">{path.label}</td>
                          <td className="p-2">
                            <select
                              value={path.player}
                              onChange={(e) =>
                                handleChange<PathRow>(rowIndex, "player", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-full"
                              required
                            >
                              <option value="" disabled>
                                Player
                              </option>
                              {players.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Defender"
                              value={path.defender1}
                              onChange={(e) =>
                                handleChange<PathRow>(rowIndex, "defender1", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-full"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Attacker"
                              value={path.attacker1}
                              onChange={(e) =>
                                handleChange<PathRow>(rowIndex, "attacker1", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-full"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              placeholder="0"
                              value={path.deaths1}
                              onChange={(e) =>
                                handleChange<PathRow>(rowIndex, "deaths1", Number(e.target.value))
                              }
                              className="bg-gray-700 p-1 rounded w-20 text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Defender"
                              value={path.defender2}
                              onChange={(e) =>
                                handleChange<PathRow>(rowIndex, "defender2", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-full"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Attacker"
                              value={path.attacker2}
                              onChange={(e) =>
                                handleChange<PathRow>(rowIndex, "attacker2", e.target.value)
                              }
                              className="bg-gray-700 p-1 rounded w-full"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              placeholder="0"
                              value={path.deaths2}
                              onChange={(e) =>
                                handleChange<PathRow>(rowIndex, "deaths2", Number(e.target.value))
                              }
                              className="bg-gray-700 p-1 rounded w-20 text-center"
                            />
                          </td>
                        </tr>
                      );
                    }
                  })}
              </tbody>
            )
          )}
        </table>
      </div>

      <Button onClick={handleSubmit} className="mt-4 mx-auto block">
        Submit Data
      </Button>
    </main>
  );
}
