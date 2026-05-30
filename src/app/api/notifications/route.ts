import { NextResponse } from 'next/server';
import { getSharedInstances } from '@/infra/sharedInstances';

export async function GET() {
  try {
    const { repo } = getSharedInstances();
    const notifications = repo.listNotifications();
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}