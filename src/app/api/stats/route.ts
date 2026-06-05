import { NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';
import { StatsEngine } from '@/engine/stats';

export async function GET(request: Request) {
  try {
    const { repo } = getSharedInstances();
    const { searchParams } = new URL(request.url);
    
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30); // Last 30 days
    
    const start = startParam ? new Date(startParam) : defaultStart;
    const end = endParam ? new Date(endParam) : now;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-12-31T23:59:59.999Z)' },
        { status: 400 }
      );
    }
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }
    
    const statsEngine = new StatsEngine(repo);
    const stats = statsEngine.compute(start, end);
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}