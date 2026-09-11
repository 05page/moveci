"use client";

import { usePathname } from "next/navigation";
import React from "react";

const ROUTES_SANS_HEADER = ["/admin", "/partenaire"];

export default function HeaderConditionnel({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const masque = ROUTES_SANS_HEADER.some((route) => chemin.startsWith(route));
  if (masque) return;
  return children;
}
