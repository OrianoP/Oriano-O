"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** next/image with a warm skeleton while loading and a soft fade-in once decoded. */
export function Photo({ className = "", imgClassName = "", priority, ...props }: Omit<ImageProps, "className"> & { className?: string; imgClassName?: string }) {
  const [ready, setReady] = useState(false);
  return (
    <div className={`relative overflow-hidden ${ready ? "" : "img-skeleton"} ${className}`}>
      <Image
        {...props}
        priority={priority}
        onLoad={() => setReady(true)}
        className={`object-cover transition-[opacity,transform] duration-700 ease-out ${ready ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
    </div>
  );
}
