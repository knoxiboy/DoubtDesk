import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '../src/configs/database-url';

const sql = neon(getDatabaseUrl());

async function main() {
    try {
        console.log("Fetching Doubt ID 83...");
        const doubt = await sql`
            SELECT * FROM doubts WHERE id = 83;
        `;
        console.log("Doubt 83 data:", JSON.stringify(doubt, null, 2));

        if (doubt.length > 0 && doubt[0].userEmail) {
            console.log(`\nFetching user profile for email: ${doubt[0].userEmail}...`);
            const user = await sql`
                SELECT * FROM users WHERE email = ${doubt[0].userEmail};
            `;
            console.log("User Profile:", JSON.stringify(user, null, 2));
        } else {
            console.log("\nNo user email associated with Doubt 83 or Doubt 83 not found.");
        }

    } catch (error) {
        console.error("Error inspecting database:", error);
    }
}

main();
