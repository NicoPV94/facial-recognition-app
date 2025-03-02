import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import * as faceapi from 'face-api.js';
import { AuthOptions } from 'next-auth';
import { compare } from 'bcrypt';

const prisma = new PrismaClient();

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        faceDescriptor: { label: "Face Descriptor", type: "text" },
        isAdmin: { label: "Is Admin", type: "boolean" },
      },
      async authorize(credentials) {
        if (!credentials) {
          throw new Error('No credentials provided');
        }

        // Admin login with email/password
        if (credentials.isAdmin === 'true') {
          if (!credentials.email || !credentials.password) {
            throw new Error('Email and password are required');
          }

          const user = await prisma.user.findUnique({
            where: { 
              email: credentials.email,
              role: 'ADMIN',
            },
          });

          if (!user || !user.password) {
            throw new Error('Invalid email or password');
          }

          const isValid = await compare(credentials.password, user.password);
          
          if (!isValid) {
            throw new Error('Invalid email or password');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // Worker login with facial recognition
        if (!credentials.faceDescriptor) {
          throw new Error('Face descriptor is required');
        }

        try {
          // Get all workers with facial data
          const users = await prisma.user.findMany({
            where: { role: 'WORKER' },
            include: { facialData: true },
          });

          if (!users.length) {
            throw new Error('No registered workers found');
          }

          let inputDescriptor;
          try {
            inputDescriptor = new Float32Array(JSON.parse(credentials.faceDescriptor));
          } catch (parseError) {
            throw new Error('Invalid face descriptor format');
          }

          // Compare face with all stored faces
          for (const user of users) {
            if (!user.facialData?.descriptors) {
              console.error('No facial data found for user:', user.email);
              continue;
            }

            let storedDescriptor;
            try {
              storedDescriptor = new Float32Array(JSON.parse(user.facialData.descriptors));
            } catch (parseError) {
              console.error('Error parsing stored descriptor for user:', user.email, parseError);
              continue;
            }

            try {
              const distance = faceapi.euclideanDistance(inputDescriptor, storedDescriptor);
              console.log('Face match distance for user:', user.email, distance);
              
              // If distance is less than 0.6, consider it a match
              if (distance < 0.6) {
                console.log('Face match found for user:', user.email);
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                };
              }
            } catch (distanceError) {
              console.error('Error calculating distance for user:', user.email, distanceError);
              continue;
            }
          }

          throw new Error('Face not recognized');
        } catch (error) {
          console.error('Error during facial authentication:', error);
          throw error instanceof Error ? error : new Error('Authentication failed');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login', // Error code passed in query string as ?error=
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}; 