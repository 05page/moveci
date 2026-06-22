"use client"

import { NotificationsContent } from "@/app/components/NotificationsContent"

export default function NotificationsPage() {
    return (
        <div className="min-h-screen bg-zinc-50 pt-20 pb-16">
            <div className="max-w-4xl mx-auto px-4 md:px-8">
                <NotificationsContent />
            </div>
        </div>
    )
}
