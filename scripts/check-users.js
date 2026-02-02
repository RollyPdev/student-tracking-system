const { PrismaClient } = require("@prisma/client");

async function main() {
    const prisma = new PrismaClient();
    try {
        const email = 'student@tracking.com';
        console.log(`Checking user: ${email}...`);
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log("User not found.");
        } else {
            console.log("User found:", user.email, user.role);
            if (user.image) {
                console.log(`Image field length: ${user.image.length} chars`);
                if (user.image.length > 200) {
                    console.log("Image seems to be a large string (possibly base64). Sample:", user.image.substring(0, 50) + "...");
                } else {
                    console.log("Image value:", user.image);
                }
            } else {
                console.log("Image field is null/empty.");
            }
        }

        console.log("-----------------------------------\n");
    } catch (error) {
        console.error("Error connecting to database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
