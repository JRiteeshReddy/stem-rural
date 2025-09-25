import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { PASSWORD_AUTH_ENABLED } from "./_shared/authFlags";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Password authentication endpoints
http.route({
  path: "/api/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!PASSWORD_AUTH_ENABLED) {
      return new Response("Not Implemented", { status: 501 });
    }

    try {
      const { name, email, password, role, userClass } = await req.json();
      
      if (!name || !email || !password || !role || !userClass) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (password.length < 8) {
        return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await ctx.runAction(internal.passwordAuthActions.register, {
        name,
        email,
        password,
        role,
        userClass,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!PASSWORD_AUTH_ENABLED) {
      return new Response("Not Implemented", { status: 501 });
    }

    try {
      const { email, password } = await req.json();
      
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await ctx.runAction(internal.passwordAuthActions.login, {
        email,
        password,
        userAgent: req.headers.get("user-agent") || undefined,
        ip: parseIP(req),
      });

      const cookie = serializeCookie("session", result.token, { secure: true });

      return new Response(JSON.stringify({ user: result.user }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Login failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/auth/logout",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!PASSWORD_AUTH_ENABLED) {
      return new Response("Not Implemented", { status: 501 });
    }

    try {
      const cookieHeader = req.headers.get("cookie") || undefined;
      await ctx.runAction(internal.passwordAuthActions.logout, { cookieHeader });

      const clearCookie = serializeCookie("session", "", { maxAge: 0 });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": clearCookie,
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Logout failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/auth/me",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!PASSWORD_AUTH_ENABLED) {
      return new Response("Not Implemented", { status: 501 });
    }

    try {
      const cookieHeader = req.headers.get("cookie") || undefined;

      const result = await ctx.runAction(internal.passwordAuthActions.me, { cookieHeader });
      if (!result.user) {
        return new Response("Unauthorized", { status: 401 });
      }

      return new Response(JSON.stringify({ user: result.user }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response("Unauthorized", { status: 401 });
    }
  }),
});

function serializeCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    path?: string;
    maxAge?: number;
    expires?: Date;
    domain?: string;
  } = {},
) {
  const parts: string[] = [];
  parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);

  const path = options.path ?? "/";
  parts.push(`Path=${path}`);

  const httpOnly = options.httpOnly ?? true;
  if (httpOnly) parts.push("HttpOnly");

  const secure = options.secure ?? true;
  if (secure) parts.push("Secure");

  const sameSite = options.sameSite ?? "Lax";
  parts.push(`SameSite=${sameSite}`);

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  return parts.join("; ");
}

function parseIP(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return undefined;
}

export default http;