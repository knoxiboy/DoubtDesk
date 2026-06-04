export const ROLE_HIERARCHY = {
  owner: 5,
  teacher: 4,
  "co-teacher": 3,
  moderator: 2,
  student: 1,
};

export function hasRole(
  role: string,
  required: keyof typeof ROLE_HIERARCHY
) {
  return (
    ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] >=
    ROLE_HIERARCHY[required]
  );
}

export function canModerate(role: string) {
  return hasRole(role, "moderator");
}

export function canTeach(role: string) {
  return hasRole(role, "teacher");
}