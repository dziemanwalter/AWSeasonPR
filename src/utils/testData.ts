import fs from "fs";
import Papa from "papaparse";

const csvFile = fs.readFileSync("C.Av PR aDR.csv", "utf8");
const parsed = Papa.parse(csvFile, { header: true, dynamicTyping: true });
const data = parsed.data;

// Row Y is index 24 (rows are 0-based, so row 1 = index 0)
const rowY = data[24];

const difficultyRating = rowY.Y; // Node value / Difficulty rating
const killBonus = rowY.Z;
const deathPenalty = rowY.AA;

console.log({
  difficultyRating,
  killBonus,
  deathPenalty
});
