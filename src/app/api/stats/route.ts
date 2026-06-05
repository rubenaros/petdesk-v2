import { NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';
import { StatsEngine } from '@/engine/stats';

export async function GET(request: Request) {
  try {
    const { repo } = getSharedInstances();
    const { searchParams } = new URL(request.url);
    
    // Parse query params o usar defaults
    const endParam = searchParams.get('end');
    const startParam = searchParams.get('start');
    
    const end = endParam ? new Date(endParam) : new Date();
    const start = startParam ? new Date(startParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // últimos 30 días
    
    // Validar fechas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601' },
        { status: 400 }
      );
    }
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'start date must be before end date' },
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