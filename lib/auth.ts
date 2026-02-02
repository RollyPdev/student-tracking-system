import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/auth/signin",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("Authorize attempt for:", credentials?.email);

                if (!credentials?.email || !credentials?.password) {
                    console.error("Missing email or password");
                    throw new Error("Invalid credentials");
                }

                const email = credentials.email.toLowerCase().trim();

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: {
                        id: true,
                        email: true,
                        password: true,
                        name: true,
                        role: true,
                        studentClass: true,
                    },
                });

                if (!user) {
                    console.error("User not found in DB:", email);
                    throw new Error("User not found");
                }

                if (!user.password) {
                    console.error("User has no password set:", email);
                    throw new Error("User has no password");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    console.error("Invalid password for:", email);
                    throw new Error("Invalid password");
                }

                console.log("Authorize successful for:", email);

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    studentClass: (user as any).studentClass,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.studentClass = user.studentClass;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id as string;
                session.user.studentClass = token.studentClass;
            }
            return session;
        },
    },
};
