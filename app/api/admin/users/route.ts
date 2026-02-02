import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Security check: Only Admins can access this
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            );
        }

        const { name, email, password, role, studentClass, school } = await req.json();

        // Validation
        if (!name || !email || !password || !role) {
            return NextResponse.json(
                { error: "Name, email, password, and role are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userData: any = {
            name,
            email,
            password: hashedPassword,
            role,
        };

        if (role === "STUDENT" && studentClass) {
            userData.studentClass = studentClass;
        }

        if (school) {
            userData.school = school;
        }

        const user = await prisma.user.create({
            data: userData,
        });

        // Create additional profiles if needed
        if (role === "STUDENT") {
            await prisma.studentProfile.create({
                data: {
                    userId: user.id,
                    studentId: `STU${Date.now().toString().slice(-6)}`,
                },
            });
        }

        return NextResponse.json(
            { message: "User created successfully", userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error("Admin user creation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const users = await (prisma.user.findMany as any)({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                studentClass: true,
                school: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            );
        }

        const { id, name, email, role, studentClass, school, password } = await req.json();

        if (!id || !name || !email || !role) {
            return NextResponse.json(
                { error: "ID, name, email, and role are required" },
                { status: 400 }
            );
        }

        // Check if email is being changed and if it's already taken
        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (email !== existingUser.email) {
            const emailTaken = await prisma.user.findUnique({
                where: { email },
            });
            if (emailTaken) {
                return NextResponse.json(
                    { error: "Email is already taken" },
                    { status: 400 }
                );
            }
        }

        // Prepare update data
        const updateData: any = { name, email, role };

        if (role === "STUDENT" && studentClass) {
            updateData.studentClass = studentClass;
        }

        if (school) {
            updateData.school = school;
        }

        // If password change is requested
        if (password && password.length >= 6) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                studentClass: true,
                school: true,
            },
        });

        return NextResponse.json({
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Prevent deleting yourself
        if (id === session.user.id) {
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            );
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
