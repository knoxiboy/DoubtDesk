import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { organizationsTable, organizationMembershipsTable, usersTable } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { errorResponse, buildErrorResponse } from '@/lib/errors/error-handler';
import { checkUserBlock } from '@/lib/auth/auth-utils';
import { z } from 'zod';

// FIXED: Tightened schema validation to match db varchar(255) constraints
const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(255),
  slug: z.string().trim().toLowerCase().min(2, "Slug must be at least 2 characters").max(255).regex(/^[a-z0-9-]+$/, "Slug format invalid"),
});

// GET: Fetch organizations the user belongs to
export async function GET() {
  try {
    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
      return errorResponse('Unauthorized', 401);
    }
    const email = user.primaryEmailAddress.emailAddress;

    const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
    if (isBlocked) return blockErrorResponse;

    const userOrgs = await db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        slug: organizationsTable.slug,
        ownerEmail: organizationsTable.ownerEmail,
        role: organizationMembershipsTable.role,
        createdAt: organizationsTable.createdAt,
      })
      .from(organizationsTable)
      .innerJoin(
        organizationMembershipsTable,
        eq(organizationsTable.id, organizationMembershipsTable.organizationId)
      )
      .where(eq(organizationMembershipsTable.userEmail, email));

    return NextResponse.json(userOrgs);
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// POST: Register a brand new coaching organization
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
      return errorResponse('Unauthorized', 401);
    }
    const email = user.primaryEmailAddress.emailAddress;

    const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
    if (isBlocked) return blockErrorResponse;

    // FIXED: Verify local profile exists before creating foreign key relation
    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!dbUser) {
      return errorResponse('User profile not found', 403);
    }

    const jsonBody = await req.json();
    const parsed = createOrgSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    const { name, slug } = parsed.data;

    // Verify slug uniqueness
    const [existingOrg] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug));

    if (existingOrg) {
      return errorResponse('An organization with this identifier slug already exists', 409);
    }

    const createdOrg = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizationsTable)
        .values({
          name,
          slug,
          ownerEmail: email,
        })
        .returning();

      await tx.insert(organizationMembershipsTable).values({
        organizationId: org.id,
        userEmail: email,
        role: 'owner',
      });

      return org;
    });

    return NextResponse.json(createdOrg, { status: 201 });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
