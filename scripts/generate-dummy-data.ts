import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDummyData() {
  try {
    // Get the user
    const user = await prisma.user.findFirst({
      where: {
        email: 'n.portovega@gmail.com'
      }
    });

    if (!user) {
      console.error('User not found');
      return;
    }

    // Generate data for the last 30 days
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 30);

    // Clear existing records for clean data
    await prisma.punchRecord.deleteMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: startDate
        }
      }
    });

    await prisma.breakRecord.deleteMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: startDate
        }
      }
    });

    // Generate records for each day
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        continue;
      }

      // Random start time between 7:30 AM and 8:30 AM
      const startHour = 7 + Math.floor(Math.random() * 1);
      const startMinute = Math.floor(Math.random() * 60);
      const punchInTime = new Date(currentDate);
      punchInTime.setHours(startHour, startMinute, 0, 0);

      // Random end time between 4:30 PM and 5:30 PM
      const endHour = 16 + Math.floor(Math.random() * 1);
      const endMinute = Math.floor(Math.random() * 60);
      const punchOutTime = new Date(currentDate);
      punchOutTime.setHours(endHour, endMinute, 0, 0);

      // Create punch records
      await prisma.punchRecord.create({
        data: {
          userId: user.id,
          type: 'in',
          timestamp: punchInTime
        }
      });

      await prisma.punchRecord.create({
        data: {
          userId: user.id,
          type: 'out',
          timestamp: punchOutTime
        }
      });

      // Add lunch break (around noon)
      const breakStartTime = new Date(currentDate);
      breakStartTime.setHours(12, Math.floor(Math.random() * 30), 0, 0);
      
      const breakEndTime = new Date(breakStartTime);
      breakEndTime.setMinutes(breakStartTime.getMinutes() + 30 + Math.floor(Math.random() * 30));

      await prisma.breakRecord.create({
        data: {
          userId: user.id,
          type: 'start',
          timestamp: breakStartTime
        }
      });

      await prisma.breakRecord.create({
        data: {
          userId: user.id,
          type: 'end',
          timestamp: breakEndTime
        }
      });

      // Sometimes add a second short break in the afternoon (30% chance)
      if (Math.random() < 0.3) {
        const afternoon = new Date(currentDate);
        afternoon.setHours(14, Math.floor(Math.random() * 60), 0, 0);
        
        const afternoonBreakEnd = new Date(afternoon);
        afternoonBreakEnd.setMinutes(afternoon.getMinutes() + 15);

        await prisma.breakRecord.create({
          data: {
            userId: user.id,
            type: 'start',
            timestamp: afternoon
          }
        });

        await prisma.breakRecord.create({
          data: {
            userId: user.id,
            type: 'end',
            timestamp: afternoonBreakEnd
          }
        });
      }
    }

    console.log('Successfully generated dummy data for the last 30 days');
  } catch (error) {
    console.error('Error generating dummy data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateDummyData(); 