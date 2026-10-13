import React from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";

export type LogoVariant = "full" | "mark";
export type LogoTheme = "dark" | "light" | "auto";
export type LogoSize = "sm" | "md" | "lg" | "xl" | "custom";

export interface FoodQueueLogoProps {
  /**
   * "full" displays the complete mark + typography lockup (3:1 aspect ratio)
   * "mark" displays the icon-only symbol (1:1 aspect ratio)
   */
  variant?: LogoVariant;
  /**
   * "dark": for dark backgrounds (default in FoodQueue dark UI)
   * "light": for light backgrounds/cards
   * "auto": responsive CSS toggle (dark logo on dark mode, light logo on light mode)
   */
  theme?: LogoTheme;
  /**
   * Preset sizes or "custom" when specifying custom width/height/className
   */
  size?: LogoSize;
  /**
   * Optional custom width (px)
   */
  width?: number;
  /**
   * Optional custom height (px)
   */
  height?: number;
  /**
   * Additional classes applied to wrapper container or image
   */
  className?: string;
  /**
   * If provided, wraps the logo in a Next.js Link
   */
  href?: string;
  /**
   * Accessible description/title
   */
  alt?: string;
  /**
   * Set priority for LCP/above-the-fold logo rendering (default: true)
   */
  priority?: boolean;
}

const SIZE_PRESETS: Record<LogoSize, { full: { width: number; height: number }; mark: { width: number; height: number } }> = {
  sm: {
    full: { width: 135, height: 36 },
    mark: { width: 32, height: 32 },
  },
  md: {
    full: { width: 165, height: 44 },
    mark: { width: 40, height: 40 },
  },
  lg: {
    full: { width: 195, height: 52 },
    mark: { width: 48, height: 48 },
  },
  xl: {
    full: { width: 240, height: 64 },
    mark: { width: 64, height: 64 },
  },
  custom: {
    full: { width: 165, height: 44 },
    mark: { width: 40, height: 40 },
  },
};

export function FoodQueueLogo({
  variant = "full",
  theme = "dark",
  size = "md",
  width,
  height,
  className,
  href,
  alt = "FoodQueue — AI Food Rescue & Redistribution",
  priority = true,
}: FoodQueueLogoProps) {
  const preset = SIZE_PRESETS[size][variant];
  const finalWidth = width ?? preset.width;
  const finalHeight = height ?? preset.height;

  const renderLogoImage = () => {
    if (variant === "mark") {
      return (
        <Image
          src="/brand/foodqueue-mark.svg"
          alt={alt}
          width={finalWidth}
          height={finalHeight}
          priority={priority}
          className={clsx("object-contain shrink-0", className)}
          unoptimized
        />
      );
    }

    // variant === "full"
    if (theme === "auto") {
      return (
        <span className={clsx("inline-flex items-center shrink-0", className)}>
          {/* Light-theme logo when html is light */}
          <Image
            src="/brand/foodqueue-logo.svg"
            alt={alt}
            width={finalWidth}
            height={finalHeight}
            priority={priority}
            className="object-contain block dark:hidden"
            unoptimized
          />
          {/* Dark-theme logo when html is dark */}
          <Image
            src="/brand/foodqueue-logo-dark.svg"
            alt={alt}
            width={finalWidth}
            height={finalHeight}
            priority={priority}
            className="object-contain hidden dark:block"
            unoptimized
          />
        </span>
      );
    }

    const src = theme === "light" ? "/brand/foodqueue-logo.svg" : "/brand/foodqueue-logo-dark.svg";

    return (
      <Image
        src={src}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        priority={priority}
        className={clsx("object-contain shrink-0", className)}
        unoptimized
      />
    );
  };

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center shrink-0 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
        aria-label="FoodQueue Home"
      >
        {renderLogoImage()}
      </Link>
    );
  }

  return renderLogoImage();
}
