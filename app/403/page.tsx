import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
            <ShieldAlert className="w-24 h-24 text-destructive mb-8" />
            <h1 className="text-4xl font-bold mb-4">403 - Unauthorized</h1>
            <p className="text-xl text-muted-foreground mb-8 text-center max-w-md">
                You do not have permission to access this page. This area is restricted to administrators only.
            </p>
            <Link href="/dashboard">
                <Button size="lg">Return to Dashboard</Button>
            </Link>
        </div>
    );
}
