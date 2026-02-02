const { PrismaClient } = require("@prisma/client");

async function main() {
    const prisma = new PrismaClient();
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                role: true,
                name: true,
            }
        });

        console.log("\n--- Registered Users in Database ---");
        if (users.length === 0) {
            console.log("No users found.");
        } else {
            console.table(users);
        }
        console.log("-----------------------------------\n");
    } catch (error) {
        console.error("Error connecting to database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
