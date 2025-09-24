import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PixelCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "banana" | "orange";
  onClick?: () => void;
}

export function PixelCard({ children, className, variant = "default", onClick }: PixelCardProps) {
  const variantClasses = {
    default: "bg-yellow-100 border-yellow-400",
    banana: "bg-yellow-200 border-yellow-500",
    orange: "bg-orange-100 border-orange-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "border-4 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]",
          variantClasses[variant],
          onClick ? "cursor-pointer" : "",
          className
        )}
        style={{ imageRendering: "pixelated" }}
        onClick={onClick}
      >
        {children}
      </Card>
    </motion.div>
  );
}