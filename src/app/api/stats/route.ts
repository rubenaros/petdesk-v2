import { NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';
import { StatsEngine } from '@/engine/stats';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    let startParam = searchParams.get('start');
    let endParam = searchParams.get('end');

    if (!startParam || !endParam) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startParam = thirtyDaysAgo.toISOString();
      endParam = now.toISOString();
    }

    const rangeStart = new Date(startParam);
    const rangeEnd = new Date(endParam);

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
