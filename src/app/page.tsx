"use client";

import { useEffect, useState } from "react";

interface NodeData {
  nodeNumber: string;
  nodeValue: string;
  killBonus: string;
  deathPenalty: string;
}

interface Player {
  name: string;
  kills: number;
  deaths: number;
  killsPerNode: Record<string, number>;
  deathsPerNode: Record<string, number>;
  powerRating?: number;
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalAllianceKills, setTotalAllianceKills] = useState(0);
  const [totalAllianceDeaths, setTotalAllianceDeaths] = useState(0);

  // Example node values CSV (replace with your actual CSV node values)
  const nodeValues: NodeData[] = Array.from({ length: 50 }, (_, i) => ({
    nodeNumber: (i + 1).toString(),
    nodeValue: "1.5",
    killBonus: "0.5",
    deathPenalty: "0.1"
  }));

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/playerData");
      const data = await res.json();

      // Compute power rating per player
      const playersWithPR = data.players.map((player: Player) => {
        let totalKillRating = 0;
        nodeValues.forEach((node) => {
          const nodeVal = parseFloat(node.nodeValue) || 0;
          const deathPenalty = parseFloat(node.deathPenalty) || 0;
          const kills = player.killsPerNode[node.nodeNumber] || 0;
          const deaths = player.deathsPerNode[node.nodeNumber] || 0;
          totalKillRating += nodeVal * kills - deathPenalty * deaths;
        });

        const playerSoloRate = player.kills / (player.kills + player.deaths);
        const allianceSoloRate = data.totalAllianceKills / (data.totalAllianceKills + data.totalAllianceDeaths);
        const soloRateBonus = playerSoloRate - allianceSoloRate;

        return { ...player, powerRating: parseFloat((totalKillRating + soloRateBonus).toFixed(2)) };
      });

      // Sort by highest PR
      playersWithPR.sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0));

      setPlayers(playersWithPR);
      setTotalAllianceKills(data.totalAllianceKills);
      setTotalAllianceDeaths(data.totalAllianceDeaths);
    };

    fetchData();
  }, []);

  return (
    <main className="min-h-screen p-8 bg-blue-200">
      <h1 className="text-3xl font-bold mb-4">PR Season Stats</h1>

      <div className="mb-4">
        <strong>Total Alliance Kills:</strong> {totalAllianceKills} | 
        <strong>Total Alliance Deaths:</strong> {totalAllianceDeaths}
      </div>

      <table className="table-auto border-collapse border border-gray-400 w-full bg-white text-gray-800">
  <thead>
    <tr className="bg-gray-100 text-gray-800">
      <th className="border px-2 py-1">Rank</th>
      <th className="border px-2 py-1">Player</th>
      <th className="border px-2 py-1">Kills</th>
      <th className="border px-2 py-1">Deaths</th>
      <th className="border px-2 py-1">Power Rating</th>
    </tr>
  </thead>
  <tbody className="text-gray-800">
    {players.map((p, idx) => (
      <tr key={idx}>
        <td className="border px-2 py-1">{idx + 1}</td> {/* Ranking */}
        <td className="border px-2 py-1">{p.name}</td>
        <td className="border px-2 py-1">{p.kills}</td>
        <td className="border px-2 py-1">{p.deaths}</td>
        <td className="border px-2 py-1">{p.powerRating}</td>
      </tr>
    ))}
  </tbody>
</table>
    </main>
  );
}
