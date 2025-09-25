import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const createUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    passwordAlgo: v.literal("scrypt"),
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
    credits: v.optional(v.number()),
    rank: v.optional(v.string()),
    totalTestsCompleted: v.optional(v.number()),
    totalCoursesCreated: v.optional(v.number()),
    totalStudentsEnrolled: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    tokenHash: v.string(),
    userAgent: v.optional(v.string()),
    ip: v.optional(v.string()),
    ttlMs: v.number(),
  },
  handler: async (ctx, { userId, tokenHash, userAgent, ip, ttlMs }) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      tokenHash,
      userAgent,
      ip,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
    return sessionId;
  },
});

export const revokeSessionByTokenHash = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .collect();
    
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email.toLowerCase()))
      .unique();
  },
});

export const setUserPassword = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
    passwordAlgo: v.literal("scrypt"),
  },
  handler: async (ctx, { userId, passwordHash, passwordAlgo }) => {
    await ctx.db.patch(userId, {
      passwordHash,
      passwordAlgo,
    });
  },
});

export const touchLastLogin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, {
      lastLoginAt: Date.now(),
    });
  },
});

export const getSessionByTokenHash = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    
    return session;
  },
});