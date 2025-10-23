"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Users, Eye, EyeOff } from "lucide-react";

interface CustomPlayer {
  name: string;
  battlegroup: "BG1" | "BG2" | "BG3";
  addedDate: string;
  hidden?: boolean;
}

interface CSVPlayer {
  name: string;
  battlegroup?: string;
  isCustom: false;
}

interface HiddenPlayer {
  name: string;
  battlegroup?: string;
  hiddenDate: string;
  isCustom: boolean;
}

export default function ManagePlayersPage() {
  const [customPlayers, setCustomPlayers] = useState<CustomPlayer[]>([]);
  const [csvPlayers, setCsvPlayers] = useState<CSVPlayer[]>([]);
  const [hiddenPlayers, setHiddenPlayers] = useState<HiddenPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerBG, setNewPlayerBG] = useState<"BG1" | "BG2" | "BG3">("BG1");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showHiddenPlayers, setShowHiddenPlayers] = useState(false);

  const fetchCustomPlayers = useCallback(async () => {
    try {
      const customResponse = await fetch("/api/customPlayers");
      if (customResponse.ok) {
        const customPlayers = await customResponse.json();
        setCustomPlayers(customPlayers);
      }
    } catch (error) {
      console.error("Error fetching custom players:", error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      // Fetch custom players
      await fetchCustomPlayers();

      // Fetch CSV players
      const csvResponse = await fetch("/api/playerData");
      if (csvResponse.ok) {
        const data = await csvResponse.json();
        const csvPlayers = data.players
          .filter((p: any) => !p.isCustom)
          .map((p: any) => ({
            name: p.name,
            battlegroup: p.battlegroup,
            isCustom: false as const
          }));
        setCsvPlayers(csvPlayers);
      }

      // Fetch hidden players
      const hiddenResponse = await fetch("/api/hiddenPlayers");
      if (hiddenResponse.ok) {
        const hiddenPlayers = await hiddenResponse.json();
        setHiddenPlayers(hiddenPlayers);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showMessage("error", "Failed to load player data");
    }
  }, [fetchCustomPlayers]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      showMessage("error", "Player name is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/customPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlayerName.trim(),
          battlegroup: newPlayerBG,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setNewPlayerName("");
        setNewPlayerBG("BG1");
        await fetchCustomPlayers();
        showMessage("success", `Player "${result.player.name}" added successfully`);
      } else {
        showMessage("error", result.error || "Failed to add player");
      }
    } catch (error) {
      console.error("Error adding player:", error);
      showMessage("error", "Failed to add player");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHideCSVPlayer = async (playerName: string, battlegroup?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hiddenPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: playerName,
          battlegroup,
          isCustom: false
        }),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchAllData();
        showMessage("success", `CSV player "${playerName}" hidden successfully`);
      } else {
        showMessage("error", result.error || "Failed to hide player");
      }
    } catch (error) {
      console.error("Error hiding CSV player:", error);
      showMessage("error", "Failed to hide player");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCSVPlayer = async (playerName: string) => {
    if (!confirm(`Delete CSV player "${playerName}"? This will remove them from all views and purge their data.`)) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/deletedCSVPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName }),
      });
      const result = await response.json();
      if (response.ok) {
        await fetchAllData();
        showMessage("success", `CSV player "${playerName}" deleted`);
      } else {
        showMessage("error", result.error || "Failed to delete CSV player");
      }
    } catch (error) {
      console.error("Error deleting CSV player:", error);
      showMessage("error", "Failed to delete CSV player");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleHidden = async (playerName: string, currentHidden: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/customPlayers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: playerName,
          hidden: !currentHidden 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchAllData();
        const action = !currentHidden ? "hidden" : "shown";
        showMessage("success", `Player "${playerName}" ${action} successfully`);
      } else {
        showMessage("error", result.error || "Failed to update player status");
      }
    } catch (error) {
      console.error("Error updating player status:", error);
      showMessage("error", "Failed to update player status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowHiddenPlayer = async (playerName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hiddenPlayers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName }),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchAllData();
        showMessage("success", `Player "${playerName}" shown successfully`);
      } else {
        showMessage("error", result.error || "Failed to show player");
      }
    } catch (error) {
      console.error("Error showing player:", error);
      showMessage("error", "Failed to show player");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePlayer = async (playerName: string) => {
    if (!confirm(`Are you sure you want to remove "${playerName}"? This will permanently delete all their data.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/customPlayers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName }),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchAllData();
        showMessage("success", `Player "${playerName}" removed successfully`);
      } else {
        showMessage("error", result.error || "Failed to remove player");
      }
    } catch (error) {
      console.error("Error removing player:", error);
      showMessage("error", "Failed to remove player");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out hidden players from CSV players
  const hiddenPlayerNames = hiddenPlayers.map(p => p.name.toLowerCase());
  const visibleCSVPlayers = csvPlayers.filter(p => !hiddenPlayerNames.includes(p.name.toLowerCase()));
  
  // Separate visible and hidden custom players for display
  const visibleCustomPlayers = customPlayers.filter(p => !p.hidden);
  const hiddenCustomPlayers = customPlayers.filter(p => p.hidden);
  
  // Group CSV players by battlegroup
  const groupedCSVPlayers = visibleCSVPlayers.reduce((acc, player) => {
    const bg = player.battlegroup || "Unknown";
    if (!acc[bg]) {
      acc[bg] = [];
    }
    acc[bg].push(player);
    return acc;
  }, {} as Record<string, CSVPlayer[]>);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-center flex items-center gap-2">
          <Users className="w-6 h-6" />
          Manage Custom Players
        </h1>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded mb-4 ${
            message.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Player Form */}
      <Card className="p-4 mb-6 bg-gray-800 border-gray-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Player
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddPlayer();
              }
            }}
          />
          <select
            value={newPlayerBG}
            onChange={(e) => setNewPlayerBG(e.target.value as "BG1" | "BG2" | "BG3")}
            className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded"
            aria-label="Select battlegroup"
          >
            <option value="BG1">BG1</option>
            <option value="BG2">BG2</option>
            <option value="BG3">BG3</option>
          </select>
          <Button
            onClick={handleAddPlayer}
            disabled={isLoading || !newPlayerName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Adding..." : "Add Player"}
          </Button>
        </div>
      </Card>

      {/* Players List */}
      <div className="space-y-4">
        {/* CSV Players */}
        {Object.keys(groupedCSVPlayers).length > 0 && (
          <Card className="p-4 bg-gray-800 border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">
              CSV Players ({visibleCSVPlayers.length})
            </h3>
            {Object.entries(groupedCSVPlayers).map(([battlegroup, players]) => (
              <div key={battlegroup} className="mb-4">
                <h4 className="text-md font-medium mb-2 text-gray-300">
                  {battlegroup} ({players.length} players)
                </h4>
                <div className="grid gap-2">
                  {players.map((player) => (
                    <div
                      key={player.name}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded"
                    >
                      <div>
                        <span className="font-medium">{player.name}</span>
                        <span className="text-sm text-gray-400 ml-2">
                          From CSV
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleHideCSVPlayer(player.name, player.battlegroup)}
                          disabled={isLoading}
                          variant="outline"
                          size="sm"
                          className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white"
                          title="Hide player from tracking"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteCSVPlayer(player.name)}
                          disabled={isLoading}
                          variant="outline"
                          size="sm"
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                          title="Delete CSV player"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Custom Players */}
        {customPlayers.length === 0 && Object.keys(groupedCSVPlayers).length === 0 ? (
          <Card className="p-6 text-center bg-gray-800 border-gray-700">
            <p className="text-gray-400">No players found.</p>
            <p className="text-sm text-gray-500 mt-1">
              Add custom players above or check your CSV file.
            </p>
          </Card>
        ) : (
          <>
            {/* Active Custom Players */}
            {visibleCustomPlayers.length > 0 && (
              <Card className="p-4 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-green-400">
                  Active Custom Players ({visibleCustomPlayers.length})
                </h3>
                <div className="grid gap-2">
                  {visibleCustomPlayers.map((player) => (
                    <div
                      key={player.name}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded"
                    >
                      <div>
                        <span className="font-medium">{player.name}</span>
                        <span className="text-sm text-gray-400 ml-2">
                          {player.battlegroup} • Added: {new Date(player.addedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleToggleHidden(player.name, false)}
                          disabled={isLoading}
                          variant="outline"
                          size="sm"
                          className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white"
                          title="Hide player"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleRemovePlayer(player.name)}
                          disabled={isLoading}
                          variant="outline"
                          size="sm"
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                          title="Delete player permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Hidden Players Toggle */}
            {(hiddenCustomPlayers.length > 0 || hiddenPlayers.length > 0) && (
              <Card className="p-4 bg-gray-800 border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-orange-400">
                    Hidden Players ({hiddenCustomPlayers.length + hiddenPlayers.length})
                  </h3>
                  <Button
                    onClick={() => setShowHiddenPlayers(!showHiddenPlayers)}
                    variant="outline"
                    size="sm"
                    className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white"
                  >
                    {showHiddenPlayers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showHiddenPlayers ? " Hide" : " Show"}
                  </Button>
                </div>
                {showHiddenPlayers && (
                  <div className="space-y-4">
                    {/* Hidden Custom Players */}
                    {hiddenCustomPlayers.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium mb-2 text-gray-300">Custom Players</h4>
                        <div className="grid gap-2">
                          {hiddenCustomPlayers.map((player) => (
                            <div
                              key={player.name}
                              className="flex items-center justify-between p-3 bg-gray-700 rounded opacity-60"
                            >
                              <div>
                                <span className="font-medium line-through">{player.name}</span>
                                <span className="text-sm text-gray-400 ml-2">
                                  {player.battlegroup} • Added: {new Date(player.addedDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleToggleHidden(player.name, true)}
                                  disabled={isLoading}
                                  variant="outline"
                                  size="sm"
                                  className="text-green-400 border-green-400 hover:bg-green-400 hover:text-white"
                                  title="Show player"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => handleRemovePlayer(player.name)}
                                  disabled={isLoading}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                                  title="Delete player permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hidden CSV Players */}
                    {hiddenPlayers.filter(p => !p.isCustom).length > 0 && (
                      <div>
                        <h4 className="text-md font-medium mb-2 text-gray-300">CSV Players</h4>
                        <div className="grid gap-2">
                          {hiddenPlayers.filter(p => !p.isCustom).map((player) => (
                            <div
                              key={player.name}
                              className="flex items-center justify-between p-3 bg-gray-700 rounded opacity-60"
                            >
                              <div>
                                <span className="font-medium line-through">{player.name}</span>
                                <span className="text-sm text-gray-400 ml-2">
                                  {player.battlegroup} • Hidden: {new Date(player.hiddenDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleShowHiddenPlayer(player.name)}
                                  disabled={isLoading}
                                  variant="outline"
                                  size="sm"
                                  className="text-green-400 border-green-400 hover:bg-green-400 hover:text-white"
                                  title="Show player"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <Card className="p-4 mt-6 bg-gray-800 border-gray-700">
        <h3 className="text-lg font-semibold mb-2">About Player Management</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>CSV Players</strong>: Come from your CSV file and can be hidden from tracking</li>
          <li>• <strong>Custom Players</strong>: Added manually and can be hidden or deleted</li>
          <li>• <strong>Hide players</strong> to remove them from active tracking without losing their data</li>
          <li>• <strong>Delete custom players</strong> to permanently remove them and all their data</li>
          <li>• Hidden players won&apos;t appear in rankings, spreadsheets, or statistics</li>
          <li>• CSV players can be shown again, custom players can be hidden/shown or deleted</li>
        </ul>
      </Card>
    </div>
  );
}
