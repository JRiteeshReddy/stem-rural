import { PixelButton } from "@/components/PixelButton";
import { PixelCard } from "@/components/PixelCard";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { BookOpen, Trophy, Users, Zap, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Interactive Courses",
      description: "Learn with engaging, pixel-perfect course content designed for maximum retention",
    },
    {
      icon: Trophy,
      title: "Gamified Learning",
      description: "Earn credits, climb ranks, and compete with friends on the leaderboard",
    },
    {
      icon: Users,
      title: "Teacher Tools",
      description: "Create courses, design tests, and track student progress with ease",
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get immediate results and personalized recommendations for improvement",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="bg-yellow-400 border-b-4 border-yellow-600 px-4 py-3 shadow-[0_4px_0px_0px_rgba(0,0,0,0.2)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-3"
          >
            <div className="text-4xl">📘</div>
            <h1 className="text-2xl font-bold text-black" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              STEM
            </h1>
          </motion.div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <PixelButton
                onClick={() => navigate(user?.role ? "/dashboard" : "/role-selection")}
              >
                {user?.role ? "Dashboard" : "Complete Setup"}
              </PixelButton>
            ) : (
              <>
                <PixelButton onClick={() => navigate("/auth")} variant="secondary">
                  Login
                </PixelButton>
                <PixelButton onClick={() => navigate("/auth")}>
                  Get Started
                </PixelButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-9xl mb-6"
            >
              📘
            </motion.div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-black mb-6" style={{ fontFamily: "monospace" }}>
              STEM
            </h1>
            
            <p className="text-2xl md:text-3xl text-gray-800 mb-8 max-w-4xl mx-auto" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              Retro-inspired learning platform. Level up your knowledge with interactive, pixel-perfect experiences.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <PixelButton
                onClick={() => navigate("/auth")}
                size="lg"
                className="text-xl px-8 py-4"
              >
                Start Learning <ArrowRight className="ml-2" size={20} />
              </PixelButton>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 text-black font-bold"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                <Star className="text-yellow-600" size={20} />
                <span>Join 1000+ Happy Learners!</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              Why Choose STEM? 🤔
            </h2>
            <p className="text-xl text-gray-700" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              We make learning as sweet as a ripe banana!
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                >
                  <PixelCard variant="banana" className="h-full">
                    <div className="p-6 text-center">
                      <div className="bg-yellow-300 border-2 border-yellow-500 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Icon size={32} className="text-black" />
                      </div>
                      <h3 className="text-xl font-bold text-black mb-3" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                        {feature.title}
                      </h3>
                      <p className="text-gray-700" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                        {feature.description}
                      </p>
                    </div>
                  </PixelCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <PixelCard variant="orange" className="text-center">
            <div className="p-12">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-6"
              >
                🎓🍌
              </motion.div>
              
              <h2 className="text-4xl font-bold text-black mb-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                Ready to Go Bananas for Learning?
              </h2>
              
              <p className="text-xl text-gray-700 mb-8" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                Join thousands of students and teachers in our pixelated learning universe!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <PixelButton
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="text-xl px-8 py-4"
                >
                  I'm a Student 🎒
                </PixelButton>
                
                <PixelButton
                  onClick={() => navigate("/auth")}
                  variant="secondary"
                  size="lg"
                  className="text-xl px-8 py-4"
                >
                  I'm a Teacher 👩‍🏫
                </PixelButton>
              </div>
            </div>
          </PixelCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-yellow-400 border-t-4 border-yellow-600 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-3xl">📘</div>
            <h3 className="text-xl font-bold text-black" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              STEM
            </h3>
          </div>
          <p className="text-black" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            Making education fun with a retro twist! ✨
          </p>
          <div className="mt-4 text-sm text-gray-700" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            Powered by{" "}
            <a
              href="https://vly.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-black transition-colors"
            >
              vly.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}