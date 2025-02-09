import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, name, faceDescriptor } = await request.json();

    if (!email || !faceDescriptor) {
      return NextResponse.json(
        { error: 'Email and face descriptor are required' },
        { status: 400 }
      );
    }

    // Validate face descriptor format
    try {
      // Ensure the face descriptor can be parsed as a Float32Array
      new Float32Array(faceDescriptor);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid face descriptor format' },
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
      // Create new user with facial data
      const user = await prisma.user.create({
        data: {
          email,
          name,
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
      });
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