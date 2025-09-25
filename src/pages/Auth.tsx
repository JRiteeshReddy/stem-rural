import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PASSWORD_AUTH_ENABLED } from "@/lib/authFlags";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn, signInPassword, signUpPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [authMethod] = useState<"otp" | "password">("password");
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Password auth fields
  const [passwordInput, setPasswordInput] = useState("");

  // NEW: role & class for signup
  const [role, setRole] = useState<"teacher" | "student" | "">("");
  const [userClass, setUserClass] = useState<"Class 6" | "Class 7" | "Class 8" | "Class 9" | "Class 10" | "Class 11" | "Class 12" | "">("");

  // Convex mutations to finalize signup after OTP
  const setupUserRole = useMutation(api.setup.setupUserRole);
  const setUserClassMutation = useMutation(api.setup.setUserClass);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Do not auto-redirect; let users explicitly click the continue button.
      // This prevents unexpected navigation during OTP flows or when users open /auth intentionally.
    }
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const result = await signInPassword({ email, password });

      // Role-based redirect (avoid 404: both roles go to /dashboard unless redirectAfterAuth specified)
      const role = result?.user?.role as "teacher" | "student" | undefined;
      const redirect =
        redirectAfterAuth ||
        "/dashboard";
      navigate(redirect);
      toast.success("Login successful!");
    } catch (error) {
      console.error("Password login error:", error);
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const selectedRole = formData.get("role") as "teacher" | "student";
      const selectedClass = formData.get("userClass") as string;

      if (!name || !email || !password || !selectedRole || !selectedClass) {
        setError("Please fill in all fields");
        setIsLoading(false);
        return;
      }

      await signUpPassword({
        name,
        email,
        password,
        role: selectedRole,
        userClass: selectedClass,
      });

      toast.success("Account created successfully!");
      // Role-based redirect (avoid 404: go to /dashboard)
      const redirect =
        redirectAfterAuth ||
        "/dashboard";
      navigate(redirect);
    } catch (error) {
      console.error("Password signup error:", error);
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center h-full flex-col">
          {/* Already signed in prompt */}
          {!authLoading && isAuthenticated && (
            <Button
              type="button"
              className="mb-4 w-full rounded-none border-2 border-yellow-700 bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,0.35)] hover:bg-yellow-200"
              onClick={() => {
                const redirect = redirectAfterAuth || "/dashboard";
                navigate(redirect);
              }}
            >
              You're already signed in — Continue
            </Button>
          )}

          {/* Simple tabs for Login / Sign Up */}
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              variant={mode === "login" ? "default" : "outline"}
              className="rounded-none border-2 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]"
              onClick={() => {
                setMode("login");
                setStep("signIn");
                setError(null);
                setOtp("");
              }}
            >
              Login
            </Button>
            <Button
              type="button"
              variant={mode === "signup" ? "default" : "outline"}
              className="rounded-none border-2 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]"
              onClick={() => {
                setMode("signup");
                setStep("signIn");
                setError(null);
                setOtp("");
              }}
            >
              Sign Up
            </Button>
          </div>

          <Card className="min-w-[350px] pb-0 rounded-none border-4 border-yellow-600 shadow-[4px_4px_0px_rgba(0,0,0,0.35)]">
            {/* Password auth UI only */}
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center">
                  <img
                    src="/assets/edufun.png"
                    alt="Edufun Logo"
                    width={64}
                    height={64}
                    className="rounded-lg mb-4 mt-4 cursor-pointer"
                    style={{ imageRendering: "pixelated" }}
                    onClick={() => navigate("/")}
                  />
                </div>
                <CardTitle className="text-xl">
                  {mode === "login" ? "Login" : "Sign Up"}
                </CardTitle>
                <CardDescription>
                  {mode === "login"
                    ? "Enter your email and password"
                    : "Create your account"}
                </CardDescription>
              </CardHeader>
              <form onSubmit={mode === "login" ? handlePasswordLogin : handlePasswordSignup}>
                <CardContent>
                  {mode === "signup" && (
                    <div className="mb-3">
                      <Input
                        name="name"
                        placeholder="Your name (required)"
                        type="text"
                        className="rounded-none border-2"
                        required
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <Input
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="rounded-none border-2"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <Input
                      name="password"
                      placeholder="Password"
                      type="password"
                      className="rounded-none border-2"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {mode === "signup" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <Select name="role" required>
                          <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Select name="userClass" required>
                          <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Class 6">Class 6</SelectItem>
                            <SelectItem value="Class 7">Class 7</SelectItem>
                            <SelectItem value="Class 8">Class 8</SelectItem>
                            <SelectItem value="Class 9">Class 9</SelectItem>
                            <SelectItem value="Class 10">Class 10</SelectItem>
                            <SelectItem value="Class 11">Class 11</SelectItem>
                            <SelectItem value="Class 12">Class 12</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="mt-2 text-sm text-red-500">{error}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full rounded-none border-2 border-yellow-700 bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,0.35)] hover:bg-yellow-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {mode === "login" ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      <>
                        {mode === "login" ? "Sign In" : "Create Account"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </>
          </Card>

          {/* Small helper to jump to sign-in */}
          <div
            className="mt-4 bg-yellow-200 border-2 border-yellow-600 text-black px-3 py-2 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] flex items-center gap-1"
            style={{ fontFamily: "'Pixelify Sans', monospace" }}
          >
            <span>If you already created an account,</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="px-2 py-1 h-auto"
              onClick={() => {
                setMode("login");
                setStep("signIn");
                setError(null);
                setOtp("");
                navigate("/auth");
              }}
            >
              sign in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return <Auth {...props} />;
}