"use client"

import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/src/lib/api"
import { getErrorMessage } from "@/src/lib/handleError"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Eye, EyeOff, Lock } from "lucide-react"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface Form {
    current_password:          string
    new_password:              string
    new_password_confirmation: string
}

const EMPTY: Form = {
    current_password:          "",
    new_password:              "",
    new_password_confirmation: "",
}

/** Champ mot de passe avec bouton afficher/masquer */
function PasswordInput({
    id, label, value, onChange, placeholder,
}: {
    id: string
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) {
    const [show, setShow] = useState(false)

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-semibold text-zinc-700">{label}</Label>
            <div className="relative">
                <Input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder ?? "••••••••"}
                    className="pr-10 rounded-xl border-zinc-200 bg-zinc-50"
                />
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    )
}

export function ChangerMotDePasse({ open, onOpenChange }: Props) {
    const [form, setForm]       = useState<Form>(EMPTY)
    const [loading, setLoading] = useState(false)

    const set = (key: keyof Form) => (val: string) =>
        setForm(prev => ({ ...prev, [key]: val }))

    const handleClose = () => {
        setForm(EMPTY)
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (form.new_password !== form.new_password_confirmation) {
            toast.error("Les deux nouveaux mots de passe ne correspondent pas.")
            return
        }

        if (form.new_password.length < 8) {
            toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.")
            return
        }

        setLoading(true)
        try {
            await api.put("/me/change-password", {
                current_password:          form.current_password,
                new_password:              form.new_password,
                new_password_confirmation: form.new_password_confirmation,
            })
            toast.success("Mot de passe modifié avec succès.")
            handleClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="rounded-2xl max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-black text-zinc-900">
                                Changer le mot de passe
                            </DialogTitle>
                            <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                                Minimum 8 caractères.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <PasswordInput
                        id="current_password"
                        label="Mot de passe actuel"
                        value={form.current_password}
                        onChange={set("current_password")}
                    />
                    <PasswordInput
                        id="new_password"
                        label="Nouveau mot de passe"
                        value={form.new_password}
                        onChange={set("new_password")}
                    />
                    <PasswordInput
                        id="new_password_confirmation"
                        label="Confirmer le nouveau mot de passe"
                        value={form.new_password_confirmation}
                        onChange={set("new_password_confirmation")}
                    />

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                            className="rounded-xl cursor-pointer"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !form.current_password || !form.new_password || !form.new_password_confirmation}
                            className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer"
                        >
                            {loading ? "Modification..." : "Modifier"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
