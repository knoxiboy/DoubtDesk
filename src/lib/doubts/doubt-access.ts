export type DoubtVisibilityRow = {
  userEmail?: string | null;
  type?: string | null;
  isHidden?: boolean | null;
};

const TEACHER_ROLES = new Set(["teacher", "owner", "admin"]);

function isTeacherRole(role?: string) {
  return !!role && TEACHER_ROLES.has(role);
}

/**
 * Visibility rules matching GET /api/doubts/[id]:
 * teachers and the author may read hidden threads; everyone else cannot.
 * Teacher-type doubts stay restricted to teachers and the author.
 */
export function getDoubtReadDenial(
  email: string | null | undefined,
  doubt: DoubtVisibilityRow,
  membership: { role: string } | null | undefined,
): { status: 403 | 404; error: string } | null {
  const isTeacher = isTeacherRole(membership?.role);
  const isAuthor = !!(email && doubt.userEmail === email);

  if (doubt.type === "teacher" && !isTeacher && !isAuthor) {
    return { status: 403, error: "Access denied" };
  }

  if (doubt.isHidden && !isTeacher && !isAuthor) {
    return { status: 404, error: "Doubt not found" };
  }

  return null;
}

