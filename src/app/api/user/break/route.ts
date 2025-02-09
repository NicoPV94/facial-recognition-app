import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (!action || !['start', 'end'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Check if user is punched in
    const lastPunch = await prisma.punchRecord.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!lastPunch || lastPunch.type !== 'in') {
      return NextResponse.json(
        { error: 'Must be punched in to take a break' },
        { status: 400 }
      );
    }

    // Record the break
    await prisma.breakRecord.create({
      data: {
        userId: session.user.id,
        type: action,
        timestamp: new Date(),
      },
    });

    // Calculate break time for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBreaks = await prisma.$queryRaw`
      WITH BreakPairs AS (
        SELECT 
          timestamp as start_time,
          LEAD(timestamp) OVER (ORDER BY timestamp) as end_time,
          type as start_type,
          LEAD(type) OVER (ORDER BY timestamp) as end_type
        FROM "BreakRecord"
        WHERE "userId" = ${session.user.id}
        AND DATE(timestamp) = DATE(${today})
      )
      SELECT 
        SUM(
          CASE 
            WHEN start_type = 'start' AND end_type = 'end' THEN
              EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
            ELSE 0
          END
        ) as breakTime
      FROM BreakPairs
    `;

    const breakTimeToday = Number(todayBreaks[0]?.breakTime) || 0;

    return NextResponse.json({
      breakTimeToday,
    });
  } catch (error) {
    console.error('Error recording break:', error);
    return NextResponse.json(
      { error: 'Failed to record break' },
      { status: 500 }
    );
  }
} 