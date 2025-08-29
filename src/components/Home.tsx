"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Player {
  name: string;
  kills: number;
  deaths: number;
  battlegroup?: string;
  powerRating?: number;
}

type SortKey = "pr" | "soloRate" | "kills" | "deaths";

export default function SeasonStats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalKills, setTotalKills] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("pr");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/playerData");
        const data = await res.json();
        setPlayers(data.players);
        setTotalKills(data.totalAllianceKills);
        setTotalDeaths(data.totalAllianceDeaths);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const sortedPlayers = [...players].sort((a, b) => {
    switch (sortKey) {
      case "pr":
        return (b.powerRating || 0) - (a.powerRating || 0);
      case "soloRate":
        const soloA = a.kills / ((a.kills + a.deaths) || 1);
        const soloB = b.kills / ((b.kills + b.deaths) || 1);
        return soloB - soloA;
      case "kills":
        return b.kills - a.kills;
      case "deaths":
        return b.deaths - a.deaths;
      default:
        return 0;
    }
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-yellow-400 text-center">
        PR Season Stats
      </h1>

      {/* Button to Battle Groups */}
      <div className="flex justify-center sm:justify-start mb-6">
        <Link href="/battle-groups">
          <button className="px-4 py-2 rounded-lg bg-slate-500 hover:bg-slate-700 text-white font-semibold transition-colors">
            View Battle Groups
          </button>
        </Link>
        {/* Button to Spreadsheet */}
      <div className="flex justify-center sm:justify-start mb-6">
        <Link href="/spreadsheet">
          <button className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-800 text-white font-semibold transition-colors">
            View Spreadsheet
          </button>
        </Link>
      </div>

      </div>

      {/* Alliance Totals */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6 text-center sm:text-left">
        <div className="text-lg font-semibold mb-2 border-b border-gray-600 pb-2">
          Alliance Totals
        </div>
        <div className="flex flex-col sm:flex-row justify-center sm:justify-start gap-2 sm:gap-4">
          <span className="font-bold text-green-400">Kills: {totalKills}</span>
          <span className="font-bold text-red-400">Deaths: {totalDeaths}</span>
        </div>
      </div>

      {/* Sorting Buttons */}
      <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mb-6">
        {[
          { key: "pr", label: "Sort by PR" },
          { key: "soloRate", label: "Sort by Solo Rate" },
          { key: "kills", label: "Sort by Kills" },
          { key: "deaths", label: "Sort by Deaths" },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setSortKey(btn.key as SortKey)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
              sortKey === btn.key
                ? "bg-yellow-500 text-black"
                : "bg-gray-700 hover:bg-gray-600 text-yellow-400"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Player Rankings Table */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-2 sm:p-4 overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left">Rank</th>
              <th className="p-2 text-left">Player</th>
              <th className="p-2 text-left">Kills</th>
              <th className="p-2 text-left">Deaths</th>
              <th className="p-2 text-left">Solo Rate</th>
              <th className="p-2 text-left">Power Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, idx) => (
              <tr
                key={p.name}
                className={`hover:bg-gray-700 ${
                  idx % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
                }`}
              >
                <td className="p-2">{idx + 1}</td>
                <td className="p-2 flex items-center gap-2">
                  {p.battlegroup && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold text-black ${
                        p.battlegroup === "BG1"
                          ? "bg-yellow-400"
                          : p.battlegroup === "BG2"
                          ? "bg-blue-400"
                          : "bg-green-400"
                      }`}
                    >
                      {p.battlegroup}
                    </span>
                  )}
                  {p.name}
                </td>
                <td className="p-2 text-green-400 font-semibold">{p.kills}</td>
                <td className="p-2 text-red-400 font-semibold">{p.deaths}</td>
                <td className="p-2 text-blue-400">
                  {((p.kills / ((p.kills + p.deaths) || 1)) * 100).toFixed(
                    2
                  )}
                  %
                </td>
                <td className="p-2 font-bold text-yellow-400">{p.powerRating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
