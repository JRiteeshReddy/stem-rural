import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAction, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const updateProfile = useMutation(api.profileDetails.updateProfile);
  const generateUploadUrl = useAction(api.profile.generateUploadUrl);
  const setProfileImage = useMutation(api.profileMutations.setProfileImage);

  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [parentsName, setParentsName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  // Add DOB wheels (prefill from user.dateOfBirth if available)
  const [dobYear, setDobYear] = useState<string>("");
  const [dobMonth, setDobMonth] = useState<string>("");
  const [dobDay, setDobDay] = useState<string>("");

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) navigate("/auth");
      if (user) {
        setName(user.name || "");
        setSchoolName((user as any).schoolName || "");
        setBloodGroup((user as any).bloodGroup || "");
        setParentsName((user as any).parentsName || "");
        setPhoneNumber((user as any).phoneNumber || "");
        setAddress((user as any).address || "");
        const dobMs = (user as any).dateOfBirth as number | undefined;
        if (dobMs) {
          const d = new Date(dobMs);
          setDobYear(String(d.getFullYear()));
          setDobMonth(String(d.getMonth() + 1));
          setDobDay(String(d.getDate()));
        }
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const handleSave = async () => {
    try {
      // Build DOB if all parts selected (optional update)
      let dobMs: number | undefined = undefined;
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

      await updateProfile({
        name: name || undefined,
        schoolName: schoolName || undefined,
        bloodGroup: bloodGroup || undefined,
        parentsName: parentsName || undefined,
        phoneNumber: phoneNumber || undefined,
        address: address || undefined,
        dateOfBirth: dobMs,
      });
      toast.success("Profile updated");
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update profile");
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await setProfileImage({ fileId: storageId });
      toast.success("Profile picture updated!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update profile picture");
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl w-full space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-2">🆔</div>
          <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            Your Retro Student Profile
          </h1>
          <p className="text-gray-700" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            Update your details. Sensitive info stays private to you and your teacher.
          </p>
        </div>

        <PixelCard variant="banana" className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="border-2 border-yellow-600 rounded-none" />
            </div>
            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>School Name</Label>
              <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="border-2 border-yellow-600 rounded-none" />
            </div>
            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>Blood Group</Label>
              <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="border-2 border-yellow-600 rounded-none" placeholder="e.g., O+, B-" />
            </div>
            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>Parents' Name</Label>
              <Input value={parentsName} onChange={(e) => setParentsName(e.target.value)} className="border-2 border-yellow-600 rounded-none" />
            </div>
            <div>
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>Phone Number</Label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="border-2 border-yellow-600 rounded-none" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                Date of Birth
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={dobYear} onValueChange={setDobYear}>
                  <SelectTrigger className="rounded-none border-2 border-yellow-600 bg-yellow-100 h-10">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-auto">
                    {Array.from({ length: 60 }).map((_, i) => {
                      const year = 2020 - i;
                      return (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={dobMonth} onValueChange={setDobMonth}>
                  <SelectTrigger className="rounded-none border-2 border-yellow-600 bg-yellow-100 h-10">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-auto">
                    <SelectItem value="1">Jan</SelectItem>
                    <SelectItem value="2">Feb</SelectItem>
                    <SelectItem value="3">Mar</SelectItem>
                    <SelectItem value="4">Apr</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">Jun</SelectItem>
                    <SelectItem value="7">Jul</SelectItem>
                    <SelectItem value="8">Aug</SelectItem>
                    <SelectItem value="9">Sep</SelectItem>
                    <SelectItem value="10">Oct</SelectItem>
                    <SelectItem value="11">Nov</SelectItem>
                    <SelectItem value="12">Dec</SelectItem>
                  </SelectContent>
                </Select>

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
                Spin the wheels to set your birth date.
              </p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-black font-bold" style={{ fontFamily: "'Pixelify Sans', monospace" }}>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="border-2 border-yellow-600 rounded-none" />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfileImageUpload(file);
                }}
                className="text-sm"
              />
            </div>
            <PixelButton size="lg" onClick={handleSave}>
              Save Changes
            </PixelButton>
          </div>
        </PixelCard>
      </motion.div>
    </div>
  );
}