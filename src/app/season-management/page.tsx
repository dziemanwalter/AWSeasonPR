"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Season {
  seasonNumber: number;
  seasonName: string;
  description?: string;
  archivedAt?: string;
  fileSize?: number;
  fileName?: string;
  isCSVData?: boolean;
}

export default function SeasonManagement() {
  const [availableSeasons, setAvailableSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season>({ seasonNumber: 1, seasonName: "Season 1" });
  const [newSeasonNumber, setNewSeasonNumber] = useState(61);
  const [showStartNewSeason, setShowStartNewSeason] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [seasonToRestore, setSeasonToRestore] = useState<Season | null>(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      // Fetch available seasons
      const seasonsRes = await fetch("/api/availableSeasons");
      const seasonsData = await seasonsRes.json();
      setAvailableSeasons(seasonsData.seasons || []);

      // Fetch current season (read from file directly)
      const currentRes = await fetch("/api/currentSeason");
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        setCurrentSeason(currentData);
      }
    } catch (error) {
      console.error("Error fetching seasons:", error);
    }
  };

  const startNewSeason = async () => {
    try {
      const response = await fetch("/api/startNewSeason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSeasonNumber })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Season 60 archived and Season ${newSeasonNumber} started!`);
        setShowStartNewSeason(false);
        setConfirmStart(false);
        setNewSeasonNumber(newSeasonNumber + 1);
        fetchSeasons();
      } else {
        alert("Failed to start new season");
      }
    } catch (error) {
      console.error("Error starting new season:", error);
      alert("Error starting new season");
    }
  };

  const switchToSeason = async (season: Season) => {
    try {
      const response = await fetch("/api/switchSeason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonNumber: season.seasonNumber })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCurrentSeason(result.season);
        alert(`Switched to ${result.season.seasonName}`);
      } else {
        alert("Failed to switch season");
      }
    } catch (error) {
      console.error("Error switching season:", error);
      alert("Error switching season");
    }
  };

  const deleteSeason = async (season: Season) => {
    try {
      const response = await fetch("/api/deleteSeason", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonNumber: season.seasonNumber })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Season ${season.seasonNumber} deleted successfully`);
        setShowDeleteConfirm(false);
        setSeasonToDelete(null);
        fetchSeasons();
      } else {
        alert(result.error || "Failed to delete season");
      }
    } catch (error) {
      console.error("Error deleting season:", error);
      alert("Error deleting season");
    }
  };

  const restoreSeason = async (season: Season) => {
    try {
      const response = await fetch("/api/restoreSeason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonNumber: season.seasonNumber })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Season ${season.seasonNumber} restored successfully! Current data has been backed up.`);
        setShowRestoreConfirm(false);
        setSeasonToRestore(null);
        setCurrentSeason(result.season);
        fetchSeasons();
      } else {
        alert(result.error || "Failed to restore season");
      }
    } catch (error) {
      console.error("Error restoring season:", error);
      alert("Error restoring season");
    }
  };

  return (
    <div className="p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-yellow-400 text-center">
          Season Management
        </h1>

        {/* Current Season */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">Current Season</h2>
          <div className="text-lg">
            <strong>{currentSeason.seasonName}</strong>
          </div>
        </div>

        {/* Start New Season */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">Start New Season</h2>
          <p className="text-gray-300 mb-4">
            This will save all current data as "Season 60" and start a fresh season that only uses live data going forward.
            Kill streaks will continue to accumulate across all seasons.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">New Season Number:</label>
            <input
              type="number"
              value={newSeasonNumber}
              onChange={(e) => setNewSeasonNumber(parseInt(e.target.value) || 61)}
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 w-32"
              placeholder="Enter season number"
              title="New season number"
            />
          </div>

          <Button
            onClick={() => setShowStartNewSeason(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Start New Season
          </Button>
        </div>

        {/* Available Seasons */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">Available Seasons</h2>
          <div className="space-y-3">
            {availableSeasons.map((season, index) => (
              <div key={`${season.seasonNumber}-${index}`} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                <div className="flex-1">
                  <div className="font-semibold">{season.seasonName}</div>
                  <div className="text-sm text-gray-400">{season.description}</div>
                  {season.archivedAt && (
                    <div className="text-xs text-gray-500">
                      Archived: {new Date(season.archivedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => switchToSeason(season)}
                    className={`px-3 py-1 rounded text-sm ${
                      currentSeason.seasonNumber === season.seasonNumber
                        ? 'bg-yellow-500 text-black'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {currentSeason.seasonNumber === season.seasonNumber ? 'Current' : 'Switch'}
                  </Button>
                  
                  {!season.isCSVData && (
                    <>
                      <Button
                        onClick={() => {
                          setSeasonToRestore(season);
                          setShowRestoreConfirm(true);
                        }}
                        className="px-3 py-1 rounded text-sm bg-green-600 hover:bg-green-700 text-white"
                      >
                        Restore
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setSeasonToDelete(season);
                          setShowDeleteConfirm(true);
                        }}
                        className="px-3 py-1 rounded text-sm bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start New Season Confirmation Modal */}
        {showStartNewSeason && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Confirm New Season</h3>
              <p className="text-gray-300 mb-4">
                This will archive all current data as "Season 60" and start Season {newSeasonNumber} with only live data.
                <br /><br />
                <strong className="text-green-400">✓ Kill streaks will continue to accumulate</strong>
                <br />
                <strong className="text-green-400">✓ Custom players and hidden players will be preserved</strong>
                <br />
                <strong className="text-red-400">⚠️ Current season data will be archived</strong>
              </p>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={confirmStart}
                    onChange={(e) => setConfirmStart(e.target.checked)}
                    className="mr-2"
                  />
                  I understand this action will archive current data and start a new season
                </label>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={startNewSeason}
                  disabled={!confirmStart}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:bg-gray-600"
                >
                  Confirm Start Season {newSeasonNumber}
                </Button>
                <Button
                  onClick={() => {
                    setShowStartNewSeason(false);
                    setConfirmStart(false);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Season Confirmation Modal */}
        {showDeleteConfirm && seasonToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4 text-red-400">Confirm Delete Season</h3>
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete <strong>{seasonToDelete.seasonName}</strong>?
                <br /><br />
                <strong className="text-red-400">⚠️ This action cannot be undone</strong>
                <br />
                <strong className="text-red-400">⚠️ All archived data for this season will be permanently lost</strong>
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => deleteSeason(seasonToDelete)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Delete Season {seasonToDelete.seasonNumber}
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSeasonToDelete(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Season Confirmation Modal */}
        {showRestoreConfirm && seasonToRestore && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4 text-green-400">Confirm Restore Season</h3>
              <p className="text-gray-300 mb-4">
                Are you sure you want to restore <strong>{seasonToRestore.seasonName}</strong>?
                <br /><br />
                <strong className="text-yellow-400">⚠️ Current data will be backed up before restore</strong>
                <br />
                <strong className="text-green-400">✓ Kill streaks will continue to accumulate</strong>
                <br />
                <strong className="text-green-400">✓ Custom players and hidden players will be preserved</strong>
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => restoreSeason(seasonToRestore)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Restore Season {seasonToRestore.seasonNumber}
                </Button>
                <Button
                  onClick={() => {
                    setShowRestoreConfirm(false);
                    setSeasonToRestore(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
