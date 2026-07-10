import { SidebarTrigger } from '@/components/ui/sidebar'


function AppHeader() {
    return (
        <div className='p-4 shadow-sm flex items-center justify-between w-full '>
            <SidebarTrigger />

        </div>
    )
}

export default AppHeader