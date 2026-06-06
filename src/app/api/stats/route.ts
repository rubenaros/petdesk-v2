import { NextResponse } from 'next/server';
import { StatsEngine } from '@/engine/stats';
import { getSharedInstances } from '@/infra/sharedInstances';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endParam = searchParams.get('end');
    const startParam = searchParams.get('start');

    const now = new Date();
    const end = endParam ? new Date(endParam) : now;
    const start = startParam
      ? new Date(startParam)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const rangeStart = start.toISOString();
    const rangeEnd = end.toISOString();

    const { repo } = getSharedInstances();
    const engine = new StatsEngine(repo);
    const stats = engine.compute(rangeStart, rangeEnd);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
