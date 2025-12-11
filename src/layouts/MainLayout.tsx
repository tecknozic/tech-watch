import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export function MainLayout() {
    return (
        <div className="flex h-screen bg-background text-gray-100 overflow-hidden font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mx-auto max-w-7xl h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
