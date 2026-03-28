import {
    LayoutDashboard,
    Users,
    Mail,
    BarChart3,
    Sparkles,
    BookOpen
} from 'lucide-react';

interface SidebarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    isMobile?: boolean;
}

export default function Sidebar({ currentPage, onNavigate, isMobile = false }: SidebarProps) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'leads', label: 'Lead Management', icon: Users },
        { id: 'use-cases', label: 'Success Stories', icon: BookOpen },
        { id: 'email', label: 'Email Campaign', icon: Mail },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    return (
        <div className={`${isMobile ? 'h-screen' : 'w-64 h-screen'} glass border-r border-gray-200 flex flex-col sticky top-0`}>
            {/* Logo */}
            <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-bold text-base sm:text-lg gradient-text truncate">AI Sales</h2>
                        <p className="text-xs text-gray-500 truncate">GenAI Platform</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 sm:p-4 space-y-1 sm:space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-300 text-left text-sm sm:text-base ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            title={item.label}
                        >
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                            <span className="font-semibold truncate">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-2 sm:p-4 border-t border-gray-200">
                <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-primary-900 truncate">AI-Powered</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                        Predictive Analytics + GenAI for IT Sales
                    </p>
                </div>
            </div>
        </div>
    );
}
