import { NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';

export async function GET() {
  try {
    const { repo } = getSharedInstances();
    const waitlist = repo.listWaitlist();
    return NextResponse.json(waitlist);
  } catch (error) {
    console.error('Error in waitlist API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}