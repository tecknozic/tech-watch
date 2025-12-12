import { LayoutDashboard, Settings, X, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/cn';

const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Configuration', href: '/configuration', icon: Settings },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    return (
        <>
            {/* Mobile Sidebar */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-56 bg-background text-white p-4 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:flex md:h-screen md:flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Brand */}
                    <div className="relative flex flex-col items-start px-2 py-4 mb-2 gap-3">
                        {/* Mobile Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute right-0 top-0 p-2 text-gray-400 hover:text-white md:hidden"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <img
                            src="/logo_full.jpg"
                            alt="TechWatch Logo"
                            className="h-28 w-auto object-contain rounded-xl"
                        />
                        {/* Text removed as requested since logo contains text or is standalone */}
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 space-y-2">
                        {/* Daily Recap Link */}
                        <NavLink
                            to="/recap"
                            onClick={onClose} // Close sidebar on nav click on mobile
                            className={({ isActive }) =>
                                cn(
                                    "group flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                                        : "text-gray-400 hover:text-white hover:bg-surface"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Sparkles
                                        className={cn(
                                            'mr-4 h-5 w-5 flex-shrink-0',
                                            isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                        )}
                                    />
                                    Daily Recap
                                </>
                            )}
                        </NavLink>

                        {navigation.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                onClick={onClose} // Close sidebar on nav click on mobile
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
            </div>
        </>
    );
}
