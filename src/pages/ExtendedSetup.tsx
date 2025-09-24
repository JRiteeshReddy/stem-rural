import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function ExtendedSetup() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const saveExtended = useMutation(api.setup.setupExtendedRegistration);

  const [registrationId, setRegistrationId] = useState("");
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [dobYear, setDobYear] = useState<string>("");
  const [dobMonth, setDobMonth] = useState<string>(""); // 1-12
  const [dobDay, setDobDay] = useState<string>("");
  const [gender, setGender] = useState<"Male" | "Female" | "Others" | "">("");
  const [userClass, setUserClass] = useState<
    "Class 6" | "Class 7" | "Class 8" | "Class 9" | "Class 10" | "Class 11" | "Class 12" | ""
  >("");

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) navigate("/auth");
      else if (user && !user.role) {
        // still allow extended setup first, then role selection can happen
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const handleSubmit = async () => {
    if (!registrationId.trim() || !gender || !userClass) {
      toast.error("Please complete all fields");
      return;
    }
    // Build DOB from wheels if provided
    let dobMs: number | null = null;
    if (dobYear && dobMonth && dobDay) {
      const y = parseInt(dobYear, 10);
      const m = parseInt(dobMonth, 10) - 1;
      const d = parseInt(dobDay, 10);
      const candidate = new Date(y, m, d);
      if (
        candidate.getFullYear() === y &&
        candidate.getMonth() === m &&
        candidate.getDate() === d
      ) {
        dobMs = candidate.getTime();
      }
    }
    if (!dobMs) {
      toast.error("Please select a valid Date of Birth");
      return;
    }
    try {
      await saveExtended({
        registrationId: registrationId.trim(),
        dateOfBirth: dobMs,
        gender: gender as any,
        userClass: userClass as any,
      });
      toast.success("Profile details saved!");
      navigate("/role-selection");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save details");
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="text-7xl mb-2">📘</div>
          <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            STEM — Complete Your Registration
          </h1>
          <p className="text-gray-700" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            Add your school details to finish setting up your account.
          </p>
        </div>

        <PixelCard variant="banana" className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                Registration ID
              </Label>
              <Input
                value={registrationId}
                onChange={(e) => setRegistrationId(e.target.value)}
                className="border-2 border-yellow-600 rounded-none"
                placeholder="Enter your registration ID"
              />
            </div>

            <div className="md:col-span-1">
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                Date of Birth
              </Label>
              <div className="grid grid-cols-3 gap-2 border-2 border-yellow-600 p-2 bg-yellow-50">
                {/* Year */}
                <Select value={dobYear} onValueChange={setDobYear}>
                  <SelectTrigger className="rounded-none border-2 border-yellow-600 bg-yellow-100 h-10">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-auto">
                    {Array.from({ length: 60 }).map((_, i) => {
                      const year = 2020 - i; // 2020..1961
                      return (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {/* Month */}
                <Select value={dobMonth} onValueChange={setDobMonth}>
                  <SelectTrigger className="rounded-none border-2 border-yellow-600 bg-yellow-100 h-10">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-auto">
                    {[
                      ["1", "Jan"],
                      ["2", "Feb"],
                      ["3", "Mar"]
                    ]}
                  </SelectContent>
                </Select>
                {/* Day */}
                <Select value={dobDay} onValueChange={setDobDay}>
                  <SelectTrigger className="rounded-none border-2 border-yellow-600 bg-yellow-100 h-10">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-auto">
                    {Array.from({ length: 31 }).map((_, i) => {
                      const day = i + 1;
                      return (
                        <SelectItem key={day} value={String(day)}>
                          {day}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs mt-1 text-yellow-800" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                Scroll the lists like retro wheels to pick your date.
              </p>
            </div>

            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                Gender
              </Label>
              <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                <SelectTrigger className="rounded-none border-2 border-yellow-600">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                Year/Class
              </Label>
              <Select value={userClass} onValueChange={(v) => setUserClass(v as any)}>
                <SelectTrigger className="rounded-none border-2 border-yellow-600">
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

          <div className="mt-6 text-center">
            <PixelButton size="lg" onClick={handleSubmit}>
              Save & Continue
            </PixelButton>
          </div>
        </PixelCard>
      </motion.div>
    </div>
  );
}