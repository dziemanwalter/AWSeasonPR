"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";

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
  const contentRef = useRef<HTMLDivElement>(null);

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

  const exportAsImage = async () => {
    if (!contentRef.current) return;

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '400px'; // Mobile width
    tempContainer.style.backgroundColor = '#111827';
    tempContainer.style.padding = '12px';
    tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.boxSizing = 'border-box';

    const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;
    clonedContent.style.width = '100%';
    clonedContent.style.maxWidth = '100%';
    clonedContent.style.fontSize = '12px';
    clonedContent.style.color = '#ffffff';

    // Apply mobile-optimized styling that matches the page design
    const applyMobileStyling = (element: HTMLElement) => {
      // Remove all class attributes to avoid oklch issues
      element.removeAttribute('class');
      
      // Apply base styling
      element.style.backgroundColor = '#111827';
      element.style.color = '#ffffff';
      element.style.margin = '0';
      element.style.padding = '0';
      element.style.borderRadius = '0';
      element.style.border = 'none';
      element.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      
      // Special styling for specific elements
      if (element.tagName === 'H1') {
        element.style.fontSize = '18px';
        element.style.fontWeight = '700';
        element.style.margin = '0 0 16px 0';
        element.style.padding = '0';
        element.style.textAlign = 'center';
        element.style.color = '#fbbf24';
      }
      if (element.tagName === 'H2') {
        element.style.fontSize = '16px';
        element.style.fontWeight = '600';
        element.style.margin = '0 0 12px 0';
        element.style.padding = '0';
      }
      if (element.tagName === 'DIV' && element.getAttribute('data-section')) {
        element.style.backgroundColor = '#1f2937';
        element.style.borderRadius = '8px';
        element.style.padding = '12px';
        element.style.margin = '0 0 16px 0';
        element.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }
      if (element.tagName === 'TABLE') {
        element.style.width = '100%';
        element.style.borderCollapse = 'collapse';
        element.style.fontSize = '11px';
        element.style.margin = '0';
        element.style.tableLayout = 'fixed';
        element.style.minWidth = '360px';
      }
      if (element.tagName === 'TH') {
        element.style.backgroundColor = '#374151';
        element.style.fontWeight = '600';
        element.style.padding = '6px 8px';
        element.style.border = 'none';
        element.style.textAlign = 'left';
        element.style.fontSize = '11px';
        
        // Set specific column widths for better layout
        const parentRow = element.parentElement;
        if (parentRow && parentRow.children) {
          const cellIndex = Array.from(parentRow.children).indexOf(element);
          if (cellIndex === 0) { // Rank column
            element.style.width = '40px';
          } else if (cellIndex === 1) { // Player column
            element.style.width = '140px';
          } else if (cellIndex === 2) { // K column
            element.style.width = '40px';
          } else if (cellIndex === 3) { // D column
            element.style.width = '40px';
          } else if (cellIndex === 4) { // Solo% column
            element.style.width = '60px';
          } else if (cellIndex === 5) { // PR column
            element.style.width = '60px';
          }
        }
      }
      if (element.tagName === 'TD') {
        element.style.padding = '6px 8px';
        element.style.border = 'none';
        element.style.textAlign = 'left';
        element.style.fontSize = '11px';
        element.style.backgroundColor = 'transparent';
        element.style.whiteSpace = 'nowrap';
        element.style.verticalAlign = 'middle';
        
        // Special handling for player name cells (2nd column)
        const parentRow = element.parentElement;
        if (parentRow && parentRow.children) {
          const cellIndex = Array.from(parentRow.children).indexOf(element);
          if (cellIndex === 1) { // Player name column
            element.style.display = 'flex';
            element.style.alignItems = 'center';
            element.style.gap = '6px';
            element.style.flexWrap = 'nowrap';
            element.style.whiteSpace = 'nowrap';
          }
        }
        
        // Preserve your exact font colors for different columns
        if (parentRow && parentRow.children) {
          const cellIndex = Array.from(parentRow.children).indexOf(element);
          if (cellIndex === 2) { // Kills column - green
            element.style.color = '#34d399'; // text-green-400
          } else if (cellIndex === 3) { // Deaths column - red
            element.style.color = '#f87171'; // text-red-400
          } else if (cellIndex === 4) { // Solo% column - blue
            element.style.color = '#60a5fa'; // text-blue-400
          } else if (cellIndex === 5) { // PR column - yellow
            element.style.color = '#fbbf24'; // text-yellow-400
          }
        }
      }
      
      if (element.tagName === 'TR') {
        element.style.borderBottom = '1px solid #374151';
        
        // Add alternating row colors to match page design
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
        element.style.backgroundColor = element.textContent.includes('BG1') ? '#fbbf24' : 
                                     element.textContent.includes('BG2') ? '#60a5fa' : 
                                     element.textContent.includes('BG3') ? '#34d399' : '#9ca3af';
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
        element.style.color = '#fbbf24';
        element.style.fontWeight = '700';
      }
      
              // Style rank numbers (cells starting with #)
        if (element.tagName === 'TD' && element.textContent && element.textContent.includes('#')) {
          element.style.color = '#fbbf24';
          element.style.fontWeight = '700';
        }
        
        // Preserve font weights for specific columns
        if (element.tagName === 'TD') {
          const parentRow = element.parentElement;
          if (parentRow && parentRow.children) {
            const cellIndex = Array.from(parentRow.children).indexOf(element);
            if (cellIndex === 2 || cellIndex === 3) { // Kills and Deaths columns
              element.style.fontWeight = '600'; // font-semibold
            } else if (cellIndex === 5) { // PR column
              element.style.fontWeight = '700'; // font-bold
            }
          }
        }
      if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'BUTTON') {
        element.style.display = 'none';
      }
      if (element.tagName === 'LABEL') {
        element.style.display = 'none';
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
        scale: 3,
        useCORS: true,
        width: 400,
        height: tempContainer.scrollHeight,
        backgroundColor: '#111827',
      });

      const dataURL = canvas.toDataURL('image/png', 0.9);
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'pr-season-stats-mobile.png';
      link.click();
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

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
        {/* Button to Kill Streaks */}
        <Link href="/kill-streaks" className="ml-2">
          <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-800 text-white font-semibold transition-colors">
            Kill Streaks
          </button>
        </Link>
        {/* Button to Spreadsheet */}
        <Link href="/spreadsheet" className="ml-2">
          <button className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-800 text-white font-semibold transition-colors">
            K/D Entry Page
          </button>
        </Link>
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
      <div ref={contentRef} className="bg-gray-800 rounded-lg shadow-lg p-2 sm:p-4 overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left">Rank</th>
              <th className="p-2 text-left">Player</th>
              <th className="p-2 text-left">K</th>
              <th className="p-2 text-left">D</th>
              <th className="p-2 text-left">Solo%</th>
              <th className="p-2 text-left">PR</th>
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
                  <span className="truncate max-w-[80px] sm:max-w-none">{p.name}</span>
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

      {/* Export Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={exportAsImage}
          className="px-6 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold transition-colors shadow-lg"
        >
          📱 Export Mobile Image
        </button>
      </div>
    </main>
  );
}
