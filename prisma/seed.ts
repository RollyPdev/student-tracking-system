const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create Classes
    const classA = await prisma.class.upsert({
        where: { name: "Grade 10 - Science" },
        update: {},
        create: {
            name: "Grade 10 - Science",
            description: "Science stream students",
        },
    });

    const classB = await prisma.class.upsert({
        where: { name: "Grade 10 - Arts" },
        update: {},
        create: {
            name: "Grade 10 - Arts",
            description: "Arts stream students",
        },
    });

    // Create Admin
    await prisma.user.upsert({
        where: { email: "admin@tracking.com" },
        update: {},
        create: {
            email: "admin@tracking.com",
            name: "Admin User",
            password: hashedPassword,
            role: "ADMIN",
        },
    });

    // Create Student
    const studentUser = await prisma.user.upsert({
        where: { email: "student@tracking.com" },
        update: {},
        create: {
            email: "student@tracking.com",
            name: "John Doe",
            password: hashedPassword,
            role: "STUDENT",
        },
    });

    await prisma.studentProfile.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
            userId: studentUser.id,
            studentId: "STU001",
            classId: classA.id,
        },
    });

    console.log("Seed data created successfully");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
