"use client";

import { usePathname} from "next/navigation";
import React from "react";

const ROUTES_SANS_FOOTER = ["/messages", "/admin", "/partenaire"];

export default function FooterConditionnel({children}: {children: React.ReactNode}){
    const chemin = usePathname()
    const masque =    ROUTES_SANS_FOOTER.some((route) => chemin.startsWith(route))
    if(masque) return
        return children
}