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

  // Get top 5 players by power rating across all battlegroups
  const top5Players = players
    .sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0))
    .slice(0, 5)
    .map((player, idx) => ({ ...player, globalRank: idx + 1 }));

  // Export as PNG
  const exportAsImage = async () => {
    if (!contentRef.current) return;
    
    // Create a temporary container for mobile-optimized export
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '375px'; // Mobile width
    tempContainer.style.backgroundColor = '#111827'; // bg-gray-900
    tempContainer.style.padding = '16px';
    tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    // Convert Tailwind colors to hex values for html2canvas compatibility
    const colorMap = {
      'bg-gray-800': '#1f2937',
      'bg-gray-900': '#111827',
      'bg-gray-700': '#374151',
      'text-green-400': '#4ade80',
      'text-red-400': '#f87171',
      'text-blue-400': '#60a5fa',
      'text-yellow-400': '#facc15',
      'bg-yellow-400': '#facc15',
      'bg-blue-400': '#60a5fa',
      'bg-green-400': '#4ade80',
      'text-white': '#ffffff',
    };
    
    // Clone the content and apply mobile styles
    const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;
    clonedContent.style.width = '100%';
    clonedContent.style.maxWidth = '100%';
    clonedContent.style.fontSize = '12px';
    clonedContent.style.color = '#ffffff'; // Set default text color to white
    
    // Remove truncation classes and max-width constraints for export
    const truncatedElements = clonedContent.querySelectorAll('.truncate, [class*="max-w-"]');
    truncatedElements.forEach(element => {
      const el = element as HTMLElement;
      el.classList.remove('truncate');
      el.style.maxWidth = 'none';
      el.style.overflow = 'visible';
      el.style.textOverflow = 'unset';
      el.style.whiteSpace = 'normal';
    });
    
    // Replace Tailwind classes with hex colors
    Object.entries(colorMap).forEach(([className, hexColor]) => {
      const elements = clonedContent.querySelectorAll(`.${className}`);
      elements.forEach(element => {
        const el = element as HTMLElement;
        if (className.startsWith('bg-')) {
          el.style.backgroundColor = hexColor;
        } else if (className.startsWith('text-')) {
          el.style.color = hexColor;
        }
      });
    });
    
    // Apply mobile styles to tables
    const tables = clonedContent.querySelectorAll('table');
    tables.forEach(table => {
      table.style.fontSize = '10px';
      table.style.width = '100%';
      table.style.minWidth = '100%';
    });
    
    // Apply mobile styles to table cells
    const cells = clonedContent.querySelectorAll('td, th');
    cells.forEach(cell => {
      (cell as HTMLElement).style.padding = '4px 2px';
      (cell as HTMLElement).style.fontSize = '10px';
    });
    
    // Apply mobile styles to headings
    const headings = clonedContent.querySelectorAll('h2');
    headings.forEach(heading => {
      heading.style.fontSize = '16px';
      heading.style.marginBottom = '8px';
    });
    
    // Apply mobile styles to containers
    const containers = clonedContent.querySelectorAll('.bg-gray-800');
    containers.forEach(container => {
      (container as HTMLElement).style.padding = '8px';
      (container as HTMLElement).style.marginBottom = '12px';
    });
    
    tempContainer.appendChild(clonedContent);
    document.body.appendChild(tempContainer);
    
    try {
      const canvas = await html2canvas(tempContainer, {
        scale: 3, // Higher scale for better quality on mobile
        useCORS: true,
        width: 375,
        height: tempContainer.scrollHeight,
        backgroundColor: '#111827',
      });
      
      const dataURL = canvas.toDataURL('image/png', 0.9);
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'battle-groups-mobile.png';
      link.click();
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
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
          Export Mobile Image
        </Button>
      </div>

      <div ref={contentRef} className="flex flex-col gap-6">
        {/* Top 5 Global Rankings */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-3 text-yellow-400">🏆 Top 5 Global Rankings</h2>
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-1 sm:p-2 text-left text-xs">Rank</th>
                <th className="p-1 sm:p-2 text-left text-xs">Player</th>
                <th className="p-1 sm:p-2 text-left text-xs">K</th>
                <th className="p-1 sm:p-2 text-left text-xs">D</th>
                <th className="p-1 sm:p-2 text-left text-xs">Solo%</th>
                <th className="p-1 sm:p-2 text-left text-xs">PR</th>
              </tr>
            </thead>
            <tbody>
              {top5Players.map((player) => (
                <tr
                  key={player.name}
                  className={`hover:bg-gray-700 ${
                    player.globalRank % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'
                  }`}
                >
                  <td className="p-1 sm:p-2 text-yellow-400 font-bold text-xs">#{player.globalRank}</td>
                  <td className="p-1 sm:p-2 flex items-center gap-1 sm:gap-2 text-xs">
                    <span
                      className={`px-1 sm:px-2 py-0.5 rounded-full text-xs font-semibold text-black ${
                        player.battlegroup === 'BG1'
                          ? 'bg-yellow-400'
                          : player.battlegroup === 'BG2'
                            ? 'bg-blue-400'
                            : 'bg-green-400'
                      }`}
                    >
                      {player.battlegroup}
                    </span>
                    <span className="truncate max-w-[80px] sm:max-w-none">{player.name}</span>
                  </td>
                  <td className="p-1 sm:p-2 text-green-400 font-semibold text-xs">
                    {player.kills}
                  </td>
                  <td className="p-1 sm:p-2 text-red-400 font-semibold text-xs">
                    {player.deaths}
                  </td>
                  <td className="p-1 sm:p-2 text-blue-400 text-xs">
                    {((player.kills / (player.kills + player.deaths || 1)) * 100).toFixed(1)}%
                  </td>
                  <td className="p-1 sm:p-2 font-bold text-yellow-400 text-xs">
                    {player.powerRating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {battlegroups.map((bg) => {
          const group = groupPlayers(bg);
          const totals = calculateTotals(group);
          const rank = getRank(bg);

          return (
            <div
              key={bg}
              className="bg-gray-800 rounded-lg shadow-lg p-4 overflow-x-auto"
            >
              <h2 className="text-xl font-semibold mb-3">
                {bg} - {formatRank(rank)} Place
              </h2>
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead className="bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="p-1 sm:p-2 text-left text-xs">Rank</th>
                    <th className="p-1 sm:p-2 text-left text-xs">Player</th>
                    <th className="p-1 sm:p-2 text-left text-xs">K</th>
                    <th className="p-1 sm:p-2 text-left text-xs">D</th>
                    <th className="p-1 sm:p-2 text-left text-xs">Solo%</th>
                    <th className="p-1 sm:p-2 text-left text-xs">PR</th>
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
                      <td className="p-1 sm:p-2 text-xs">{idx + 1}</td>
                      <td className="p-1 sm:p-2 flex items-center gap-1 sm:gap-2 text-xs">
                        <span
                          className={`px-1 sm:px-2 py-0.5 rounded-full text-xs font-semibold text-black ${
                            p.battlegroup === 'BG1'
                              ? 'bg-yellow-400'
                              : p.battlegroup === 'BG2'
                                ? 'bg-blue-400'
                                : 'bg-green-400'
                          }`}
                        >
                          {p.battlegroup}
                        </span>
                        <span className="truncate max-w-[80px] sm:max-w-none">{p.name}</span>
                      </td>
                      <td className="p-1 sm:p-2 text-green-400 font-semibold text-xs">
                        {p.kills}
                      </td>
                      <td className="p-1 sm:p-2 text-red-400 font-semibold text-xs">
                        {p.deaths}
                      </td>
                      <td className="p-1 sm:p-2 text-blue-400 text-xs">
                        {((p.kills / (p.kills + p.deaths || 1)) * 100).toFixed(1)}%
                      </td>
                      <td className="p-1 sm:p-2 font-bold text-yellow-400 text-xs">
                        {p.powerRating}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gray-700 font-semibold">
                    <td className="p-1 sm:p-2 text-xs">—</td>
                    <td className="p-1 sm:p-2 text-xs">Totals / Avg</td>
                    <td className="p-1 sm:p-2 text-green-400 text-xs">{totals.totalKills}</td>
                    <td className="p-1 sm:p-2 text-red-400 text-xs">{totals.totalDeaths}</td>
                    <td className="p-1 sm:p-2 text-blue-400 text-xs">
                      {(totals.avgSoloRate * 100).toFixed(1)}%
                    </td>
                    <td className="p-1 sm:p-2 text-yellow-400 text-xs">
                      {totals.totalPR.toFixed(1)}
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
