import {
    getAnonymousHandle,
    getAnonymousInitial,
    isOwnAuthor,
    toPublicAuthored,
    toPublicDoubt,
    toPublicReply,
} from "@/lib/anonymity";

describe("anonymity: getAnonymousHandle", () => {
    it("returns 'Anonymous' when there is no email", () => {
        expect(getAnonymousHandle(null)).toBe("Anonymous");
        expect(getAnonymousHandle(undefined)).toBe("Anonymous");
        expect(getAnonymousHandle("")).toBe("Anonymous");
    });

    it("is deterministic for the same email", () => {
        expect(getAnonymousHandle("alice@example.com")).toBe(
            getAnonymousHandle("alice@example.com"),
        );
    });

    it("produces a Student_XXXXX style handle", () => {
        expect(getAnonymousHandle("alice@example.com")).toMatch(/^Student_[A-Z0-9]{5}$/);
    });

    it("is case- and whitespace-insensitive", () => {
        expect(getAnonymousHandle("  Alice@Example.com ")).toBe(
            getAnonymousHandle("alice@example.com"),
        );
    });

    it("never leaks the email or its local-part", () => {
        const handle = getAnonymousHandle("janedoe@university.edu");
        expect(handle).not.toContain("janedoe");
        expect(handle).not.toContain("university");
        expect(handle).not.toContain("@");
    });

    it("maps different emails to different handles", () => {
        const a = getAnonymousHandle("a@example.com");
        const b = getAnonymousHandle("b@example.com");
        const c = getAnonymousHandle("c@example.com");
        expect(new Set([a, b, c]).size).toBe(3);
    });
});

describe("anonymity: fail closed in production", () => {
    // NODE_ENV is typed read-only, so assign through a mutable view in tests.
    const mutableEnv = process.env as Record<string, string | undefined>;
    const origEnv = process.env.NODE_ENV;
    const origSalt = process.env.ANON_HANDLE_SALT;

    afterEach(() => {
        if (origEnv === undefined) delete mutableEnv.NODE_ENV;
        else mutableEnv.NODE_ENV = origEnv;
        if (origSalt === undefined) delete mutableEnv.ANON_HANDLE_SALT;
        else mutableEnv.ANON_HANDLE_SALT = origSalt;
    });

    it("throws when ANON_HANDLE_SALT is missing in production", () => {
        delete process.env.ANON_HANDLE_SALT;
        mutableEnv.NODE_ENV = "production";
        expect(() => getAnonymousHandle("user@example.com")).toThrow(/ANON_HANDLE_SALT/);
    });

    it("uses the deterministic default outside production", () => {
        delete process.env.ANON_HANDLE_SALT;
        mutableEnv.NODE_ENV = "test";
        expect(getAnonymousHandle("user@example.com")).toMatch(/^Student_[A-Z0-9]{5}$/);
    });

    it("uses the provided salt in production without throwing", () => {
        mutableEnv.NODE_ENV = "production";
        process.env.ANON_HANDLE_SALT = "a-real-production-salt";
        expect(getAnonymousHandle("user@example.com")).toMatch(/^Student_[A-Z0-9]{5}$/);
    });
});


describe("anonymity: getAnonymousInitial", () => {
    it("returns a single character derived from the handle, not the email", () => {
        const initial = getAnonymousInitial("zach@example.com");
        expect(initial).toHaveLength(1);
        // The avatar letter must not simply echo the email's first character.
        expect(initial).toBe(
            getAnonymousHandle("zach@example.com").replace(/^Student_/, "").charAt(0),
        );
    });

    it("falls back to a letter for anonymous authors", () => {
        expect(getAnonymousInitial(null)).toBe("A");
    });
});

describe("anonymity: isOwnAuthor", () => {
    it("matches case-insensitively", () => {
        expect(isOwnAuthor("User@Example.com", "user@example.com")).toBe(true);
    });
    it("is false when either side is missing", () => {
        expect(isOwnAuthor(null, "user@example.com")).toBe(false);
        expect(isOwnAuthor("user@example.com", null)).toBe(false);
        expect(isOwnAuthor(undefined, undefined)).toBe(false);
    });
    it("is false for different users", () => {
        expect(isOwnAuthor("a@example.com", "b@example.com")).toBe(false);
    });
});

describe("anonymity: toPublicAuthored", () => {
    const authorEmail = "author@example.com";
    const rawDoubt = {
        id: 7,
        userEmail: authorEmail,
        subject: "Calculus",
        content: "limits?",
        likes: 3,
        type: "community",
        embedding: [0.1, 0.2, 0.3],
        deletedAt: null,
        tags: [{ id: 1, name: "math", normalizedName: "math" }],
        hasLiked: true,
    };

    it("strips userEmail, embedding and deletedAt", () => {
        const pub = toPublicAuthored(rawDoubt, "viewer@example.com") as Record<string, unknown>;
        expect(pub).not.toHaveProperty("userEmail");
        expect(pub).not.toHaveProperty("embedding");
        expect(pub).not.toHaveProperty("deletedAt");
    });

    it("adds author handle, initial and isOwnPost", () => {
        const pub = toPublicAuthored(rawDoubt, "viewer@example.com");
        expect(pub.author).toBe(getAnonymousHandle(authorEmail));
        expect(pub.authorInitial).toBe(getAnonymousInitial(authorEmail));
        expect(pub.isOwnPost).toBe(false);
    });

    it("sets isOwnPost true when the viewer is the author", () => {
        expect(toPublicAuthored(rawDoubt, authorEmail).isOwnPost).toBe(true);
        expect(toPublicAuthored(rawDoubt, "AUTHOR@example.com").isOwnPost).toBe(true);
    });

    it("preserves all other fields", () => {
        const pub = toPublicAuthored(rawDoubt, "viewer@example.com") as any;
        expect(pub.id).toBe(7);
        expect(pub.subject).toBe("Calculus");
        expect(pub.content).toBe("limits?");
        expect(pub.likes).toBe(3);
        expect(pub.hasLiked).toBe(true);
        expect(pub.tags).toEqual([{ id: 1, name: "math", normalizedName: "math" }]);
    });

    it("never serializes the author email anywhere in the output", () => {
        const serialized = JSON.stringify(toPublicAuthored(rawDoubt, "viewer@example.com"));
        expect(serialized).not.toContain(authorEmail);
        expect(serialized).not.toContain("author@");
    });

    it("strips author identity aliases beyond userEmail", () => {
        const joinedRow = {
            id: 1,
            userEmail: "a@example.com",
            authorEmail: "a@example.com",
            userId: 99,
            authorId: 99,
            clerkId: "user_abc123",
            email: "a@example.com",
            name: "Alice Author",
            subject: "X",
        };
        const pub = toPublicAuthored(joinedRow, "viewer@example.com") as Record<string, unknown>;
        for (const key of [
            "userEmail",
            "authorEmail",
            "userId",
            "authorId",
            "clerkId",
            "email",
            "name",
        ]) {
            expect(pub).not.toHaveProperty(key);
        }
        const serialized = JSON.stringify(pub);
        expect(serialized).not.toContain("Alice Author");
        expect(serialized).not.toContain("user_abc123");
        expect(serialized).not.toContain("a@example.com");
    });

    it("toPublicDoubt and toPublicReply behave the same as toPublicAuthored", () => {
        expect(toPublicDoubt(rawDoubt, "viewer@example.com")).toEqual(
            toPublicAuthored(rawDoubt, "viewer@example.com"),
        );
        const reply = { id: 1, doubtId: 7, userEmail: authorEmail, content: "hi", upvotes: 0 };
        expect(toPublicReply(reply, "viewer@example.com")).toEqual(
            toPublicAuthored(reply, "viewer@example.com"),
        );
    });
});
