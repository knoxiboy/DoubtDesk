import { GET } from "@/app/api/recommendations/route";
import { db } from "@/configs/db";
import { currentUser } from "@clerk/nextjs/server";
import { calculateRecommendationScore } from "@/lib/ai/recommendation";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/ai/recommendation", () => ({
  calculateRecommendationScore: jest.fn().mockReturnValue(1),
}));

jest.mock("@/configs/schema", () => ({
  usersTable: {
    email: {},
    university: {},
    year: {},
    role: {},
  },
  classroomsTable: {
    id: {},
    organizationId: {},
    name: {},
    university: {},
    year: {},
    teacherEmail: {},
    inviteCode: {},
    inviteCodeExpiresAt: {},
    allowedEmailDomains: {},
  },
  membershipsTable: {
    classroomId: {},
    userEmail: {},
    role: {},
  },
  doubtsTable: {
    classroomId: {},
  },
}));

const currentUserMock = currentUser as jest.MockedFunction<typeof currentUser>;
const scoreMock = calculateRecommendationScore as jest.Mock;

const extractStrings = (value: any): string[] => {
  const out: string[] = [];
  const seen = new WeakSet();

  const walk = (node: any) => {
    if (!node || typeof node !== "object") {
      if (typeof node === "string" || typeof node === "number") {
        out.push(String(node));
      }
      return;
    }

    if (seen.has(node)) return;
    seen.add(node);

    if (typeof node.name === "string") {
      out.push(node.name);
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    for (const key of Object.keys(node)) {
      walk(node[key]);
    }
  };

  walk(value);
  return out;
};

const classrooms = [
  {
    id: 10,
    organizationId: null,
    name: "Public Math",
    university: "Uni",
    year: "2",
    teacherEmail: "teacher@example.com",
  },
  {
    id: 11,
    organizationId: 99,
    name: "Private Org Physics",
    university: "Uni",
    year: "2",
    teacherEmail: "teacher@example.com",
  },
];

const createQuery = () => {
  let table: any;
  let fields: any;
  let hasGroupBy = false;
  let condition: any;

  const query: any = {
    from: jest.fn((value: any) => {
      table = value;
      return query;
    }),
    where: jest.fn((value: any) => {
      condition = value;
      return query;
    }),
    groupBy: jest.fn(() => {
      hasGroupBy = true;
      return query;
    }),
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    then: (resolve: (value: any[]) => unknown) => {
      const tableName = table?.id ? "classrooms" : table?.email ? "users" : table?.classroomId ? "memberships" : "unknown";
      const info = extractStrings(condition);

      if (tableName === "users") {
        return Promise.resolve(resolve([
          { email: "student@example.com", university: "Uni", year: "2", role: "student" },
        ]));
      }

      if (tableName === "memberships" && !hasGroupBy) {
        return Promise.resolve(resolve([{ classroomId: 42 }]));
      }

      if (tableName === "classrooms") {
        return Promise.resolve(resolve(
          info.some((item) => item.includes("organizationId")) ? [classrooms[0]] : classrooms,
        ));
      }

      if (tableName === "memberships" && hasGroupBy) {
        return Promise.resolve(resolve([
          { classroomId: 10, count: 4 },
          { classroomId: 11, count: 2 },
        ]));
      }

      if (tableName === "unknown") {
        return Promise.resolve(resolve([]));
      }

      return Promise.resolve(resolve([]));
    },
  };

  Object.defineProperty(query, "fields", {
    get: () => fields,
    set: (value) => {
      fields = value;
    },
  });

  return new Proxy(query, {
    get(target, prop, receiver) {
      if (prop === "fields") return Reflect.get(target, prop, receiver);
      return Reflect.get(target, prop, receiver);
    },
  });
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn((fields?: any) => {
      const query: any = createQuery();
      query.fields = fields;
      return query;
    }),
  },
}));

const selectMock = db.select as jest.Mock;

describe("recommendations route", () => {
  beforeEach(() => {
    currentUserMock.mockReset();
    scoreMock.mockReset().mockReturnValue(1);
    selectMock.mockClear();
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    } as never);
  });

  it("excludes organization classrooms from recommendations", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.recommendations).toHaveLength(1);
    expect(json.recommendations[0]).toMatchObject({
      id: 10,
      organizationId: null,
    });
    expect(json.recommendations.some((row: any) => row.organizationId !== null)).toBe(false);
  });
});
