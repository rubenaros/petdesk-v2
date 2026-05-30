import { NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';

export async function GET() {
  try {
    const { repo } = getSharedInstances();
    const appointments = repo.listAppointments();
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error in appointments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}