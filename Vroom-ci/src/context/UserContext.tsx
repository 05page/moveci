"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User } from "@/src/types"

interface UserContextType {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Fetch direct sans passer par api.ts pour éviter la redirection /auth
    // sur les pages publiques — un visiteur non connecté doit pouvoir naviguer
    fetch("/api/proxy/me", { headers: { Accept: "application/json" } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const userData: User | null = data?.data ?? null

        // Si l'utilisateur est suspendu ou banni, on le redirige immédiatement
        if (userData?.statut === "suspendu" || userData?.statut === "banni") {
          router.push(`/compte-bloque?raison=${userData.statut}`)
          return
        }

        setUser(userData)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <UserContext.Provider value={{ user, loading, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser doit être utilisé dans un UserProvider")
  return ctx
}
