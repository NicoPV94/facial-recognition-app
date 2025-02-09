import { NextResponse } from 'next/server';

// Mock data for safety announcements
const announcements = [
  {
    id: '1',
    type: 'warning',
    message: 'Remember to wear proper PPE at all times',
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'info',
    message: 'Site inspection scheduled for tomorrow',
    timestamp: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'alert',
    message: 'Heavy machinery in operation in Zone B',
    timestamp: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(announcements);
} 