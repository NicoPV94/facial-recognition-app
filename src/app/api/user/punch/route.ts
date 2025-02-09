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

    if (!action || !['in', 'out'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Record the punch
    await prisma.punchRecord.create({
      data: {
        userId: session.user.id,
        type: action,
        timestamp: new Date(),
      },
    });

    // If punching out, end any active breaks
    if (action === 'out') {
      const lastBreak = await prisma.breakRecord.findFirst({
        where: {
          userId: session.user.id,
          type: 'start',
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      if (lastBreak) {
        await prisma.breakRecord.create({
          data: {
            userId: session.user.id,
            type: 'end',
            timestamp: new Date(),
          },
        });
      }
    }

    // Calculate updated hours
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
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

    let hoursThisWeek = 0;
    let hoursToday = 0;

    for (const record of weeklyTimesheet) {
      hoursThisWeek += Number(record.hoursWorked) || 0;
      if (new Date(record.date).toDateString() === today.toDateString()) {
        hoursToday = Number(record.hoursWorked) || 0;
      }
    }

    return NextResponse.json({
      hoursToday,
      hoursThisWeek,
      weeklyTimesheet,
    });
  } catch (error) {
    console.error('Error recording punch:', error);
    return NextResponse.json(
      { error: 'Failed to record punch' },
      { status: 500 }
    );
  }
} 