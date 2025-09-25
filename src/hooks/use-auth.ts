import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { PASSWORD_AUTH_ENABLED } from "@/lib/authFlags";
import { useEffect, useState } from "react";

interface PasswordAuthUser {
  _id: string;
  name?: string;
  email?: string;
  role?: "teacher" | "student";
  credits?: number;
  rank?: string;
  totalTestsCompleted?: number;
  totalCoursesCreated?: number;
  totalStudentsEnrolled?: number;
  userClass?: string;
  image?: string;
}

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated: convexIsAuthenticated } = useConvexAuth();
  const convexUser = useQuery(api.users.currentUser);
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  const [passwordUser, setPasswordUser] = useState<PasswordAuthUser | null>(null);
  const [passwordAuthLoading, setPasswordAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user from password auth if enabled
  useEffect(() => {
    if (PASSWORD_AUTH_ENABLED) {
      fetch("/api/auth/me", {
        credentials: "include",
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setPasswordUser(data.user);
          } else {
            setPasswordUser(null);
          }
        })
        .catch(() => setPasswordUser(null))
        .finally(() => setPasswordAuthLoading(false));
    } else {
      setPasswordAuthLoading(false);
    }
  }, []);

  // Update loading state
  useEffect(() => {
    if (PASSWORD_AUTH_ENABLED) {
      setIsLoading(passwordAuthLoading);
    } else {
      setIsLoading(isAuthLoading || convexUser === undefined);
    }
  }, [PASSWORD_AUTH_ENABLED, passwordAuthLoading, isAuthLoading, convexUser]);

  const signInPassword = async (credentials: { email: string; password: string }) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    setPasswordUser(data.user);
    return data;
  };

  const signUpPassword = async (userData: {
    name: string;
    email: string;
    password: string;
    role: "teacher" | "student";
    userClass: string;
  }) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }

    return await response.json();
  };

  const signOutPassword = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setPasswordUser(null);
  };

  const currentUser = PASSWORD_AUTH_ENABLED ? passwordUser : convexUser;
  const isAuthenticated = PASSWORD_AUTH_ENABLED ? !!passwordUser : convexIsAuthenticated;

  return {
    isLoading,
    isAuthenticated,
    user: currentUser,
    signIn: convexSignIn,
    signOut: PASSWORD_AUTH_ENABLED ? signOutPassword : convexSignOut,
    signInPassword,
    signUpPassword,
    signOutPassword,
  };
}