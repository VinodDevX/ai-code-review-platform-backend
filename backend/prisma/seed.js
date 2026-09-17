require("dotenv/config");
const { Pool } = require("pg");
const prisma = require("../src/config/database");
const { hashPassword } = require("../src/utils/password");

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

async function main() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const tokenHash = '\$2b\$10\$7vN3Y6vK67W0XfG9U8T7e.5JgZ3oYwXyZmVkU7tB3nC6mDx9lKi6a';

    const user = await prisma.user.upsert({
        where: { email: "vinod@thoughtwin.com" },
        update: {},
        create: {
            email: "vinod@thoughtwin.com",
            name: "Alice",
            passwordHash: await hashPassword("test@123"),
            isEmailVerified: true,
            isActive: true
        },
    });

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: tokenHash,
            expiresAt: expiresAt,
        }
    });

    console.log(`✅ User seeded successfully!`);
    console.log(`📧 Email: vinod@thoughtwin.com`);
    console.log(`🔑 Password: test@123`);
    console.log(`🔄 Refresh Token linked and active until: ${expiresAt.toISOString()}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
        await pool.end();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        await pool.end();
        process.exit(1);
    });