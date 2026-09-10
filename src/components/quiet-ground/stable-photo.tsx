"use client";

import { useState } from "react";

/**
 * Reliable full-bleed photo. CSS background is the base so the property
 * never disappears if Next/Image or a transient network blip fails.
 */
export function StablePhoto({
  src,
  alt,
  className = "",
  imageClassName = "",
  priority = false,
  objectPosition = "center",
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  objectPosition?: string;
}) {
  const [failed, setFailed] = useState(false);
  const fallback = "/quiet-ground/hero-lodge.png";
  const activeSrc = failed && src !== fallback ? fallback : src;

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-[#0b0908] ${className}`}
      style={{
        backgroundImage: `url(${activeSrc})`,
        backgroundSize: "cover",
        backgroundPosition: objectPosition,
        backgroundColor: "#1a1410",
      }}
      aria-hidden={alt ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeSrc}
        alt={alt}
        width={1920}
        height={1080}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onError={() => {
          if (!failed) setFailed(true);
        }}
        className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
        style={{ objectPosition }}
      />
    </div>
  );
}
