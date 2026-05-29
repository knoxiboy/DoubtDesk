// scripts/seed-badges.ts
// Run once to populate badge_definitions table:
//   npx tsx scripts/seed-badges.ts

import { db } from "@/configs/db";
import { badgeDefinitionsTable } from "@/configs/schema";

const BADGES = [
    // ── Subject-based badges ───────────────────────────────────────────────────
    {
        slug:        "math_wizard",
        name:        "Math Wizard 🧙‍♂️",
        description: "Solved 10 math doubts in the community.",
        icon:        "🧙‍♂️",
        condition:   JSON.stringify({ type: "subject_answers", subject: "Math", count: 10 }),
    },
    {
        slug:        "physics_pro",
        name:        "Physics Pro ⚛️",
        description: "Solved 10 physics doubts.",
        icon:        "⚛️",
        condition:   JSON.stringify({ type: "subject_answers", subject: "Physics", count: 10 }),
    },
    {
        slug:        "code_guru",
        name:        "Code Guru 💻",
        description: "Solved 10 programming doubts.",
        icon:        "💻",
        condition:   JSON.stringify({ type: "subject_answers", subject: "Programming", count: 10 }),
    },
    {
        slug:        "chemistry_champion",
        name:        "Chemistry Champion 🧪",
        description: "Solved 10 chemistry doubts.",
        icon:        "🧪",
        condition:   JSON.stringify({ type: "subject_answers", subject: "Chemistry", count: 10 }),
    },

    // ── Streak badges ──────────────────────────────────────────────────────────
    {
        slug:        "helper_streak_3",
        name:        "Helper Streak 🔥",
        description: "Active contributions for 3 days in a row.",
        icon:        "🔥",
        condition:   JSON.stringify({ type: "streak_days", days: 3 }),
    },
    {
        slug:        "helper_streak_7",
        name:        "Week Warrior 📅",
        description: "Active contributions for 7 days in a row.",
        icon:        "📅",
        condition:   JSON.stringify({ type: "streak_days", days: 7 }),
    },
    {
        slug:        "helper_streak_30",
        name:        "Monthly Master 🗓️",
        description: "Active contributions for 30 days in a row.",
        icon:        "🗓️",
        condition:   JSON.stringify({ type: "streak_days", days: 30 }),
    },

    // ── Karma milestone badges ─────────────────────────────────────────────────
    {
        slug:        "karma_100",
        name:        "Rising Star ⭐",
        description: "Reached 100 Karma points.",
        icon:        "⭐",
        condition:   JSON.stringify({ type: "karma_milestone", karma: 100 }),
    },
    {
        slug:        "karma_500",
        name:        "Community Pillar 🏛️",
        description: "Reached 500 Karma points.",
        icon:        "🏛️",
        condition:   JSON.stringify({ type: "karma_milestone", karma: 500 }),
    },
    {
        slug:        "karma_1500",
        name:        "Legend 🏆",
        description: "Reached 1500 Karma points — the highest honour.",
        icon:        "🏆",
        condition:   JSON.stringify({ type: "karma_milestone", karma: 1500 }),
    },

    // ── Answer quality badges ──────────────────────────────────────────────────
    {
        slug:        "first_accepted",
        name:        "Problem Solver 🎯",
        description: "Got your first answer accepted as the solution.",
        icon:        "🎯",
        condition:   JSON.stringify({ type: "accepted_answers", count: 1 }),
    },
    {
        slug:        "accepted_10",
        name:        "Solution Machine ⚙️",
        description: "Got 10 answers accepted as solutions.",
        icon:        "⚙️",
        condition:   JSON.stringify({ type: "accepted_answers", count: 10 }),
    },
    {
        slug:        "answers_50",
        name:        "Prolific Helper 🤝",
        description: "Posted 50 answers across the platform.",
        icon:        "🤝",
        condition:   JSON.stringify({ type: "total_answers", count: 50 }),
    },
];

async function main() {
    console.log("🌱 Seeding badge definitions...");

    for (const badge of BADGES) {
        await db
            .insert(badgeDefinitionsTable)
            .values(badge)
            .onConflictDoNothing(); // idempotent — safe to run multiple times
    }

    console.log(`✅ Seeded ${BADGES.length} badge definitions.`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});