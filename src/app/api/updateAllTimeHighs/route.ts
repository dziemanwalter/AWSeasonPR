import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface PlayerStreak {
  name: string;
  highStreak: number;
  currentStreak: number;
  totalKills: number;
  totalDeaths: number;
  battlegroup: string;
  isNewHigh: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { players }: { players: PlayerStreak[] } = await request.json();
    
    if (!players || !Array.isArray(players)) {
      return NextResponse.json({ error: 'Invalid players data' }, { status: 400 });
    }

    // Save to a JSON file
    const filePath = path.join(process.cwd(), 'data', 'allTimeHighs.json');
    
    // Ensure the data directory exists
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save the players data
    fs.writeFileSync(filePath, JSON.stringify(players, null, 2));
    
    return NextResponse.json({ 
      message: 'All-time highs saved successfully',
      count: players.length 
    });
    
  } catch (error: any) {
    console.error('Error saving all-time highs:', error);
    return NextResponse.json({ 
      error: 'Failed to save all-time highs',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'allTimeHighs.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ players: [] });
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const players = JSON.parse(data);
    
    return NextResponse.json({ players });
    
  } catch (error: any) {
    console.error('Error loading all-time highs:', error);
    return NextResponse.json({ 
      error: 'Failed to load all-time highs',
      details: error.message 
    }, { status: 500 });
  }
}