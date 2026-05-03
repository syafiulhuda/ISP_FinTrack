"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import { ReactNode } from "react";

export function FramerProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
