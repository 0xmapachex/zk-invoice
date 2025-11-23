"use client";

import { usePathname } from "next/navigation";
import { LandingHeader } from "./LandingHeader";
import { AppHeader } from "./AppHeader";

export const ConditionalHeader = () => {
  const pathname = usePathname();
  
  // Show landing header only on home page
  const isLandingPage = pathname === "/";
  
  return isLandingPage ? <LandingHeader /> : <AppHeader />;
};

