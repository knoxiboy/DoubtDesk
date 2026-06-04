import {
  generateInviteToken,
  getInviteExpiry,
  hashInviteToken,
} from "@/lib/invite-token";

describe("invite token utilities", () => {
  it("generates non-empty unique invite tokens", () => {
    const tokenA = generateInviteToken();
    const tokenB = generateInviteToken();

    expect(tokenA).toBeTruthy();
    expect(tokenB).toBeTruthy();
    expect(tokenA).not.toBe(tokenB);
    expect(tokenA.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes tokens deterministically", () => {
    const token = "sample-token";

    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toBe(hashInviteToken("different-token"));
  });

  it("creates future expiry dates", () => {
    const expiry = getInviteExpiry(1);

    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });
});
