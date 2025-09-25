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

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

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
  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Require role & class in signup mode before sending OTP
      if (mode === "signup") {
        if (!nameInput.trim() || !role || !userClass) {
          setIsLoading(false);
          setError("Please provide name, role, and class to continue.");
          return;
        }
      }

      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);

      // After OTP verification, if this was sign up, persist role & class
      if (mode === "signup") {
        try {
          // Save role + display name (fallback to nameInput)
          await setupUserRole({
            role: role as any,
            name: nameInput.trim(),
          });
          // Save class selection
          await setUserClassMutation({ userClass: userClass as any });
        } catch (e) {
          console.error("Post-OTP setup failed:", e);
        }
      }

      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
      // Defer opening the extended setup tab to avoid concurrent rendering issues
      setTimeout(() => {
        window.open("/extended-setup", "_blank");
      }, 0);
    } catch (error) {
      console.error("OTP verification error:", error);

      setError("The verification code you entered is incorrect.");
      setIsLoading(false);

      setOtp("");
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
                const redirect = redirectAfterAuth || "/";
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
            {step === "signIn" ? (
              <>
                <CardHeader className="text-center">
                  <div className="flex justify-center">
                    <img
                      src="/assets/edufun.png"
                      alt="STEM Logo"
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
                      ? "Enter your email to log in"
                      : "Create your account to get started"}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleEmailSubmit}>
                  <CardContent>
                    {mode === "signup" && (
                      <div className="mb-3">
                        <Input
                          name="name"
                          placeholder="Your name (required)"
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="rounded-none border-2"
                          required
                        />
                      </div>
                    )}

                    {mode === "signup" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <Select value={role} onValueChange={(v) => setRole(v as any)}>
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
                          <Select value={userClass} onValueChange={(v) => setUserClass(v as any)}>
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

                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          name="email"
                          placeholder="name@example.com"
                          type="email"
                          className="pl-9 rounded-none border-2"
                          disabled={isLoading}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon"
                        disabled={isLoading}
                        className="rounded-none border-2 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-500">{error}</p>
                    )}
                  </CardContent>
                </form>
              </>
            ) : (
              <>
                <CardHeader className="text-center mt-4">
                  <CardTitle>Check your email</CardTitle>
                  <CardDescription>
                    We've sent a code to {step.email}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="pb-4">
                    <input type="hidden" name="email" value={step.email} />
                    <input type="hidden" name="code" value={otp} />

                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                            // Find the closest form and submit it
                            const form = (e.target as HTMLElement).closest("form");
                            if (form) {
                              form.requestSubmit();
                            }
                          }
                        }}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-500 text-center">
                        {error}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Didn't receive a code?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setStep("signIn")}
                      >
                        Try again
                      </Button>
                    </p>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full rounded-none border-2 border-yellow-700 bg-yellow-300 text-black shadow-[2px_2px_0px_rgba(0,0,0,0.35)] hover:bg-yellow-200"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                      className="w-full rounded-none border-2 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]"
                    >
                      Use different email
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading authentication...
        </div>
      }
    >
      <Auth {...props} />
    </Suspense>
  );
}