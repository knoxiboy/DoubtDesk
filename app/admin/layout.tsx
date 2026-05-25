import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    // This will redirect to /403 if the user is not an admin
    await requireAdmin();

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 container mx-auto py-8 px-4">
                {children}
            </main>
        </div>
    );
}
