import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, History, Bot, Menu } from 'lucide-react';

function Navbar() {
    const location = useLocation();
    
    // Core functionality: Checks if the current path matches the item path
    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/history', icon: History, label: 'History' }
    ];

    return (
        // Navbar container: Added backdrop-blur for glass effect
        <nav className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 shadow-lg border-b border-gray-100 dark:border-gray-800 backdrop-blur-sm transition-shadow duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    
                    {/* Brand/Logo Section (Left) - VERSION 10: Unified Icon and Vibrant Text */}
                    <Link to="/" className="flex items-center space-x-2 transition duration-150 hover:opacity-90">
                        <div className="text-sky-600 dark:text-sky-400">
                            <Bot size={35} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 leading-tight">
                            AI Code Assistant
                        </h1>
                    </Link>

                    {/* Navigation Menu (Center) - Unique hover/active effect moved to bottom */}
                    <ul className="hidden md:flex space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            
                            // Primary Accent Color: Sky Blue
                            const activeClasses = 'text-sky-600 dark:text-sky-400';
                            const inactiveClasses = 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white';

                            return (
                                <li key={item.path} className="relative group h-full flex items-center">
                                    {/* UNIQUE: Active accent bar moved to BOTTOM (bottom-0) */}
                                    {active && (
                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-600 rounded-b-sm animate-fadeIn"></div>
                                    )}
                                    
                                    <Link 
                                        to={item.path}
                                        className={`flex items-center px-4 py-3 rounded-lg font-medium transition duration-200 
                                            ${active ? activeClasses : inactiveClasses}
                                            group-hover:bg-gray-50 dark:group-hover:bg-gray-800
                                        `}
                                    >
                                        <Icon size={20} className="mr-2" />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Mobile Menu Button (Right) */}
                    <div className="flex items-center space-x-4">
                        <button 
                            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Toggle menu"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;