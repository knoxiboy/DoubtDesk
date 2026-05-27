import DashboardLayout from "@/components/DashboardLayout"

export default function BookmarksLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <DashboardLayout>{children}</DashboardLayout>
}
