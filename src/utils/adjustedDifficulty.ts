// src/utils/formulas/adjustedDifficulty.ts

export type SeasonDeaths = {
  C: number; D: number; E: number; F: number;
  G: number; H: number; I: number; J: number;
  K: number; L: number; M: number;
  O: number; P: number; Q: number; R: number;
  X: number;
};

// Convert attack bonuses to deaths
export function bonusesToDeaths(bonusesRemaining: number): number {
  return 3 - bonusesRemaining;
}

// Sum node deaths across all columns
export function sumNodeDeaths(season: SeasonDeaths): number {
  return Object.values(season).reduce((a, b) => a + b, 0);
}

// Calculate Y54 (total deaths across all nodes / (150 * 419))
export function calculateY54(allNodes: SeasonDeaths[]): number {
  const totalDeaths = allNodes.reduce((acc, node) => acc + sumNodeDeaths(node), 0);
  const denominator = 150 * (419 + 0);
  return totalDeaths / denominator;
}

// Adjusted Difficulty Rating for a single node
export function calculateAdjustedDifficulty(
  node: SeasonDeaths,
  allNodes: SeasonDeaths[]
): number {
  const nodeDeaths = sumNodeDeaths(node);
  const denominatorBase = 150 * (419 + 12);
  const Y54 = calculateY54(allNodes);

  return (((nodeDeaths / denominatorBase) / Y54) * 10) + 1;
}

// Get all nodes ranked by difficulty
export function getAdjustedDifficultyForAllNodes(
  allNodes: SeasonDeaths[]
) {
  return allNodes
    .map(node => ({
      node,
      adjustedDifficulty: calculateAdjustedDifficulty(node, allNodes),
    }))
    .sort((a, b) => b.adjustedDifficulty - a.adjustedDifficulty);
}
