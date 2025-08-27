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

type SortKey = "pr" | "soloRate" | "kills" | "deaths";

export default function SeasonStats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalKills, setTotalKills] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("pr");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const playerRes = await fetch("/api/playerData");
        const playerData = await playerRes.json();

        const nodeRes = await fetch("/api/nodeValues");
        const nodeValues: NodeData[] = await nodeRes.json();

        const playersWithPR = playerData.players.map((player: Player) => {
          let totalKillRating = 0;
          nodeValues.forEach((node) => {
            const nodeVal = parseFloat(node.nodeValue) || 0;
            const deathPenalty = parseFloat(node.deathPenalty) || 0;
            const kills = player.killsPerNode[node.nodeNumber] || 0;
            const deaths = player.deathsPerNode[node.nodeNumber] || 0;
            totalKillRating += nodeVal * kills - deathPenalty * deaths;
          });

          const playerSoloRate = player.kills / ((player.kills + player.deaths) || 1);
          const allianceSoloRate = playerData.totalAllianceKills / ((playerData.totalAllianceKills + playerData.totalAllianceDeaths) || 1);
          const soloRateBonus = totalKillRating * (playerSoloRate - allianceSoloRate) * 1.6;

          return {
            ...player,
            powerRating: parseFloat((totalKillRating + soloRateBonus).toFixed(2)),
          };
        });

        setPlayers(playersWithPR);
        setTotalKills(playerData.totalAllianceKills);
        setTotalDeaths(playerData.totalAllianceDeaths);
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
    <main>
      <h1>PR Season Stats</h1>

      <div className="card">
        <div className="card-header">Alliance Totals</div>
        <div>
          <strong>Kills:</strong> {totalKills} | <strong>Deaths:</strong> {totalDeaths}
        </div>
      </div>

      <div className="button-group">
        <button onClick={() => setSortKey("pr")}>Sort by PR</button>
        <button onClick={() => setSortKey("soloRate")}>Sort by Solo Rate</button>
        <button onClick={() => setSortKey("kills")}>Sort by Kills</button>
        <button onClick={() => setSortKey("deaths")}>Sort by Deaths</button>
      </div>

      <div className="card">
        <div className="card-header">Player Rankings</div>
        <table className="table-auto">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Kills</th>
              <th>Deaths</th>
              <th>Solo Rate</th>
              <th>Power Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{p.name}</td>
                <td>{p.kills}</td>
                <td>{p.deaths}</td>
                <td>
                  {(p.kills + p.deaths > 0
                    ? ((p.kills / (p.kills + p.deaths)) * 100).toFixed(2) + "%"
                    : "0.00%")}
                </td>
                <td className={sortKey === "pr" ? "pr-highlight" : ""}>{p.powerRating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
