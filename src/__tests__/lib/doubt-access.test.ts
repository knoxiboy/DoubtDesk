import { getDoubtReadDenial } from "@/lib/doubts/doubt-access";

const doubt = {
  userEmail: "author@example.com",
  type: "community",
  isHidden: true,
};

describe("getDoubtReadDenial", () => {
  it("denies hidden doubts to classmates", () => {
    const denial = getDoubtReadDenial("student@example.com", doubt, { role: "student" });
    expect(denial).toEqual({ status: 404, error: "Doubt not found" });
  });

  it("allows the author to read a hidden doubt", () => {
    expect(getDoubtReadDenial("author@example.com", doubt, { role: "student" })).toBeNull();
  });

  it("allows teachers to read a hidden doubt", () => {
    expect(getDoubtReadDenial("teacher@example.com", doubt, { role: "teacher" })).toBeNull();
  });

  it("denies teacher-type doubts to non-teachers who are not the author", () => {
    const denial = getDoubtReadDenial(
      "student@example.com",
      { ...doubt, type: "teacher", isHidden: false },
      { role: "student" },
    );
    expect(denial).toEqual({ status: 403, error: "Access denied" });
  });
});
