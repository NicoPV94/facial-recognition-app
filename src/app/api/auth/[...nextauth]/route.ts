import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import * as faceapi from 'face-api.js';

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Facial Recognition',
      credentials: {
        faceDescriptor: { label: "Face Descriptor", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.faceDescriptor) {
          console.error('No face descriptor provided');
          throw new Error('Face descriptor is required');
        }

        try {
          // Get all users with facial data
          const users = await prisma.user.findMany({
            include: { facialData: true },
          });

          if (!users.length) {
            console.error('No users found in database');
            throw new Error('No registered users found');
          }

          let inputDescriptor;
          try {
            inputDescriptor = new Float32Array(JSON.parse(credentials.faceDescriptor));
          } catch (parseError) {
            console.error('Error parsing input descriptor:', parseError);
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 