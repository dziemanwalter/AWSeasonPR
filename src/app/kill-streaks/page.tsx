'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
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
  warStreaks?: Record<number, number>; // Streaks per war (1-12)
}



export default function KillStreaks() {
  // Data flow:
  // 1. CSV data provides historical baseline (highStreak, totalKills, currentStreak)
  // 2. Live node data adds to currentStreak (accumulating), resets to 0 on death, then continues
  // 3. Live data adds to totalKills/totalDeaths (deaths only come from live data)
  // 4. CSV baseline is preserved unless live data produces better results
  const [playerStreaks, setPlayerStreaks] = useState<PlayerStreak[]>([]);
  const [activeStreaks, setActiveStreaks] = useState<PlayerStreak[]>([]);
  const [selectedWar, setSelectedWar] = useState<number | "all" | "unassigned">("all");
  const [selectedSeason, setSelectedSeason] = useState<number>(60);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, battlegroup: string, highStreak: number, currentStreak: number}>({name: '', battlegroup: '', highStreak: 0, currentStreak: 0});

  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

           const fetchAvailablePlayers = useCallback(async () => {
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
    }, []);

     useEffect(() => {
     fetchAvailablePlayers();
   }, [fetchAvailablePlayers]);

           const fetchStreaks = async (playerNames?: string[], players?: any[]) => {
    try {
      // Load saved all-time highs first
      let savedAllTimeHighs: PlayerStreak[] = [];
      try {
        const savedResponse = await fetch('/api/updateAllTimeHighs');
        const savedData = await savedResponse.json();
        savedAllTimeHighs = savedData.players || [];
      } catch (err) {
        console.log('No saved all-time highs found, starting fresh');
      }

      // Load saved active streaks
      let savedActiveStreaks: PlayerStreak[] = [];
      try {
        const activeResponse = await fetch('/api/updateActiveStreaks');
        const activeData = await activeResponse.json();
        savedActiveStreaks = activeData.players || [];
      } catch (err) {
        console.log('No saved active streaks found, starting fresh');
      }

      // Fetch live streak data from API
      const response = await fetch('/api/killStreaks');
      const data = await response.json();
      
      if (!data.allTimeStreaks) {
        console.error('No streak data received');
        return;
      }
      
      console.log('Received streak data:', data.allTimeStreaks.length, 'players');
      console.log('Sample player data:', data.allTimeStreaks[0]);

      const baselinePlayers: PlayerStreak[] = data.allTimeStreaks;
      const csvPlayerMap = new Map<string, PlayerStreak>(); // Use Map to prevent duplicates
      
      // Process the API data
      for (const player of baselinePlayers) {
        csvPlayerMap.set(player.name, {
          name: player.name,
          highStreak: player.highStreak,
          currentStreak: player.currentStreak,
          totalKills: player.totalKills,
          totalDeaths: player.totalDeaths,
          battlegroup: player.battlegroup,
          isNewHigh: player.isNewHigh,
          isHistoricalRecord: player.highStreak >= 100 // Mark as historical if 100+ kills
        });
       }
      
      // Convert Map back to array
      const allBaselinePlayers = Array.from(csvPlayerMap.values());
      
      // Update battlegroups from playerData API if available
      if (players && players.length > 0) {
        allBaselinePlayers.forEach(player => {
          const apiPlayer = players.find((p: any) => p.name === player.name);
          if (apiPlayer && apiPlayer.battlegroup) {
            player.battlegroup = apiPlayer.battlegroup;
          }
        });
      }

      // All Time High Streaks - use saved data if available, otherwise manual players
      const allTimeHighs = savedAllTimeHighs.length > 0 ? savedAllTimeHighs : [];

      // Active Streaks - merge saved data with live data to ensure all players are included
      let active: PlayerStreak[] = [];
      
      if (savedActiveStreaks.length > 0) {
        // Create a map of saved players for quick lookup
        const savedPlayerMap = new Map(savedActiveStreaks.map(p => [p.name, p]));
        
        // Start with all live data players
        active = [...allBaselinePlayers];
        
        // Override with saved data where available
        active.forEach(player => {
          const savedPlayer = savedPlayerMap.get(player.name);
          if (savedPlayer) {
            // Use saved high streak and battlegroup, but keep live current streak and totals
            player.highStreak = savedPlayer.highStreak;
            player.battlegroup = savedPlayer.battlegroup;
          }
        });
        
        // Sort by current streak
        active.sort((a, b) => b.currentStreak - a.currentStreak);
      } else {
        // No saved data, use live data
        active = allBaselinePlayers.sort((a, b) => b.currentStreak - a.currentStreak);
      }

      // Update battlegroups from playerData API if available
      if (players && players.length > 0) {
        allTimeHighs.forEach(player => {
          const apiPlayer = players.find((p: any) => p.name === player.name);
           if (apiPlayer && apiPlayer.battlegroup) {
            player.battlegroup = apiPlayer.battlegroup;
          }
        });
        
        active.forEach(player => {
          const apiPlayer = players.find((p: any) => p.name === player.name);
          if (apiPlayer && apiPlayer.battlegroup) {
            player.battlegroup = apiPlayer.battlegroup;
          }
        });
      }

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

  const startEditing = (player: PlayerStreak) => {
    setEditingPlayer(player.name);
    setEditForm({
      name: player.name,
      battlegroup: player.battlegroup || 'BG1',
      highStreak: player.highStreak,
      currentStreak: player.currentStreak || 0
    });
  };

  const cancelEditing = () => {
    setEditingPlayer(null);
    setEditForm({name: '', battlegroup: '', highStreak: 0, currentStreak: 0});
  };

  const saveEdit = () => {
    if (!editingPlayer) return;
    
    // Check for duplicate names (excluding the current player being edited)
    const existingNames = playerStreaks
      .filter(p => p.name !== editingPlayer)
      .map(p => p.name);
    
    if (existingNames.includes(editForm.name)) {
      alert('A player with this name already exists. Please choose a different name.');
      return;
    }
    
    // Auto-update high streak if current streak equals or exceeds it
    const finalHighStreak = Math.max(editForm.highStreak, editForm.currentStreak);
    
    setPlayerStreaks(prev => 
      prev.map(player => 
        player.name === editingPlayer 
          ? { ...player, name: editForm.name, battlegroup: editForm.battlegroup, highStreak: finalHighStreak, currentStreak: editForm.currentStreak }
          : player
      )
    );
    
    setActiveStreaks(prev => 
      prev.map(player => 
        player.name === editingPlayer 
          ? { ...player, highStreak: finalHighStreak }
          : player
      )
    );
    
    setEditingPlayer(null);
    setEditForm({name: '', battlegroup: '', highStreak: 0, currentStreak: 0});
  };

  const deletePlayer = (playerName: string) => {
    if (confirm(`Are you sure you want to remove ${playerName} from the all-time high list?`)) {
      setPlayerStreaks(prev => prev.filter(player => player.name !== playerName));
    }
  };

  const addNewPlayer = () => {
    // Generate a unique name to avoid duplicate keys
    const existingNames = playerStreaks.map(p => p.name);
    let newName = 'New Player';
    let counter = 1;
    while (existingNames.includes(newName)) {
      newName = `New Player ${counter}`;
      counter++;
    }
    
    const newPlayer: PlayerStreak = {
      name: newName,
      highStreak: 100,
      currentStreak: 0,
      totalKills: 0,
      totalDeaths: 0,
      battlegroup: 'BG1',
      isNewHigh: false
    };
    setPlayerStreaks(prev => [...prev, newPlayer].sort((a, b) => b.highStreak - a.highStreak));
    startEditing(newPlayer);
  };

  const saveAllTimeHighs = async () => {
    try {
      const response = await fetch('/api/updateAllTimeHighs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players: playerStreaks }),
      });

      if (response.ok) {
        alert('All-time highs saved successfully!');
      } else {
        alert('Error saving all-time highs');
      }
    } catch (error) {
      console.error('Error saving all-time highs:', error);
      alert('Error saving all-time highs');
    }
  };

  const saveActiveStreaks = async () => {
    try {
      const response = await fetch('/api/updateActiveStreaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players: activeStreaks }),
      });

      if (response.ok) {
        alert('Active streaks saved successfully!');
      } else {
        alert('Error saving active streaks');
      }
    } catch (error) {
      console.error('Error saving active streaks:', error);
      alert('Error saving active streaks');
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
    <div className="p-4 sm:p-6">
      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <label htmlFor="season-select">Season:</label>
            <select
              id="season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-gray-700 text-white p-1 rounded text-sm"
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 55} value={i + 55}>
                  Season {i + 55}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="war-select">War:</label>
            <select
              id="war-select"
              value={selectedWar}
              onChange={(e) => setSelectedWar(e.target.value === "all" ? "all" : e.target.value === "unassigned" ? "unassigned" : Number(e.target.value))}
              className="bg-gray-700 text-white p-1 rounded text-sm"
            >
              <option value="all">All Wars</option>
              <option value="unassigned">Unassigned</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  War {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
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
           <div className="flex justify-between items-center mb-3">
             <h2 className="text-xl font-semibold text-yellow-400">🏆 All Time High Streaks</h2>
             <div className="flex gap-2">
               <button 
                 onClick={addNewPlayer}
                 className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
               >
                 + Add Player
               </button>
               <button 
                 onClick={saveAllTimeHighs}
                 className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
               >
                 Save Changes
               </button>
             </div>
           </div>
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left">Rank</th>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-left">High Streak</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {playerStreaks.map((player, idx) => (
                                 <tr key={`${player.name}-${idx}`} className={`hover:bg-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
                   <td className="p-2 text-yellow-400 font-bold">#{idx + 1}</td>
                   <td className="p-2 flex items-center gap-2">
                     {editingPlayer === player.name ? (
                       <div className="flex items-center gap-2">
                         <select 
                           value={editForm.battlegroup}
                           onChange={(e) => setEditForm(prev => ({...prev, battlegroup: e.target.value}))}
                           className="bg-gray-700 text-white p-1 rounded text-xs"
                           aria-label="Select battlegroup"
                         >
                           <option value="BG1">BG1</option>
                           <option value="BG2">BG2</option>
                           <option value="BG3">BG3</option>
                         </select>
                         <input 
                           type="text"
                           value={editForm.name}
                           onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                           className="bg-gray-700 text-white p-1 rounded text-xs w-24"
                           aria-label="Player name"
                         />
                       </div>
                     ) : (
                       <>
                     <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getBattlegroupColor(player.battlegroup)}`}>
                       {player.battlegroup}
                     </span>
                     {player.name}
                       </>
                     )}
                   </td>
                   <td className={`p-2 text-black font-semibold ${idx % 2 === 0 ? 'bg-yellow-400' : 'bg-yellow-500'}`}>
                     {editingPlayer === player.name ? (
                       <input 
                         type="number"
                         value={editForm.highStreak}
                         onChange={(e) => setEditForm(prev => ({...prev, highStreak: parseInt(e.target.value) || 0}))}
                         className="bg-gray-700 text-white p-1 rounded text-xs w-16"
                         aria-label="High streak"
                       />
                     ) : (
                       player.highStreak
                     )}
                   </td>
                   <td className="p-2">
                     {editingPlayer === player.name ? (
                       <div className="flex gap-1">
                         <button 
                           onClick={saveEdit}
                           className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                         >
                           Save
                         </button>
                         <button 
                           onClick={cancelEditing}
                           className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                         >
                           Cancel
                         </button>
                       </div>
                     ) : (
                       <div className="flex gap-1">
                         <button 
                           onClick={() => startEditing(player)}
                           className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                         >
                           Edit
                         </button>
                         <button 
                           onClick={() => deletePlayer(player.name)}
                           className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                         >
                           Delete
                         </button>
                       </div>
                     )}
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>

                 {/* Active Streaks */}
         <div className="bg-gray-800 rounded-lg shadow-lg p-4 overflow-x-auto" data-section="active-streaks">
           <div className="flex justify-between items-center mb-3">
             <h2 className="text-xl font-semibold text-purple-400">
               🔥 Active Streaks {selectedWar !== "all" && selectedWar !== "unassigned" && `- War ${selectedWar}`}
               {selectedWar === "unassigned" && " - Unassigned Entries"}
             </h2>
             <button 
               onClick={saveActiveStreaks}
               className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
             >
               Save Changes
             </button>
           </div>
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-left">High Streak</th>
                <th className="p-2 text-left">
                  {selectedWar === "all" ? "Current Streak" : 
                   selectedWar === "unassigned" ? "Unassigned Streak" : 
                   `War ${selectedWar} Streak`}
                </th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeStreaks.map((player, idx) => {
                const displayStreak = selectedWar === "all" 
                  ? player.currentStreak 
                  : selectedWar === "unassigned"
                  ? player.currentStreak // For unassigned, show current streak (includes unassigned entries)
                  : (player.warStreaks?.[selectedWar] || 0);
                
                return (
                  <tr key={`${player.name}-${idx}`} className={`hover:bg-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
                    <td className="p-2">{player.currentStreak >= player.highStreak && <span className="text-green-400 text-xs font-semibold">New High</span>}</td>
                    <td className="p-2 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getBattlegroupColor(player.battlegroup)}`}>
                        {player.battlegroup}
                      </span>
                      {player.name}
                    </td>
                    <td className={`p-2 text-black font-semibold ${idx % 2 === 0 ? 'bg-yellow-400' : 'bg-yellow-500'}`}>
                      {editingPlayer === player.name ? (
                        <input 
                          type="number"
                          value={editForm.highStreak}
                          onChange={(e) => setEditForm(prev => ({...prev, highStreak: parseInt(e.target.value) || 0}))}
                          className="bg-gray-700 text-white p-1 rounded text-xs w-16"
                          aria-label="High streak"
                        />
                      ) : (
                        player.highStreak
                      )}
                    </td>
                    <td className="p-2">{displayStreak}</td>
                    <td className="p-2">
                      {editingPlayer === player.name ? (
                        <div className="flex gap-1">
                          <button 
                            onClick={saveEdit}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                          >
                            Save
                          </button>
                          <button 
                            onClick={cancelEditing}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => startEditing(player)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
