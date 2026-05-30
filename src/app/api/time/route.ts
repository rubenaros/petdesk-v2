import { NextRequest, NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';

export async function POST(request: NextRequest) {
  try {
    const { hours } = await request.json();

    if (typeof hours !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid hours' },
        { status: 400 }
      );
    }

    const { clock } = getSharedInstances();
    clock.advance(hours);
    
    return NextResponse.json({
      success: true,
      message: `Time advanced by ${hours} hours`,
      currentOffset: hours,
    });
  } catch (error) {
    console.error('Error in time API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}