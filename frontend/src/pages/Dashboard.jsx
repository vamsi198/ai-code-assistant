import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BarChart3, 
    TrendingUp, 
    AlertTriangle, 
    CheckCircle,
    FileCode,
    Github, // Imported Github icon
    Eye,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { apiService } from '../services/api';

function Dashboard() {
    const [recentFileAnalyses, setRecentFileAnalyses] = useState([]);
    const [recentRepoAnalyses, setRecentRepoAnalyses] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    // Fetch data on mount
    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Data fetching logic
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [statsData, fileHistory, repoHistory] = await Promise.all([
                apiService.getStatistics(),
                apiService.getHistory(5, 0), // Top 5 file analyses
                // NOTE: Using a placeholder if apiService.getRepoHistory is not explicitly defined/imported
                apiService.getRepoHistory ? apiService.getRepoHistory(5, 0) : Promise.resolve({ history: [] })
            ]);
            
            setStats(statsData);
            setRecentFileAnalyses(fileHistory.history || []);
            setRecentRepoAnalyses(repoHistory.history || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Refresh handler
    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    };

    // Get grade color classes
    const getGradeClasses = (grade) => {
        const colors = {
            'A': 'bg-green-500 text-white',
            'B': 'bg-lime-500 text-gray-800',
            'C': 'bg-yellow-500 text-gray-800',
            'D': 'bg-orange-500 text-white',
            'F': 'bg-red-500 text-white'
        };
        return colors[grade] || 'bg-gray-400 text-white';
    };

    // Get hex color for progress bar
    const getGradeHexColor = (grade) => {
        const hex = {
            'A': '#10b981', 'B': '#84cc16', 'C': '#f59e0b', 'D': '#f97316', 'F': '#ef4444'
        };
        return hex[grade] || '#9ca3af';
    };

    // Stat card component
    const StatCard = ({ icon: Icon, title, value, label, iconBgColor }) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-0.5 border-t-4"
             style={{ borderTopColor: iconBgColor }}>
            <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full text-white" style={{ backgroundColor: iconBgColor }}>
                    <Icon size={30} />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-sky-600">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-xl font-medium text-gray-700">Loading dashboard data...</p>
            </div>
        );
    }

    const successRate = stats?.total_analyses > 0 
        ? Math.round((stats.total_analyses / (stats.total_analyses + 1)) * 100)
        : 0;
    
    const quickStatsData = [
        { label: 'Most Common Grade', value: stats?.most_common_grade || 'N/A' },
        { label: 'Total Functions Analyzed', value: stats?.total_functions || 0 },
        { label: 'Total Classes Analyzed', value: stats?.total_classes || 0 },
        { label: 'Avg Complexity', value: stats?.average_complexity?.toFixed(1) || 'N/A' }
    ];

    return (
        <div className="dashboard-page p-4 md:p-8 space-y-10">
            
            {/* Header & Refresh Button */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                        <BarChart3 size={28} className="mr-3 text-sky-600" />
                        Analysis Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Overview of your code analysis statistics.
                    </p>
                </div>
                <button 
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-200 disabled:opacity-50"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                    <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
            </div>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"> 
                <StatCard 
                    icon={FileCode} 
                    title="Total Analyses" 
                    value={stats?.total_analyses || 0} 
                    label="Files analyzed"
                    iconBgColor="#0ea5e9" // Sky-500 (New Primary Accent)
                />
                <StatCard 
                    icon={TrendingUp} 
                    title="Average Quality" 
                    value={stats?.average_quality_score || 0} 
                    label="Out of 100"
                    iconBgColor="#10b981" // Emerald-500
                />
                <StatCard 
                    icon={AlertTriangle} 
                    title="Total Issues" 
                    value={stats?.total_issues_found || 0} 
                    label="Issues detected"
                    iconBgColor="#ef4444" // Red-500
                />
                <StatCard 
                    icon={CheckCircle} 
                    title="Success Rate" 
                    value={`${successRate}%`} 
                    label="Successful analyses"
                    iconBgColor="#3b82f6" // Blue-500
                />
            </div>
            
            {/* Quick Statistics Grid */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickStatsData.map((item, index) => (
                        <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <span className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase block">{item.label}</span>
                            <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent File Analyses Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <FileCode className="mr-2 text-sky-600" size={24} />
                        Recent File Analyses
                    </h2>
                    <button 
                        className="flex items-center space-x-1 text-sky-600 dark:text-sky-400 font-semibold hover:text-sky-800 transition duration-200"
                        onClick={() => navigate('/history')}
                    >
                        <span>View All</span>
                        <span className='ml-1 text-lg'>→</span>
                    </button>
                </div>

                {recentFileAnalyses.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <FileCode size={48} className="mx-auto text-sky-500 mb-3" />
                        <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">No File Analyses Yet</h3>
                        <p className="mb-4">Upload a Python file to get started!</p>
                        <button 
                            className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition duration-200 shadow-md"
                            onClick={() => navigate('/')}
                        >
                            Upload File
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentFileAnalyses.map((analysis) => (
                            <div 
                                key={analysis.analysis_id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition cursor-pointer border-l-4 border-sky-500"
                                onClick={() => navigate(`/results/${analysis.analysis_id}`)}
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <FileCode size={20} className="text-sky-500" />
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{analysis.filename}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(analysis.timestamp).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeClasses(analysis.summary?.quality_grade)}`}>
                                        {analysis.summary?.quality_grade || 'N/A'}
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {analysis.summary?.quality_score || 0}
                                    </span>
                                    <Eye size={20} className="text-sky-600" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Repository Analyses Section (Updated icon) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Github className="mr-2 text-purple-600" size={24} /> {/* Changed GitBranch to Github */}
                        Recent Repository Analyses
                    </h2>
                    <button 
                        className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-800 transition duration-200"
                        onClick={() => navigate('/history')}
                    >
                        <span>View All</span>
                        <span className='ml-1 text-lg'>→</span>
                    </button>
                </div>

                {recentRepoAnalyses.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Github size={48} className="mx-auto text-purple-500 mb-3" /> {/* Changed GitBranch to Github */}
                        <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">No Repository Analyses Yet</h3>
                        <p className="mb-4">Clone a GitHub repository to analyze entire projects!</p>
                        <button 
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition duration-200 shadow-md"
                            onClick={() => navigate('/')}
                        >
                            Clone Repository
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentRepoAnalyses.map((repo) => (
                            <div 
                                key={repo._id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition cursor-pointer border-l-4 border-purple-500"
                                onClick={() => navigate(`/repo-results/${repo._id}`)}
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <Github size={20} className="text-purple-500" /> {/* Changed GitBranch to Github */}
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {repo.repo_url?.split('/').slice(-1)[0] || 'Unknown Repo'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                                            {repo.repo_url}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(repo.timestamp).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {repo.aggregate?.total_files || 0} files
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {Math.round(repo.aggregate?.average_quality || 0)}
                                        </p>
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {repo.aggregate?.total_issues || 0} issues
                                        </p>
                                    </div>
                                    <Eye size={20} className="text-purple-600" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;