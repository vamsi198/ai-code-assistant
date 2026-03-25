import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import RepoResults from './pages/RepoResults'; // <-- ADD THIS IMPORT
import History from './pages/History';
import Footer from './components/Footer';
import './index.css';

function App() {
    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const root = document.documentElement;

        if (prefersDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, []);

    return (
        <Router>
            <div className="app flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
                <Navbar />
                
                <main className="main-content flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        
                        {/* Single file analysis results */}
                        <Route path="/results/:id" element={<Results />} /> 
                        
                        {/* Repository analysis results - ADD THIS */}
                        <Route path="/repo-results/:id" element={<RepoResults />} />
                        
                        <Route path="/history" element={<History />} />
                        
                        {/* 404 catch-all */}
                        <Route path="*" element={
                            <div className="text-center py-20">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">404 - Page Not Found</h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">The requested URL does not exist.</p>
                            </div>
                        } />
                    </Routes>
                </main>
                
                <Footer />
            </div>
        </Router>
    );
}

export default App;
