'use client';

import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';

interface Player {
  name: string;
  kills: number;
  deaths: number;
  powerRating?: number;
  difficultyRatingPerFight?: number;
  battlegroup: string;
}

interface BGTotals {
  totalKills: number;
  totalDeaths: number;
  totalPR: number;
  avgSoloRate: number;
  rank?: number;
}

interface BattlegroupTotals {
  battlegroup: string;
  totalKills: number;
  totalDeaths: number;
  totalPR: number;
  avgSoloRate: number;
  playerCount: number;
  visiblePlayerCount: number;
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
  const [battlegroupTotals, setBattlegroupTotals] = useState<BattlegroupTotals[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch visible players for rankings
        const playersRes = await fetch('/api/playerData');
        const playersData = await playersRes.json();
        setPlayers(playersData.players || []);

        // Fetch battlegroup totals (including hidden players)
        const totalsRes = await fetch('/api/battlegroupData');
        const totalsData = await totalsRes.json();
        setBattlegroupTotals(totalsData.battlegroupTotals || []);
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

  // Get totals from API (including hidden players)
  const getBattlegroupTotals = (bg: string): BGTotals => {
    const apiTotals = battlegroupTotals.find(t => t.battlegroup === bg);
    if (apiTotals) {
      return {
        totalKills: apiTotals.totalKills,
        totalDeaths: apiTotals.totalDeaths,
        totalPR: apiTotals.totalPR,
        avgSoloRate: apiTotals.avgSoloRate,
      };
    }
    // Fallback to visible players calculation if API data not available
    const group = groupPlayers(bg);
    const totalKills = group.reduce((sum, p) => sum + p.kills, 0);
    const totalDeaths = group.reduce((sum, p) => sum + p.deaths, 0);
    const totalPR = group.reduce((sum, p) => sum + (p.powerRating || 0), 0);
    const avgSoloRate =
      group.reduce((sum, p) => sum + p.kills / (p.kills + p.deaths || 1), 0) /
      group.length;
    return { totalKills, totalDeaths, totalPR, avgSoloRate };
  };

  // Compute totals and assign ranks using API data
  const totalsWithRanks = battlegroups
    .map((bg) => ({ bg, ...getBattlegroupTotals(bg) }))
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
    
    // Remove all class attributes to avoid oklch issues
    const removeClasses = (element: HTMLElement) => {
      element.removeAttribute('class');
      Array.from(element.children).forEach(child => {
        if (child instanceof HTMLElement) {
          removeClasses(child);
        }
      });
    };
    
    removeClasses(clonedContent);
    
    // Apply comprehensive styling to avoid oklch issues
    const applyMobileStyling = (element: HTMLElement) => {
      // Apply base styling
      element.style.backgroundColor = '#111827';
      element.style.color = '#ffffff';
      element.style.margin = '0';
      element.style.padding = '0';
      element.style.borderRadius = '0';
      element.style.border = 'none';
      element.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      
      // Special styling for specific elements
      if (element.tagName === 'H2') {
        element.style.fontSize = '16px';
        element.style.fontWeight = '600';
        element.style.margin = '0 0 8px 0';
        element.style.padding = '0';
        element.style.color = '#facc15'; // yellow-400
      }
      if (element.tagName === 'DIV' && element.getAttribute('data-section')) {
        element.style.backgroundColor = '#1f2937'; // gray-800
        element.style.borderRadius = '8px';
        element.style.padding = '8px';
        element.style.margin = '0 0 12px 0';
        element.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }
      if (element.tagName === 'TABLE') {
        element.style.width = '100%';
        element.style.borderCollapse = 'collapse';
        element.style.fontSize = '10px';
        element.style.margin = '0';
        element.style.tableLayout = 'fixed';
      }
      if (element.tagName === 'TH') {
        element.style.backgroundColor = '#374151'; // gray-700
        element.style.fontWeight = '600';
        element.style.padding = '4px 2px';
        element.style.border = 'none';
        element.style.textAlign = 'left';
        element.style.fontSize = '10px';
        
        // Set specific column widths for better layout
        const parentRow = element.parentElement;
        if (parentRow && parentRow.children) {
          const cellIndex = Array.from(parentRow.children).indexOf(element);
          if (cellIndex === 0) { // Rank column
            element.style.width = '30px';
          } else if (cellIndex === 1) { // Player column
            element.style.width = '150px';
          } else if (cellIndex === 2) { // K column
            element.style.width = '25px';
          } else if (cellIndex === 3) { // D column
            element.style.width = '25px';
          } else if (cellIndex === 4) { // Solo% column
            element.style.width = '45px';
          } else if (cellIndex === 5) { // PR column
            element.style.width = '45px';
          } else if (cellIndex === 6) { // DR/Fight column
            element.style.width = '50px';
          }
        }
      }
      if (element.tagName === 'TD') {
        element.style.padding = '4px 2px';
        element.style.border = 'none';
        element.style.textAlign = 'left';
        element.style.fontSize = '10px';
        element.style.backgroundColor = 'transparent';
        element.style.whiteSpace = 'nowrap';
        element.style.verticalAlign = 'middle';
        
        // Set specific column widths and handle player name overflow
        const parentRow = element.parentElement;
        if (parentRow && parentRow.children) {
          const cellIndex = Array.from(parentRow.children).indexOf(element);
          if (cellIndex === 0) { // Rank column
            element.style.width = '30px';
          } else if (cellIndex === 1) { // Player column
            element.style.width = '150px';
            element.style.overflow = 'hidden';
            element.style.textOverflow = 'ellipsis';
          } else if (cellIndex === 2) { // K column
            element.style.width = '25px';
            element.style.color = '#4ade80'; // text-green-400
          } else if (cellIndex === 3) { // D column
            element.style.width = '25px';
            element.style.color = '#f87171'; // text-red-400
          } else if (cellIndex === 4) { // Solo% column
            element.style.width = '45px';
            element.style.color = '#60a5fa'; // text-blue-400
          } else if (cellIndex === 5) { // PR column
            element.style.width = '45px';
            element.style.color = '#facc15'; // text-yellow-400
          } else if (cellIndex === 6) { // DR/Fight column
            element.style.width = '50px';
            element.style.color = '#a855f7'; // text-purple-400
          }
        }
      }
      if (element.tagName === 'TR') {
        element.style.borderBottom = '1px solid #374151';
        
        // Add alternating row colors
        const parentTable = element.parentElement?.parentElement;
        if (parentTable && parentTable.tagName === 'TABLE') {
          const rowIndex = Array.from(parentTable.children).indexOf(element.parentElement);
          if (rowIndex > 0) { // Skip header row
            const isEvenRow = (rowIndex - 1) % 2 === 0;
            element.style.backgroundColor = isEvenRow ? '#111827' : '#1f2937';
          }
        }
      }
      if (element.tagName === 'SPAN' && element.textContent?.includes('BG')) {
        element.style.backgroundColor = element.textContent.includes('BG1') ? '#facc15' : 
                                     element.textContent.includes('BG2') ? '#60a5fa' : 
                                     element.textContent.includes('BG3') ? '#4ade80' : '#9ca3af';
        element.style.color = '#000000';
        element.style.padding = '2px 6px';
        element.style.borderRadius = '12px';
        element.style.fontSize = '10px';
        element.style.fontWeight = '600';
        element.style.marginRight = '6px';
        element.style.display = 'inline-block';
        element.style.verticalAlign = 'middle';
        element.style.minWidth = '32px';
        element.style.height = '20px';
        element.style.boxSizing = 'border-box';
        element.style.whiteSpace = 'nowrap';
      }
      if (element.tagName === 'SPAN' && element.textContent?.includes('#')) {
        element.style.color = '#facc15'; // yellow-400
        element.style.fontWeight = '700';
      }
      
      // Style rank numbers (cells starting with #)
      if (element.tagName === 'TD' && element.textContent && element.textContent.includes('#')) {
        element.style.color = '#facc15'; // yellow-400
        element.style.fontWeight = '700';
      }
      
      // Preserve font weights for specific columns
      if (element.tagName === 'TD') {
        const parentRow = element.parentElement;
        if (parentRow && parentRow.children) {
          const cellIndex = Array.from(parentRow.children).indexOf(element);
          if (cellIndex === 2 || cellIndex === 3) { // Kills and Deaths columns
            element.style.fontWeight = '600';
          } else if (cellIndex === 5) { // PR column
            element.style.fontWeight = '700';
          } else if (cellIndex === 6) { // DR/Fight column
            element.style.fontWeight = '600';
          }
        }
      }
      
      // Process child elements
      Array.from(element.children).forEach(child => {
        if (child instanceof HTMLElement) {
          applyMobileStyling(child);
        }
      });
    };

    applyMobileStyling(clonedContent);
    
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
    <div className="p-4 sm:p-6">
      <div className="flex justify-end items-center mb-4">
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
                <th className="p-1 sm:p-2 text-left text-xs">TDR/Fight</th>
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
                  <td className="p-1 sm:p-2 text-purple-400 font-semibold text-xs">
                    {player.difficultyRatingPerFight?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {battlegroups.map((bg) => {
          const group = groupPlayers(bg);
          const totals = getBattlegroupTotals(bg);
          const rank = getRank(bg);
          const apiTotals = battlegroupTotals.find(t => t.battlegroup === bg);

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
                    <th className="p-1 sm:p-2 text-left text-xs">DR/Fight</th>
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
                      <td className="p-1 sm:p-2 text-purple-400 font-semibold text-xs">
                        {p.difficultyRatingPerFight?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gray-700 font-semibold">
                    <td className="p-1 sm:p-2 text-xs">—</td>
                    <td className="p-1 sm:p-2 text-xs">
                      Totals / Avg
                      {apiTotals && apiTotals.playerCount > apiTotals.visiblePlayerCount && (
                        <span className="text-gray-400 text-xs ml-1">
                          ({apiTotals.visiblePlayerCount}/{apiTotals.playerCount} players)
                        </span>
                      )}
                    </td>
                    <td className="p-1 sm:p-2 text-green-400 text-xs">{totals.totalKills}</td>
                    <td className="p-1 sm:p-2 text-red-400 text-xs">{totals.totalDeaths}</td>
                    <td className="p-1 sm:p-2 text-blue-400 text-xs">
                      {(totals.avgSoloRate * 100).toFixed(1)}%
                    </td>
                    <td className="p-1 sm:p-2 text-yellow-400 text-xs">
                      {totals.totalPR.toFixed(1)}
                    </td>
                    <td className="p-1 sm:p-2 text-purple-400 text-xs">
                      —
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
