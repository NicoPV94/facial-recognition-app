import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, name, faceDescriptor, password, role } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    try {
      // Create new user based on role
      if (role === 'ADMIN') {
        if (!password) {
          return NextResponse.json(
            { error: 'Password is required for admin registration' },
            { status: 400 }
          );
        }

        const hashedPassword = await hash(password, 12);

        const user = await prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: 'ADMIN',
          },
        });

        return NextResponse.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });
      } else {
        // Worker registration with facial data
        if (!faceDescriptor) {
          return NextResponse.json(
            { error: 'Face descriptor is required for worker registration' },
            { status: 400 }
          );
        }

        // Validate face descriptor format
        try {
          new Float32Array(faceDescriptor);
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid face descriptor format' },
            { status: 400 }
          );
        }

        const user = await prisma.user.create({
          data: {
            email,
            name,
            role: 'WORKER',
            facialData: {
              create: {
                descriptors: JSON.stringify(faceDescriptor),
              },
            },
          },
          include: {
            facialData: true,
          },
        });

        return NextResponse.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });
      }
    } catch (dbError) {
      console.error('Database error during user creation:', dbError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 