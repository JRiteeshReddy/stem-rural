import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { GraduationCap, Users } from "lucide-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function RoleSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"teacher" | "student" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const setupUserRole = useMutation(api.setup.setupUserRole);

  const handleSubmit = async () => {
    if (!selectedRole || !name.trim()) {
      toast.error("Please select a role and enter your name");
      return;
    }

    setIsLoading(true);
    try {
      await setupUserRole({ role: selectedRole, name: name.trim() });
      toast.success("Welcome to STEM! 🍌");
      navigate("/extended-setup");
    } catch (error) {
      toast.error("Failed to set up your account");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-8xl mb-4"
          >
            📘
          </motion.div>
          <h1 className="text-4xl font-bold text-black mb-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            Welcome to STEM!
          </h1>
          <p className="text-lg text-gray-700" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
            Choose your role to get started
          </p>
        </div>

        <PixelCard variant="banana" className="p-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-lg font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                What's your name?
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="mt-2 border-2 border-yellow-600 rounded-none text-lg"
                style={{ fontFamily: "monospace" }}
              />
            </div>

            <div>
              <Label className="text-lg font-bold text-black mb-4 block" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                I am a...
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PixelCard
                    variant={selectedRole === "teacher" ? "orange" : "default"}
                    className={`p-6 cursor-pointer transition-all ${
                      selectedRole === "teacher" ? "ring-4 ring-orange-500" : ""
                    }`}
                    onClick={() => setSelectedRole("teacher")}
                  >
                    <div className="text-center">
                      <GraduationCap size={48} className="mx-auto mb-3 text-black" />
                      <h3 className="text-xl font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        Teacher
                      </h3>
                      <p className="text-sm text-gray-700 mt-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        Create courses, tests, and track student progress
                      </p>
                    </div>
                  </PixelCard>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PixelCard
                    variant={selectedRole === "student" ? "orange" : "default"}
                    className={`p-6 cursor-pointer transition-all ${
                      selectedRole === "student" ? "ring-4 ring-orange-500" : ""
                    }`}
                    onClick={() => setSelectedRole("student")}
                  >
                    <div className="text-center">
                      <Users size={48} className="mx-auto mb-3 text-black" />
                      <h3 className="text-xl font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        Student
                      </h3>
                      <p className="text-sm text-gray-700 mt-2" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
                        Take courses, complete tests, and earn credits
                      </p>
                    </div>
                  </PixelCard>
                </motion.div>
              </div>
            </div>

            <div className="text-center">
              <PixelButton
                onClick={handleSubmit}
                disabled={!selectedRole || !name.trim() || isLoading}
                size="lg"
              >
                {isLoading ? "Setting up..." : "Let's Go! 🚀"}
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      </motion.div>
    </div>
  );
}