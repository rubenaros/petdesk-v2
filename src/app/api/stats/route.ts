import { NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';
import { StatsEngine } from '@/engine/stats';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');

    const now = new Date();
    const end = endParam ? new Date(endParam) : now;
    const start = startParam
      ? new Date(startParam)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before end

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'start date must be before end date' },
        { status: 400 }
      );
    }

    const { repo } = getSharedInstances();
    const engine = new StatsEngine(repo);
    const stats = engine.compute(start, end);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}