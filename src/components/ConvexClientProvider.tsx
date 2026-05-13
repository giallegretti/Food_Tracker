"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { FoodsCacheProvider } from "@/hooks/useFoodsCache";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <FoodsCacheProvider>{children}</FoodsCacheProvider>
    </ConvexProvider>
  );
}
