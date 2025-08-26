// src/utils/formulas/powerRating.ts

export type PlayerStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalPoints: number;
};

// Example formula placeholder
export function calculatePowerRating(stats: PlayerStats): number {
  return stats.totalPoints / stats.gamesPlayed; // Replace with your actual formula
}
