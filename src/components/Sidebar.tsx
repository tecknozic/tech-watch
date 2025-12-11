import { LayoutDashboard, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/cn';

const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Settings', href: '/configuration', icon: Settings },
];

export function Sidebar() {
    return (
        <div className="flex h-screen w-72 flex-col bg-background text-white p-4">
            {/* Brand */}
            <div className="flex flex-col items-center px-4 py-8 mb-2 gap-3">
                <img src="/logo.png" alt="TechWatch Logo" className="h-28 w-28 object-contain" />
                <span className="text-2xl font-bold tracking-tight text-white">TechWatch</span>
            </div>

            {/* Navigation */}
            <div className="flex-1 space-y-2">
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                'group flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200',
                                isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                    : 'text-gray-400 hover:text-white hover:bg-surface'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    className={cn(
                                        'mr-4 h-5 w-5 flex-shrink-0',
                                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                    )}
                                />
                                {item.name}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
