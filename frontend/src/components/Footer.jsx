import React from 'react';

/**
 * Standard footer component for application-wide consistency.
 */
function Footer() {
    return (
        <footer className="app-footer w-full py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    © 2025 AI Code Assistant 
                </p>
            </div>
        </footer>
    );
}

export default Footer;