'use client';

import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Player {
  name: string;
  kills: number;
  deaths: number;
  powerRating?: number;
  battlegroup: string;
}

interface BGTotals {
  totalKills: number;
  totalDeaths: number;
  totalPR: number;
  avgSoloRate: number;
  rank?: number;
}

const formatRank = (rank?: number) => {
  if (!rank) return '—';
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return rank + 'th';
};

export default function BattleGroups() {
  const [players, setPlayers] = useState<Player[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/playerData');
        const data = await res.json();
        setPlayers(data.players || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const battlegroups = ['BG1', 'BG2', 'BG3'];

  // Group players by BG
  const groupPlayers = (bg: string) =>
    players
      .filter((p) => p.battlegroup === bg)
      .sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0));

  // Calculate totals for a BG
  const calculateTotals = (group: Player[]): BGTotals => {
    const totalKills = group.reduce((sum, p) => sum + p.kills, 0);
    const totalDeaths = group.reduce((sum, p) => sum + p.deaths, 0);
    const totalPR = group.reduce((sum, p) => sum + (p.powerRating || 0), 0);
    const avgSoloRate =
      group.reduce((sum, p) => sum + p.kills / (p.kills + p.deaths || 1), 0) /
      group.length;
    return { totalKills, totalDeaths, totalPR, avgSoloRate };
  };

  // Compute totals and assign ranks
  const totalsWithRanks = battlegroups
    .map((bg) => ({ bg, ...calculateTotals(groupPlayers(bg)) }))
    .sort((a, b) => b.totalPR - a.totalPR)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const getRank = (bg: string) =>
    totalsWithRanks.find((t) => t.bg === bg)?.rank;

  // Export as PNG
  const exportAsImage = async () => {
    if (!contentRef.current) return;
    const canvas = await html2canvas(contentRef.current, {
      scale: 2,
      useCORS: true,
    });
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'battle-groups.png';
    link.click();
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="flex justify-between items-left mb-4">
        <Link href="/">
          <Button variant="outline">← Back to Home</Button>
        </Link>
        <Button
          onClick={exportAsImage}
          className="bg-yellow-500 text-black hover:bg-yellow-400"
        >
          Export as Image
        </Button>
      </div>

      <div ref={contentRef} className="flex flex-col gap-6">
        {battlegroups.map((bg) => {
          const group = groupPlayers(bg);
          const totals = calculateTotals(group);
          const rank = getRank(bg);

          return (
            <div
              key={bg}
              className="bg-gray-800 rounded-lg shadow-lg p-4 overflow-x-auto"
            >
              <h2 className="text-xl font-semibold mb-3">{bg}</h2>
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
                  {group.map((p, idx) => (
                    <tr
                      key={p.name}
                      className={`hover:bg-gray-700 ${
                        idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'
                      }`}
                    >
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold text-black ${
                            p.battlegroup === 'BG1'
                              ? 'bg-yellow-400'
                              : p.battlegroup === 'BG2'
                                ? 'bg-blue-400'
                                : 'bg-green-400'
                          }`}
                        >
                          {p.battlegroup}
                        </span>
                        {p.name}
                      </td>
                      <td className="p-2 text-green-400 font-semibold">
                        {p.kills}
                      </td>
                      <td className="p-2 text-red-400 font-semibold">
                        {p.deaths}
                      </td>
                      <td className="p-2 text-blue-400">
                        {((p.kills / (p.kills + p.deaths || 1)) * 100).toFixed(
                          2,
                        )}
                        %
                      </td>
                      <td className="p-2 font-bold text-yellow-400">
                        {p.powerRating}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gray-700 font-semibold">
                    <td className="p-2 text-yellow-400">{formatRank(rank)}</td>
                    <td className="p-2">Totals / Average</td>
                    <td className="p-2 text-green-400">{totals.totalKills}</td>
                    <td className="p-2 text-red-400">{totals.totalDeaths}</td>
                    <td className="p-2 text-blue-400">
                      {(totals.avgSoloRate * 100).toFixed(2)}%
                    </td>
                    <td className="p-2 text-yellow-400">
                      {totals.totalPR.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </main>
  );
}
