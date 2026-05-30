import { NextRequest, NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';
import { handleMessage } from '@/receptionist/brain';

export async function POST(request: NextRequest) {
  try {
    const { text, clientId } = await request.json();

    if (!text || !clientId) {
      return NextResponse.json(
        { error: 'Missing text or clientId' },
        { status: 400 }
      );
    }

    const { scheduler, notifier, clock } = getSharedInstances();

    const result = handleMessage({
      text,
      clientId,
      scheduler,
      notifier,
      clock,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in message API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}