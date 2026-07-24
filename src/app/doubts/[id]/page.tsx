import { notFound, redirect } from "next/navigation";
import { db } from "@/configs/db";
import { doubtsTable, classroomsTable, membershipsTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import DoubtPermalinkClient from "./DoubtPermalinkClient";
import type { Metadata } from "next";
import { toPublicDoubt } from "@/lib/anonymity/anonymity";

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    const doubtId = parseInt(id, 10);
    if (isNaN(doubtId)) {
        return {
            title: "Doubt Not Found",
        };
    }

    try {
        const [doubt] = await db
            .select({
                subject: doubtsTable.subject,
                content: doubtsTable.content,
            })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!doubt) {
            return {
                title: "Doubt Not Found",
            };
        }

        const title = doubt.subject || "Doubt Thread";
        const contentSnippet = doubt.content
            ? doubt.content.slice(0, 150) + (doubt.content.length > 150 ? "..." : "")
            : "View this doubt on DoubtDesk.";

        return {
            title,
            description: contentSnippet,
        };
    } catch {
        return {
            title: "Doubt Thread",
        };
    }
}

export default async function DoubtPermalinkPage(
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const doubtId = parseInt(id, 10);

    if (isNaN(doubtId)) {
        notFound();
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;

    // Fetch the single doubt
    const [doubt] = await db
        .select()
        .from(doubtsTable)
        .where(eq(doubtsTable.id, doubtId))
        .limit(1);

    if (!doubt) {
        notFound();
    }

    // Classroom membership check
    if (doubt.classroomId) {
        if (!email) {
            redirect("/sign-in");
        }

        // Check membership
        const [membership] = await db
            .select({ role: membershipsTable.role })
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.userEmail, email),
                    eq(membershipsTable.classroomId, doubt.classroomId)
                )
            );

        let role = membership?.role ?? null;
        if (!role) {
            // Check if teacher owns the classroom
            const [ownedClassroom] = await db
                .select()
                .from(classroomsTable)
                .where(
                    and(
                        eq(classroomsTable.id, doubt.classroomId),
                        eq(classroomsTable.teacherEmail, email)
                    )
                );
            if (ownedClassroom) {
                role = "owner";
            }
        }

        if (!role) {
            redirect("/403");
        }

        // Teacher doubts visibility rules
        if (doubt.type === "teacher") {
            const isTeacher = ["teacher", "owner", "admin"].includes(role.toLowerCase());
            const isAuthor = doubt.userEmail === email;
            if (!isTeacher && !isAuthor) {
                redirect("/403");
            }
        }
    }

    // Sanitize before handing the row to a client component: props serialized into
    // the RSC payload are visible in the browser, so the raw userEmail/embedding must
    // be stripped here just as the API does. All server-side checks above used the
    // raw row; only the client-facing shape is anonymized.
    return (
        <DoubtPermalinkClient initialDoubt={toPublicDoubt(doubt, email) as any} />
    );
}
