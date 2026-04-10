import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/src/lib/api";
import { User } from "@/src/types";
import { LocationEdit, Mail, Phone, Users, Vault } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EditProfilProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit?: () => void;
    user: User
}

interface FormRegister {
    fullname: string,
    email: string,
    telephone: string,
    adresse: string,
    raison_sociale: string,
    rccm: string,
    numero_agrement: string,
}

export function EditProfil({ open, onOpenChange, onSubmit, user }: EditProfilProps) {
    const [formEdit, setFormEdit] = useState<FormRegister>({
        fullname: user.fullname,
        email: user.email,
        telephone: user.telephone,
        adresse: user.adresse,
        raison_sociale: user.raison_sociale ?? "",
        rccm: user.rccm ?? "",
        numero_agrement: user.numero_agrement ?? "",
    })

    const handleEditChange = (key: keyof FormRegister, value: FormRegister[keyof FormRegister]) => {
        setFormEdit(prev => ({
            ...prev,
            [key]: value
        }))
    }
    const handleSubmit = async () => {
        try {
            await api.put('/me/update', formEdit)
            toast.success("Modification réussie !")
            if (onSubmit) onSubmit()
            onOpenChange(false);
        }catch(error){
            toast.error("Erreur de connexion au serveur")
            console.error("Erreur de connexion au serveur", error)
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                        Mettez à jour votre profil à jour.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullname" className="text-sm font-semibold text-zinc-700">
                                Nom Complet
                            </Label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                <Input
                                    id="fullname"
                                    value={formEdit.fullname}
                                    onChange={(e) => handleEditChange("fullname", e.target.value)}
                                    type="text"
                                    placeholder="John Doe"
                                    className="pl-11 h-11 rounded-xl border-zinc-200 focus-visible:ring-zinc-400"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-zinc-700">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                <Input
                                    id="email"
                                    value={formEdit.email}
                                    onChange={(e) => handleEditChange("email", e.target.value)}
                                    type="email"
                                    placeholder="jd@gmail.com"
                                    className="pl-11 h-11 rounded-xl border-zinc-200 focus-visible:ring-zinc-400"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="telephone" className="text-sm font-semibold text-zinc-700">
                            Téléphone
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                id="telephone"
                                value={formEdit.telephone}
                                onChange={(e) => handleEditChange("telephone", e.target.value)}
                                type="tel"
                                placeholder="0710073748"
                                className="pl-11 h-11 rounded-xl border-zinc-200 focus-visible:ring-zinc-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="telephone" className="text-sm font-semibold text-zinc-700">
                            Adresse
                        </Label>
                        <div className="relative">
                            <LocationEdit className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                id="adresse"
                                value={formEdit.adresse}
                                onChange={(e) => handleEditChange("adresse", e.target.value)}
                                type="text"
                                placeholder="Yopougon,Selmer"
                                className="pl-11 h-11 rounded-xl border-zinc-200 focus-visible:ring-zinc-400"
                            />
                        </div>
                    </div>

                    {/* Champs spécifiques partenaires */}
                    {(user.role === "concessionnaire" || user.role === "auto_ecole") && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-zinc-700">Raison sociale</Label>
                                <Input
                                    value={formEdit.raison_sociale}
                                    onChange={(e) => handleEditChange("raison_sociale", e.target.value)}
                                    placeholder="Nom de votre entreprise"
                                    className="h-11 rounded-xl border-zinc-200 focus-visible:ring-zinc-400"
                                />
                            </div>
                            {user.role === "concessionnaire" && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-zinc-700">RCCM</Label>
                                    <Input
                                        value={formEdit.rccm}
                                        onChange={(e) => handleEditChange("rccm", e.target.value)}
                                        placeholder="CI-ABJ-2024-B-12345"
                                        className="h-11 rounded-xl border-zinc-200 focus-visible:ring-zinc-400"
                                    />
                                </div>
                            )}
                            {user.role === "auto_ecole" && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-zinc-700">N° Agrément</Label>
                                    <Input
                                        value={formEdit.numero_agrement}
                                        onChange={(e) => handleEditChange("numero_agrement", e.target.value)}
                                        placeholder="AE-2024-0123"
                                        className="h-11 rounded-xl border-zinc-200 focus-visible:ring-zinc-400"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="cursor-pointer rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-50">Annuler</Button>
                    </DialogClose>
                    <Button onClick={handleSubmit} type="submit" className="cursor-pointer rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white">Sauvegarder</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
