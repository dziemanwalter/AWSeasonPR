'use client';

import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PlayerStreak {
  name: string;
  highStreak: number;
  currentStreak: number;  // CSV baseline + live kills, reset to 0 on death, then continue accumulating
  totalKills: number;
  totalDeaths: number;
  battlegroup: string;
  isNewHigh: boolean;
  csvBaselineHigh?: number; // Original CSV baseline for comparison
  isHistoricalRecord?: boolean; // Whether this player is only in historical records (not active)
}



export default function KillStreaks() {
  // Data flow:
  // 1. CSV data provides historical baseline (highStreak, totalKills, currentStreak)
  // 2. Live node data adds to currentStreak (accumulating), resets to 0 on death, then continues
  // 3. Live data adds to totalKills/totalDeaths (deaths only come from live data)
  // 4. CSV baseline is preserved unless live data produces better results
  const [playerStreaks, setPlayerStreaks] = useState<PlayerStreak[]>([]);
  const [activeStreaks, setActiveStreaks] = useState<PlayerStreak[]>([]);

  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
     fetchAvailablePlayers();
   }, []);

           const fetchAvailablePlayers = async () => {
      try {
        const res = await fetch('/api/playerData');
        const data = await res.json();
        const players = data.players || [];
        const playerNames = players.map((p: any) => p.name).sort();
        setAvailablePlayers(playerNames);
        
        // Fetch streaks after getting players, passing the full player data for battlegroups
        await fetchStreaks(playerNames, players);
      } catch (err) {
        console.error("Error fetching players:", err);
      }
    };

           const fetchStreaks = async (playerNames?: string[], players?: any[]) => {
    try {
             // Parse CSV data from Streaks.csv
       const csvData = `,,,,,,,
,C.Av Streak Ladder,,,,,,,
,Rank,Summoner,High Streak,Total Streak,,,
,,,,,,,
,1,Hazza,245,245,,,BG3
,2,DT,227,227,,,BG3
,3,Steel,172,172,,,BG3
,4,cas,155,155,,,BG1
,5,Cipw,154,154,,,BG1
,6,Swedeah,134,134,,,BG3
,7,Enculet,130,130,,,BG2
,8,Fort,123,123,,,BG3
,9,Joel,117,117,,,BG2
,9,Voltaic,117,117,,,BG3
,11,Marshy,114,114,,,BG3
,12,Fiery,110,110,,,BG2
,13,Dreamin,106,106,,,BG2
,14,X,104,104,,,BG2
,Centenniel Streaks,,,,,,,
,,,,,,,
,50+ Active Streaks,,,,,,,
,,,,,,,
,,Stone,91,26,,,
,New High,Brawlgate,22,22,,,
,,King BUk,49,17,,,
,,Swan,88,17,,,
,,Fort,123,16,,,
,New High,Chupa,16,16,,,
,,Hazza,245,16,,,
,,Matty,99,16,,,
,New High,Infamous,15,15,,,
,,Fred,61,14,,,
,New High,Nomis,14,14,,,
,,Marshy,114,14,,,
,New High,Dion,13,13,,,
,,Dreamin,106,12,,,
,New High,Andy,12,12,,,
,New High,Sokin,10,10,,,
,,Skywalker,81,10,,,
,New High,Zkittlez,10,10,,,
,,Steel,172,10,,,
,,Retlaw,62,10,,,
,,Cipw,154,9,,,
,New High,Praetor,8,8,,,
,New High,Zefiro,7,7,,,
,,Jay,78,7,,,
,,Avalon,3,6,,,
,,Voltaic,117,5,,,
,,Jenx,70,5,,,
,,Scorpii,30,4,,,
,,Jwill,12,0,,,
,,Forgotten,45,0,,`;

                       const baselinePlayers: PlayerStreak[] = [];
        const csvPlayerMap = new Map<string, PlayerStreak>(); // Use Map to prevent duplicates
        const lines = csvData.split('\n');
        
                 // Parse historical records (lines 1-18) - these are just for the static leaderboard
         let lineIndex = 0;
         for (const line of lines) {
           lineIndex++;
           const columns = line.split(',');
           
           // Skip header lines and empty lines
           if (columns.length < 4 || !columns[2] || columns[2].trim() === '' || 
               columns[2].trim() === 'Summoner' || columns[2].trim() === 'Rank') {
             continue;
           }
           
           const name = columns[2].trim();
           const highStreak = parseInt(columns[3]) || 0;
           const csvCurrentStreak = parseInt(columns[4]) || 0;
           const battlegroup = columns[7]?.trim() || 'Unknown'; // Extract BG from column 7
          
                       // Lines 1-18 are historical records (100+ kills) - use for static leaderboard only
            if (lineIndex <= 18 && highStreak >= 100) {
             if (!csvPlayerMap.has(name) || highStreak > csvPlayerMap.get(name)!.highStreak) {
                csvPlayerMap.set(name, {
                  name,
                  highStreak,
                  currentStreak: 0, // Not used for active streaks
                  totalKills: highStreak,
                  totalDeaths: 0,
                  battlegroup: battlegroup,
                  isNewHigh: false,
                  isHistoricalRecord: true // Mark as historical record only
                });
             }
           }
         }
         
         // Parse current active streaks (lines 19+) - these are baseline for active streaks
         lineIndex = 0;
         for (const line of lines) {
           lineIndex++;
           const columns = line.split(',');
           
           // Skip header lines and empty lines
           if (columns.length < 4 || !columns[2] || columns[2].trim() === '' || 
               columns[2].trim() === 'Summoner' || columns[2].trim() === 'Rank') {
             continue;
           }
           
           const name = columns[2].trim();
           const highStreak = parseInt(columns[3]) || 0;
           const csvCurrentStreak = parseInt(columns[4]) || 0;
           
           // Lines 19+ are current active streaks - use as baseline for active streaks
           if (lineIndex >= 19 && csvCurrentStreak > 0) {
             if (!csvPlayerMap.has(name)) {
               // New player from active streaks section
               csvPlayerMap.set(name, {
                 name,
                 highStreak: Math.max(highStreak, csvCurrentStreak), // Use higher of the two
                 currentStreak: csvCurrentStreak, // This is the baseline current streak
                 totalKills: highStreak, // Use only highStreak for totalKills, not the max
                 totalDeaths: 0,
                 battlegroup: 'Unknown',
                 isNewHigh: false,
                 isHistoricalRecord: false // Mark as active streak player
               });
             } else {
               // Player already exists (from historical records) - update with active streak data
               const existing = csvPlayerMap.get(name)!;
               existing.currentStreak = csvCurrentStreak; // Update with current streak baseline
               // Don't update totalKills for existing players - keep their historical totalKills
             }
           }
         }
        
        // Convert Map back to array
        baselinePlayers.push(...csvPlayerMap.values());
        
        // Update battlegroups from playerData API if available
        if (players && players.length > 0) {
          baselinePlayers.forEach(player => {
            const apiPlayer = players.find((p: any) => p.name === player.name);
            if (apiPlayer && apiPlayer.battlegroup) {
              player.battlegroup = apiPlayer.battlegroup;
            }
          });
        }

      // Live node data
      const nodeRes = await fetch('/api/savePlayerNodes');
      const nodeData = await nodeRes.json();

             const playerMap: Record<string, PlayerStreak> = {};
               baselinePlayers.forEach(player => {
          playerMap[player.name] = { 
            ...player, 
            // Preserve the CSV baseline current streak - this will be the starting point
            // Live data will be added to this baseline
            currentStreak: player.currentStreak || 0, // Keep CSV baseline current streak
            totalKills: player.totalKills || 0, // Use CSV total kills as baseline
            totalDeaths: player.totalDeaths || 0, // Use CSV total deaths as baseline
            isNewHigh: false,
            csvBaselineHigh: player.highStreak // Preserve original CSV high streak for comparison
          };
        });
       

             // Process nodes
       console.log('Processing node data:', nodeData);
       nodeData.forEach((playerNode: any) => {
         const name = playerNode.player;
         console.log(`Processing node for player: ${name}`);
         
         if (!playerMap[name]) {
           // Try to get battlegroup from playerData API
           let battlegroup = 'Unknown';
           if (players && players.length > 0) {
             const apiPlayer = players.find((p: any) => p.name === name);
             if (apiPlayer && apiPlayer.battlegroup) {
               battlegroup = apiPlayer.battlegroup;
             }
           }
           
           playerMap[name] = {
             name,
             highStreak: 0,
             currentStreak: 0,
             totalKills: 0,
             totalDeaths: 0,
             battlegroup,
             isNewHigh: false,
             csvBaselineHigh: 0, // No CSV baseline for new players
           };
         }

         const stats = playerMap[name];
         
                   // Process entries in chronological order to calculate streaks properly
          // Current streak starts from CSV baseline and accumulates live kills
          // Deaths reset the streak to 0, then continue accumulating
          // 
          // Example: CSV baseline = 16, live entries: [kill, kill, death, kill, kill]
          // - Start: currentStreak = 16 (from CSV)
          // - After 2 kills: currentStreak = 18
          // - After death: currentStreak = 0
          // - After 2 more kills: currentStreak = 2
          // - Final result: currentStreak = 2
          let currentStreak = stats.currentStreak || 0; // Start from CSV baseline
         let sessionHighStreak = currentStreak; // Track highest streak during this session
         let liveKills = 0;  // Only the kills from live data
         let liveDeaths = 0; // Only the deaths from live data

         console.log(`Player ${name} entries:`, playerNode.entries);
         console.log(`Player ${name} starting from baseline:`, { 
           csvHighStreak: stats.highStreak, 
           csvCurrentStreak: stats.currentStreak,
           csvTotalKills: stats.totalKills,
           csvTotalDeaths: stats.totalDeaths,
           startingCurrentStreak: currentStreak
         });
         
         playerNode.entries.forEach((entry: any, index: number) => {
           // Each node represents 1 kill (unless it's an empty object)
           const kills = entry.node ? 1 : 0;
           const deaths = entry.deaths || 0;

           liveKills += kills;
           liveDeaths += deaths;

           // Reset streak on death
           if (deaths > 0) {
             console.log(`  Entry ${index}: Death detected, resetting streak from ${currentStreak} to 0`);
             currentStreak = 0;
           } else if (kills > 0) {
             currentStreak += kills;
             console.log(`  Entry ${index}: Kill detected, streak now ${currentStreak}`);
             // Update session high streak if current is higher
             if (currentStreak > sessionHighStreak) {
               sessionHighStreak = currentStreak;
               console.log(`  Entry ${index}: New session high streak: ${sessionHighStreak}`);
             }
           } else {
             console.log(`  Entry ${index}: Empty entry, no change to streak`);
           }
         });

         // Update the current streak - starts from CSV baseline and accumulates live kills
         // Deaths reset it to 0, then continue accumulating
         stats.currentStreak = currentStreak;
         
         // Add live kills/deaths to the CSV baseline totals
         stats.totalKills = (stats.totalKills || 0) + liveKills;
         stats.totalDeaths = liveDeaths; // CSV has no death data, so total deaths = live deaths only

         console.log(`Player ${name} final stats:`, {
           currentStreak: stats.currentStreak,
           totalKills: stats.totalKills,
           totalDeaths: stats.totalDeaths,
           highStreak: stats.highStreak,
           sessionHighStreak: sessionHighStreak,
           liveKills: liveKills,
           liveDeaths: liveDeaths,
           explanation: `Current streak: ${currentStreak} (kills after last death), Session high: ${sessionHighStreak} (highest streak during this session)`
         });

         // Check if current streak exceeds the original CSV baseline
         if (currentStreak > (stats.csvBaselineHigh || 0)) {
           stats.isNewHigh = true;
         }
         
         // Update high streak only if the live session produces a higher streak than the CSV baseline
         // We want to preserve the CSV historical data unless live data is better
         const csvBaseline = stats.csvBaselineHigh || 0;
         const liveBestStreak = Math.max(currentStreak, sessionHighStreak);
         
         // Only update if live data is better than CSV baseline
         if (liveBestStreak > csvBaseline) {
           stats.highStreak = liveBestStreak;
         } else {
           // Keep the CSV baseline high streak
           stats.highStreak = csvBaseline;
         }
         
         // Validate that current streak makes sense
         if (currentStreak > stats.totalKills) {
           console.warn(`Warning: Player ${name} has current streak (${currentStreak}) greater than total kills (${stats.totalKills})`);
         }
         
         // Summary of what we calculated:
         // - currentStreak: CSV baseline + live kills, reset to 0 on death, then continue accumulating
         // - sessionHighStreak: highest streak achieved during this session (including CSV baseline)
         // - highStreak: preserved from CSV baseline unless live data is better
         // - totalKills: CSV baseline + live kills
         // - totalDeaths: live deaths only (CSV has no death data)
         
         console.log(`Player ${name} CSV baseline preserved:`, {
           csvHighStreak: csvBaseline,
           csvTotalKills: stats.totalKills - liveKills,
           csvTotalDeaths: 0 // CSV has no death data
         });
       });

             // Merge CSV baseline with live data for Centenniel Streaks
             // Preserve CSV data but also show new 100+ achievements from live data
             const mergedCentennielData: PlayerStreak[] = [];
             
             // First, add all CSV baseline players with 100+ streaks (historical records)
             baselinePlayers
               .filter(p => p.highStreak >= 100)
               .forEach(player => {
                 mergedCentennielData.push({
                   ...player,
                   // Keep CSV data as-is for historical records
                   totalKills: player.highStreak, // Use highStreak, not inflated totalKills
                   isHistoricalRecord: true
                 });
               });
             
             // Then, check live data for new 100+ streaks
             Object.values(playerMap).forEach(player => {
               if (player.highStreak >= 100) {
                 const existingHistorical = baselinePlayers.find(p => p.name === player.name && p.highStreak >= 100);
                 
                 if (!existingHistorical) {
                   // New player with 100+ streak from live data - add as new entry
                   mergedCentennielData.push({
                     ...player,
                     // For new 100+ streaks, use live data but preserve the achievement
                     totalKills: player.highStreak, // Use highStreak, not total accumulated kills
                     isHistoricalRecord: false
                   });
                 } else if (player.highStreak > existingHistorical.highStreak) {
                   // Existing player with new higher streak from live data - add as new entry
                   mergedCentennielData.push({
                     ...player,
                     // For new higher streaks, use live data but preserve the achievement
                     totalKills: player.highStreak, // Use highStreak, not total accumulated kills
                     isHistoricalRecord: false
                   });
                 }
                 // If existing CSV streak is higher, don't add duplicate (keep historical record only)
               }
             });
             
             const allTimeHighs = mergedCentennielData
               .sort((a, b) => b.highStreak - a.highStreak);   
       
       // Live current data for active streaks
       const allTime = Object.values(playerMap).sort((a, b) => b.highStreak - a.highStreak);
       
               // Create active streaks from playerData players (current alliance members)
        const playersToUse = playerNames || availablePlayers;
        console.log('Players to use:', playersToUse);
        console.log('Player map:', playerMap);
        console.log('Baseline players:', baselinePlayers);
        
                 const active = playersToUse
           .map(playerName => {
             console.log(`Processing player: ${playerName}`);
             
             // First try to get from playerMap (which includes baseline + live data)
             let playerData = playerMap[playerName];
             console.log(`Player data from playerMap:`, playerData);
             
                          // If not in playerMap, check if they exist in baseline CSV
             if (!playerData) {
               const baselinePlayer = baselinePlayers.find(p => p.name === playerName);
               console.log(`Baseline player found:`, baselinePlayer);
               
               if (baselinePlayer) {
                 // Use baseline data and preserve their current streak from CSV
                 playerData = {
                   ...baselinePlayer,
                   currentStreak: baselinePlayer.currentStreak || 0, // Keep CSV current streak
                   totalKills: baselinePlayer.totalKills || 0,      // Keep CSV total kills
                   totalDeaths: baselinePlayer.totalDeaths || 0,    // Keep CSV total deaths
                   isNewHigh: false,
                   csvBaselineHigh: baselinePlayer.highStreak, // Preserve CSV baseline
                 };
               } else {
                  // New player with no baseline data
                  playerData = {
                    name: playerName,
                    highStreak: 0,
                    currentStreak: 0,
                    totalKills: 0,
                    totalDeaths: 0,
                    battlegroup: 'Unknown',
                    isNewHigh: false,
                    csvBaselineHigh: 0, // No CSV baseline
                  };
                }
             }
             
             console.log(`Final player data:`, playerData);
             return playerData;
           })
                       // Don't filter out players with high historical streaks - they can still have current active streaks
           .sort((a, b) => b.currentStreak - a.currentStreak);
        
        console.log('Active streaks result:', active);

       setPlayerStreaks(allTimeHighs);
       setActiveStreaks(active);

    } catch (err) {
      console.error("Error fetching streaks:", err);
    }
  };

     

  const getBattlegroupColor = (bg: string) => {
    switch (bg) {
      case 'BG1': return 'bg-yellow-400 text-black';
      case 'BG2': return 'bg-blue-400 text-black';
      case 'BG3': return 'bg-green-400 text-black';
      default: return 'bg-gray-400 text-black';
    }
  };

     const exportAsImage = async () => {
     if (!contentRef.current) return;
 
           const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '400px'; // Increased width to prevent stacking
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
        if (element.tagName === 'H2') {
          element.style.fontSize = '16px';
          element.style.fontWeight = '600';
          element.style.margin = '0 0 12px 0';
          element.style.padding = '0';
        }
        if (element.tagName === 'H3') {
          element.style.fontSize = '14px';
          element.style.fontWeight = '500';
          element.style.margin = '0 0 8px 0';
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
          element.style.minWidth = '320px';
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
             if (cellIndex === 0) { // Rank/Status column
               element.style.width = '60px';
             } else if (cellIndex === 1) { // Player column
               element.style.width = '120px';
             } else if (cellIndex === 2) { // High Streak column
               element.style.width = '80px';
             } else if (cellIndex === 3) { // Current/Total column
               element.style.width = '80px';
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
          
                     // Special handling for player name cells (2nd column in both tables)
           const parentRow = element.parentElement;
           if (parentRow && parentRow.children) {
             const cellIndex = Array.from(parentRow.children).indexOf(element);
             if (cellIndex === 0) { // Status column (Active Streaks table)
               element.style.whiteSpace = 'nowrap';
               element.style.textAlign = 'center';
               element.style.verticalAlign = 'middle';
             } else if (cellIndex === 1) { // Player name column
               element.style.display = 'flex';
               element.style.alignItems = 'center';
               element.style.gap = '6px';
               element.style.flexWrap = 'nowrap';
               element.style.whiteSpace = 'nowrap';
             }
           }
        }
        
        // Style high streak values with yellow background (matching page design)
        if (element.tagName === 'TD' && element.textContent && 
            /^\d+$/.test(element.textContent.trim()) && 
            parseInt(element.textContent.trim()) > 0) {
          // Check if this is in a row that has a high streak header or is the 3rd column
          const parentRow = element.parentElement;
          if (parentRow && parentRow.children) {
            const cellIndex = Array.from(parentRow.children).indexOf(element);
            // High streak is typically the 3rd column (index 2) in both tables
            if (cellIndex === 2) {
              element.style.backgroundColor = '#fbbf24'; // Yellow background
              element.style.color = '#000000';
              element.style.fontWeight = '600';
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
        if (element.tagName === 'SPAN' && element.textContent?.includes('New High')) {
          element.style.color = '#34d399';
          element.style.fontSize = '10px';
          element.style.fontWeight = '600';
          element.style.whiteSpace = 'nowrap';
          element.style.display = 'inline-block';
          element.style.verticalAlign = 'middle';
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
       link.download = 'kill-streaks-mobile.png';
       link.click();
     } finally {
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
                 

                          {/* All-Time Highs - Historical data from CSV (static) */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-4 overflow-x-auto" data-section="historical-highs">
           <h2 className="text-xl font-semibold mb-3 text-yellow-400">🏆 Centenniel Streaks (100+ Kills)</h2>
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left">Rank</th>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-left">High Streak</th>
                <th className="p-2 text-left">Total Kills</th>
              </tr>
            </thead>
            <tbody>
              {playerStreaks.map((player, idx) => (
                                 <tr key={player.name} className={`hover:bg-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
                   <td className="p-2 text-yellow-400 font-bold">#{idx + 1}</td>
                   <td className="p-2 flex items-center gap-2">
                     <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getBattlegroupColor(player.battlegroup)}`}>
                       {player.battlegroup}
                     </span>
                     {player.name}
                   </td>
                   <td className={`p-2 text-black font-semibold ${idx % 2 === 0 ? 'bg-yellow-400' : 'bg-yellow-500'}`}>{player.highStreak}</td>
                   <td className="p-2">{player.totalKills}</td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>

                 {/* Active Streaks */}
         <div className="bg-gray-800 rounded-lg shadow-lg p-4 overflow-x-auto" data-section="active-streaks">
                     <h2 className="text-xl font-semibold mb-3 text-purple-400">🔥 Active Streaks</h2>
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-left">High Streak</th>
                <th className="p-2 text-left">Current Streak</th>
              </tr>
            </thead>
            <tbody>
              {activeStreaks.map((player, idx) => (
                                 <tr key={player.name} className={`hover:bg-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
                   <td className="p-2">{player.isNewHigh && <span className="text-green-400 text-xs font-semibold">New High</span>}</td>
                   <td className="p-2 flex items-center gap-2">
                     <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getBattlegroupColor(player.battlegroup)}`}>
                       {player.battlegroup}
                     </span>
                     {player.name}
                   </td>
                   <td className={`p-2 text-black font-semibold ${idx % 2 === 0 ? 'bg-yellow-400' : 'bg-yellow-500'}`}>{player.highStreak}</td>
                   <td className="p-2">{player.currentStreak}</td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
