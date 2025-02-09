import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

interface TimesheetResult {
  date: string;
  hoursWorked: number | null;
  breakTime: number | null;
}

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

    // Calculate start of week (Sunday)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get weekly timesheet data
    const weeklyTimesheet = await prisma.$queryRaw<TimesheetResult[]>`
      WITH PunchPairs AS (
        SELECT 
          DATE(timestamp) as work_date,
          timestamp as start_time,
          LEAD(timestamp) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp) as end_time,
          type as start_type,
          LEAD(type) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp) as end_type
        FROM "PunchRecord"
        WHERE "userId" = ${session.user.id}
          AND timestamp >= date_trunc('week', ${weekStart}::timestamp)
      ),
      WorkHours AS (
        SELECT 
          work_date,
          COALESCE(
            SUM(
              CASE 
                WHEN start_type = 'in' AND end_type = 'out' THEN
                  EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
                ELSE 0
              END
            ),
            0
          )::float as hours_worked
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
          AND timestamp >= date_trunc('week', ${weekStart}::timestamp)
      ),
      BreakHours AS (
        SELECT 
          break_date,
          SUM(
            CASE 
              WHEN start_type = 'start' AND end_type = 'end' THEN
                EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
              ELSE 0
            END
          ) as break_time
        FROM BreakPairs
        GROUP BY break_date
      ),
      AllDates AS (
        SELECT 
          generate_series(
            date_trunc('week', ${weekStart}::timestamp)::date,
            date_trunc('week', ${weekStart}::timestamp)::date + interval '6 days',
            interval '1 day'
          )::date as date
      )
      SELECT 
        d.date::text as date,
        COALESCE(w.hours_worked, 0)::float as "hoursWorked",
        COALESCE(b.break_time, 0)::float as "breakTime"
      FROM AllDates d
      LEFT JOIN WorkHours w ON d.date = w.work_date
      LEFT JOIN BreakHours b ON d.date = b.break_date
      ORDER BY d.date DESC;
    `;

    // Calculate today's hours and break time
    const todayRecords = await prisma.$queryRaw<{ hoursToday: number; breakTimeToday: number }[]>`
      WITH PunchPairs AS (
        SELECT 
          timestamp as start_time,
          LEAD(timestamp) OVER (ORDER BY timestamp) as end_time,
          type as start_type,
          LEAD(type) OVER (ORDER BY timestamp) as end_type
        FROM "PunchRecord"
        WHERE "userId" = ${session.user.id}
          AND DATE(timestamp) = DATE(${today})
      ),
      WorkHours AS (
        SELECT 
          SUM(
            CASE 
              WHEN start_type = 'in' AND end_type = 'out' THEN
                EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
              ELSE 0
            END
          ) as hours_worked
        FROM PunchPairs
      ),
      BreakPairs AS (
        SELECT 
          timestamp as start_time,
          LEAD(timestamp) OVER (ORDER BY timestamp) as end_time,
          type as start_type,
          LEAD(type) OVER (ORDER BY timestamp) as end_type
        FROM "BreakRecord"
        WHERE "userId" = ${session.user.id}
          AND DATE(timestamp) = DATE(${today})
      ),
      BreakHours AS (
        SELECT 
          SUM(
            CASE 
              WHEN start_type = 'start' AND end_type = 'end' THEN
                EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
              ELSE 0
            END
          ) as break_time
        FROM BreakPairs
      )
      SELECT 
        COALESCE((SELECT hours_worked FROM WorkHours), 0) as hoursToday,
        COALESCE((SELECT break_time FROM BreakHours), 0) as breakTimeToday
    `;

    // Determine current punch state
    const lastPunch = user.punchRecords[0];
    const lastBreak = user.breakRecords[0];
    const isPunchedIn = lastPunch?.type === 'in';
    const isOnBreak = lastBreak?.type === 'start' && isPunchedIn;

    return NextResponse.json({
      name: user.name,
      email: user.email,
      isPunchedIn,
      isOnBreak,
      lastPunchIn: isPunchedIn ? lastPunch?.timestamp : undefined,
      lastPunchOut: !isPunchedIn ? lastPunch?.timestamp : undefined,
      lastBreakStart: isOnBreak ? lastBreak?.timestamp : undefined,
      lastBreakEnd: !isOnBreak ? lastBreak?.timestamp : undefined,
      hoursToday: Number(todayRecords[0]?.hoursToday) || 0,
      hoursThisWeek: weeklyTimesheet.reduce((sum, day) => sum + Number(day.hoursWorked), 0),
      breakTimeToday: Number(todayRecords[0]?.breakTimeToday) || 0,
      weeklyTimesheet: weeklyTimesheet.map(entry => ({
        date: entry.date,
        hoursWorked: Number(entry.hoursWorked),
        breakTime: Number(entry.breakTime)
      }))
    });
  } catch (error) {
    console.error('Error fetching punch state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch punch state' },
      { status: 500 }
    );
  }
} 