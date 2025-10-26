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
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Do not auto-redirect; let users explicitly click the continue button.
    }
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get("email") as string;

      await signIn("resend-otp", { email });
      setStep({ email });
      toast.success("Check your email for the verification code!");
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (typeof step === "string" || otp.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      await signIn("resend-otp", { email: step.email, code: otp });
      const redirect = redirectAfterAuth || "/dashboard";
      navigate(redirect);
      toast.success("Successfully signed in!");
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Invalid code. Please try again.");
      setOtp("");
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

          <Card className="min-w-[350px] pb-0 rounded-none border-4 border-yellow-600 shadow-[4px_4px_0px_rgba(0,0,0,0.35)]">
            {step === "signIn" ? (
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
                  <CardTitle className="text-xl">Welcome to Edufun</CardTitle>
                  <CardDescription>
                    Enter your email to receive a verification code
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input
                        name="email"
                        placeholder="name@example.com"
                        type="email"
                        className="rounded-none border-2"
                        disabled={isLoading}
                        required
                      />
                    </div>
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
                          Sending code...
                        </>
                      ) : (
                        <>
                          Continue with Email
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : (
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
                  <CardTitle className="text-xl">Enter Verification Code</CardTitle>
                  <CardDescription>
                    We sent a code to {step.email}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent>
                    <div className="flex justify-center mb-4">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        disabled={isLoading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
                    )}
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => {
                        setStep("signIn");
                        setOtp("");
                        setError(null);
                      }}
                    >
                      Use a different email
                    </Button>
                  </CardContent>
                  <CardFooter>
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
                          Verify & Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return <Auth {...props} />;
}