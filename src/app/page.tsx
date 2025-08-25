// src/app/page.tsx
import Link from 'next/link';

// This is a placeholder. We will replace this with real data soon.
const mockPlayerData = {
  name: "Retlaw",
  kills: 150,
  deaths: 75,
  powerRating: 225,
};

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">awmasters.com Stat Dashboard</h1>
        <p className="text-gray-600">Automating your spreadsheet analysis</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4">
          <Link href="/" className="px-3 py-2 font-medium text-sm text-blue-600 border-b-2 border-blue-600">
            Player Overview
          </Link>
          <Link href="/bg-comparison" className="px-3 py-2 font-medium text-sm text-gray-500 hover:text-gray-700">
            BG Comparison
          </Link>
          <Link href="/alliance-rank" className="px-3 py-2 font-medium text-sm text-gray-500 hover:text-gray-700">
            Alliance Rank
          </Link>
        </nav>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stat Card 1 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Kills</h2>
          <p className="text-3xl font-bold text-gray-900">{mockPlayerData.kills}</p>
        </div>
        {/* Stat Card 2 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Deaths</h2>
          <p className="text-3xl font-bold text-gray-900">{mockPlayerData.deaths}</p>
        </div>
        {/* Stat Card 3 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Solo Rate</h2>
          <p className="text-3xl font-bold text-gray-900">
            {((mockPlayerData.kills / (mockPlayerData.kills + mockPlayerData.deaths)) * 100).toFixed(1)}%
          </p>
        </div>
        {/* Stat Card 4 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Power Rating</h2>
          <p className="text-3xl font-bold text-gray-900">{mockPlayerData.powerRating}</p>
        </div>
      </div>

      {/* Placeholder for a future data table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Player Stats</h2>
        <p className="text-gray-600">The data table will go here once we connect to awmasters.com.</p>
      </div>
    </main>
  );
}