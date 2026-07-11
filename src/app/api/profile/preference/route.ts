import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { eq } from "drizzle-orm";

const ALLOWED_AVATARS = ["default", "student", "teacher", "coder", "scientist", "artist", "gamer", "ninja"];
const ALLOWED_BANNERS = ["none", "ocean", "sunset", "forest", "galaxy", "fire"];

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 400 });

  const result = await db
    .select({
      avatarPreference: usersTable.avatarPreference,
      bannerPreference: usersTable.bannerPreference,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  return NextResponse.json({ preferences: result[0] ?? {} });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 400 });

  const body = await req.json();
  const { avatarPreference, bannerPreference } = body;

  if (avatarPreference && !ALLOWED_AVATARS.includes(avatarPreference)) {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }
  if (bannerPreference && !ALLOWED_BANNERS.includes(bannerPreference)) {
    return NextResponse.json({ error: "Invalid banner" }, { status: 400 });
  }

  await db
    .update(usersTable)
    .set({
      ...(avatarPreference && { avatarPreference }),
      ...(bannerPreference && { bannerPreference }),
    })
    .where(eq(usersTable.email, email));

  return NextResponse.json({ success: true });
}