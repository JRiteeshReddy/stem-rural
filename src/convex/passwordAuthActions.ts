"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { scrypt as scryptCb, randomBytes, createHash, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (!storedHash || !storedHash.startsWith("scrypt:")) return false;
    const [, saltHex, keyHex] = storedHash.split(":");
    if (!saltHex || !keyHex) return false;

    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");
    const derived = (await scrypt(password, salt, expected.length)) as Buffer;

    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function parseCookieHeader(header?: string | null): Record<string, string> {
  if (!header) return {};
  const entries = header.split("; ").map((c) => {
    const idx = c.indexOf("=");
    if (idx === -1) return [c, ""];
    return [c.slice(0, idx), c.slice(idx + 1)];
  });
  return Object.fromEntries(entries);
}

export const register = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("teacher"), v.literal("student")),
    userClass: v.union(
      v.literal("Class 6"),
      v.literal("Class 7"),
      v.literal("Class 8"),
      v.literal("Class 9"),
      v.literal("Class 10"),
      v.literal("Class 11"),
      v.literal("Class 12"),
    ),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const name = args.name.trim();
    const emailLower = args.email.toLowerCase();
    const { password, role, userClass } = args;

    if (!name || !emailLower || !password || password.length < 8) {
      throw new Error("Invalid registration data");
    }

    // Safe email lookup (won't throw on duplicates)
    const existing: any = await ctx.runQuery(internal.passwordAuth.getUserByEmail, { email: emailLower });

    const passwordHash = await hashPassword(password);

    if (existing) {
      // If the account already has a password, treat as duplicate account
      if (existing.passwordHash) {
        throw new Error("Account already exists");
      }
      // Convert OTP-created account into password account
      await ctx.runMutation(internal.passwordAuth.setUserPassword, {
        userId: existing._id,
        passwordHash,
        passwordAlgo: "scrypt",
      });
      await ctx.runMutation(internal.passwordAuth.updateUserOnRegister, {
        userId: existing._id,
        name,
        role,
        userClass,
      });
      return { ok: true };
    }

    // Create a new user
    await ctx.runMutation(internal.passwordAuth.createUser, {
      name,
      email: emailLower,
      passwordHash,
      passwordAlgo: "scrypt",
      role,
      userClass,
      credits: role === "student" ? 0 : undefined,
      rank: role === "student" ? "Bronze" : undefined,
      totalTestsCompleted: role === "student" ? 0 : undefined,
      totalCoursesCreated: role === "teacher" ? 0 : undefined,
      totalStudentsEnrolled: role === "teacher" ? 0 : undefined,
    });

    return { ok: true };
  },
});

export const login = internalAction({
  args: {
    email: v.string(),
    password: v.string(),
    userAgent: v.optional(v.string()),
    ip: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { email, password, userAgent, ip },
  ): Promise<{ token: string; user: any }> => {
    const emailLower = email.toLowerCase();
    const user: any = await ctx.runQuery(internal.passwordAuth.getUserByEmail, { email: emailLower });
    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const token = randomToken();
    const tokenHash = sha256Hex(token);

    await ctx.runMutation(internal.passwordAuth.createSession, {
      userId: user._id,
      tokenHash,
      userAgent,
      ip,
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    });

    await ctx.runMutation(internal.passwordAuth.touchLastLogin, { userId: user._id });

    const summary: any = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      rank: user.rank,
      totalTestsCompleted: user.totalTestsCompleted,
      totalCoursesCreated: user.totalCoursesCreated,
      totalStudentsEnrolled: user.totalStudentsEnrolled,
      userClass: user.userClass,
      image: user.image,
    };

    return { token, user: summary };
  },
});

export const logout = internalAction({
  args: { cookieHeader: v.optional(v.string()) },
  handler: async (ctx, { cookieHeader }): Promise<{ ok: true }> => {
    const cookies = parseCookieHeader(cookieHeader ?? undefined);
    const session = cookies.session;
    if (session) {
      const tokenHash = sha256Hex(session);
      await ctx.runMutation(internal.passwordAuth.revokeSessionByTokenHash, { tokenHash });
    }
    return { ok: true };
  },
});

export const me = internalAction({
  args: { cookieHeader: v.optional(v.string()) },
  handler: async (ctx, { cookieHeader }): Promise<{ user: any | null }> => {
    const cookies = parseCookieHeader(cookieHeader ?? undefined);
    const token = cookies.session;
    if (!token) {
      return { user: null };
    }
    const tokenHash = sha256Hex(token);
    const session: any = await ctx.runQuery(internal.passwordAuth.getSessionByTokenHash, { tokenHash });
    if (!session) {
      return { user: null };
    }
    const user: any = await ctx.runQuery(internal.passwordAuth.getUserById, { userId: session.userId });
    if (!user) {
      return { user: null };
    }
    const summary: any = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      rank: user.rank,
      totalTestsCompleted: user.totalTestsCompleted,
      totalCoursesCreated: user.totalCoursesCreated,
      totalStudentsEnrolled: user.totalStudentsEnrolled,
      userClass: user.userClass,
      image: user.image,
    };
    return { user: summary };
  },
});