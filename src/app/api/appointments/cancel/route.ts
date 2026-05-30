import { NextRequest, NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Missing appointmentId' },
        { status: 400 }
      );
    }

    const { scheduler, notifier, clock } = getSharedInstances();

    // Cancel the appointment
    const { candidates } = scheduler.cancel(appointmentId);

    // If there are candidates, notify the first one (backfill offer)
    if (candidates.length > 0) {
      const first = candidates[0];
      notifier.notify({
        id: `n-${Date.now()}-bf`,
        clientId: first.clientId,
        kind: 'backfill_offer',
        body: `¡Hueco libre! ¿Quieres agendar para ${first.windowStart}?`,
        createdAt: clock.now().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled',
      candidatesCount: candidates.length,
    });
  } catch (error) {
    console.error('Error in cancel API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}