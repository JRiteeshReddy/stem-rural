import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PixelButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function PixelButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className,
  type = "button",
}: PixelButtonProps) {
  const baseClasses = "font-bold border-2 transition-all duration-100 cursor-pointer";
  
  const variantClasses = {
    primary: "bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-300 active:bg-yellow-500",
    secondary: "bg-orange-400 border-orange-600 text-black hover:bg-orange-300 active:bg-orange-500",
    danger: "bg-red-400 border-red-600 text-white hover:bg-red-300 active:bg-red-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          "rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        style={{
          imageRendering: "pixelated",
          fontFamily: "'Pixelify Sans', monospace",
        }}
      >
        {children}
      </Button>
    </motion.div>
  );
}