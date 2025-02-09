import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's current punch state
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        punchRecords: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        breakRecords: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate hours worked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = await prisma.punchRecord.findMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: today,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const todayBreaks = await prisma.breakRecord.findMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: today,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Calculate hours for this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weeklyTimesheet = await prisma.$queryRaw`
      WITH PunchPairs AS (
        SELECT 
          DATE(timestamp) as work_date,
          timestamp as start_time,
          LEAD(timestamp) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp) as end_time,
          type as start_type,
          LEAD(type) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp) as end_type
        FROM "PunchRecord"
        WHERE "userId" = ${session.user.id}
        AND timestamp >= ${weekStart}
      ),
      WorkHours AS (
        SELECT 
          work_date as date,
          SUM(
            CASE 
              WHEN start_type = 'in' AND end_type = 'out' THEN
                EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
              ELSE 0
            END
          ) as hoursWorked
        FROM PunchPairs
        GROUP BY work_date
      ),
      BreakPairs AS (
        SELECT 
          DATE(timestamp) as break_date,
          timestamp as start_time,
          LEAD(timestamp) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp) as end_time,
          type as start_type,
          LEAD(type) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp) as end_type
        FROM "BreakRecord"
        WHERE "userId" = ${session.user.id}
        AND timestamp >= ${weekStart}
      ),
      BreakHours AS (
        SELECT 
          break_date as date,
          SUM(
            CASE 
              WHEN start_type = 'start' AND end_type = 'end' THEN
                EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
              ELSE 0
            END
          ) as breakTime
        FROM BreakPairs
        GROUP BY break_date
      )
      SELECT 
        w.date,
        w.hoursWorked,
        COALESCE(b.breakTime, 0) as breakTime
      FROM WorkHours w
      LEFT JOIN BreakHours b ON w.date = b.date
      ORDER BY w.date DESC
    `;

    // Calculate total hours for the week
    let hoursThisWeek = 0;
    let breakTimeToday = 0;
    let hoursToday = 0;

    for (const record of weeklyTimesheet) {
      hoursThisWeek += Number(record.hoursWorked) || 0;
      if (new Date(record.date).toDateString() === today.toDateString()) {
        hoursToday = Number(record.hoursWorked) || 0;
        breakTimeToday = Number(record.breakTime) || 0;
      }
    }

    // Determine current punch state
    const lastPunch = user.punchRecords[0];
    const lastBreak = user.breakRecords[0];
    const isPunchedIn = lastPunch?.type === 'in';
    const isOnBreak = lastBreak?.type === 'start';

    return NextResponse.json({
      name: user.name,
      email: user.email,
      isPunchedIn,
      isOnBreak,
      lastPunchIn: isPunchedIn ? lastPunch?.timestamp : undefined,
      lastPunchOut: !isPunchedIn ? lastPunch?.timestamp : undefined,
      lastBreakStart: isOnBreak ? lastBreak?.timestamp : undefined,
      lastBreakEnd: !isOnBreak ? lastBreak?.timestamp : undefined,
      hoursToday,
      hoursThisWeek,
      breakTimeToday,
      weeklyTimesheet,
    });
  } catch (error) {
    console.error('Error fetching punch state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch punch state' },
      { status: 500 }
    );
  }
} 