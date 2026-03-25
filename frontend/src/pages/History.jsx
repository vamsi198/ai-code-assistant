import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    History as HistoryIcon,
    Trash2,
    Eye,
    FileCode,
    Search,
    RefreshCw,
    Filter,
    Loader2,
    Github,
    AlertTriangle,
    X,
    CheckCircle
} from 'lucide-react';
import { apiService } from '../services/api';

function History() {
    const [fileHistory, setFileHistory] = useState([]);
    const [repoHistory, setRepoHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('files'); 
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [gradeFilter, setGradeFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    
    // ⭐ NEW: Modal state
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, type: null, name: '' });
    const [toast, setToast] = useState(null);
    
    const navigate = useNavigate();

    // ⭐ Toast notification helper
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        filterHistory();
    }, [searchTerm, gradeFilter, activeTab, fileHistory, repoHistory]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const fileData = await apiService.getHistory(50, 0);
            setFileHistory(fileData.history || []);
            
            const repoData = await apiService.getRepoHistory ? await apiService.getRepoHistory(50, 0) : { history: [] };
            setRepoHistory(repoData.history || []);
            
        } catch (error) {
            console.error('Error fetching history:', error);
            showToast('Failed to load history', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterHistory = () => {
        const currentHistory = activeTab === 'files' ? fileHistory : repoHistory;
        let filtered = [...currentHistory];

        if (searchTerm) {
            filtered = filtered.filter(item => {
                if (activeTab === 'files') {
                    return item.filename?.toLowerCase().includes(searchTerm.toLowerCase());
                } else {
                    return item.repo_url?.toLowerCase().includes(searchTerm.toLowerCase());
                }
            });
        }

        if (gradeFilter !== 'all' && activeTab === 'files') {
            filtered = filtered.filter(item =>
                item.summary?.quality_grade === gradeFilter
            );
        }

        setFilteredHistory(filtered);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchHistory();
        setRefreshing(false);
        showToast('History refreshed successfully!', 'success');
    };

    // ⭐ UPDATED: Show confirmation modal instead of window.confirm
    const handleDeleteClick = (id, type, name) => {
        setDeleteModal({ show: true, id, type, name });
    };

    // ⭐ UPDATED: Actual delete function (called after confirmation)
    const handleDeleteConfirm = async () => {
        const { id, type } = deleteModal;
        setDeleteModal({ show: false, id: null, type: null, name: '' });
        setRefreshing(true);

        try {
            if (type === 'repo') {
                await apiService.deleteRepoAnalysis(id);
            } else {
                await apiService.deleteAnalysis(id);
            }
            
            await fetchHistory();
            showToast(`${type === 'repo' ? 'Repository' : 'File'} analysis deleted successfully!`, 'success');
            
        } catch (error) {
            console.error(`Error deleting ${type} analysis:`, error);
            showToast(`Failed to delete ${type} analysis`, 'error');
        } finally {
            setRefreshing(false);
        }
    };

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
    
    const getGradeHexColor = (grade) => {
        const hex = {
            'A': '#10b981', 'B': '#84cc16', 'C': '#f59e0b', 'D': '#f97316', 'F': '#ef4444'
        };
        return hex[grade] || '#9ca3af';
    };

    if (loading || refreshing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-sky-600">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-xl font-medium text-gray-700">
                    {loading ? 'Loading analysis history...' : 'Updating history...'}
                </p>
            </div>
        );
    }

    return (
        <div className="history-page p-4 md:p-8 space-y-8 relative">
            
            {/* ⭐ Toast Notification */}
            {toast && (
                <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
                    <div className={`flex items-center space-x-3 px-6 py-4 rounded-lg shadow-2xl border-l-4 ${
                        toast.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                        toast.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                        'bg-sky-50 border-sky-500 text-sky-800'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <span className="font-medium">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-white/50 rounded">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ⭐ Delete Confirmation Modal */}
            {deleteModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Delete {deleteModal.type === 'repo' ? 'Repository' : 'File'} Analysis?
                        </h3>

                        {/* Message */}
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            Are you sure you want to permanently delete <strong className="text-gray-900 dark:text-white">"{deleteModal.name}"</strong>? 
                            This action cannot be undone.
                        </p>

                        {/* Buttons */}
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setDeleteModal({ show: false, id: null, type: null, name: '' })}
                                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition shadow-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header & Refresh Button */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                        <HistoryIcon size={28} className="mr-3 text-sky-600" />
                        Analysis History
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and manage all your past code analysis reports.
                    </p>
                </div>
                <button 
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition duration-200 disabled:opacity-50"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                    <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('files')}
                    className={`pb-3 px-3 font-semibold flex items-center space-x-2 transition ${
                        activeTab === 'files'
                            ? 'border-b-2 border-sky-500 text-sky-600'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                >
                    <FileCode className="mr-2" size={20} />
                    <span>File Analyses ({fileHistory.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('repos')}
                    className={`pb-3 px-3 font-semibold flex items-center space-x-2 transition ${
                        activeTab === 'repos'
                            ? 'border-b-2 border-purple-500 text-purple-600'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                >
                    <Github className="mr-2" size={20} />
                    <span>Repository Analyses ({repoHistory.length})</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6 bg-gradient-to-r from-white to-sky-50/30 dark:from-gray-800 dark:to-gray-800 p-4 rounded-xl shadow-lg border border-sky-100 dark:border-gray-700">
                
                <div className="relative flex-grow">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={activeTab === 'files' ? 'Search by filename...' : 'Search by repository URL...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-sky-500 focus:ring-sky-500 bg-white dark:bg-gray-700 dark:text-white text-gray-900 placeholder-gray-500"
                    />
                </div>

                {activeTab === 'files' && (
                    <div className="relative flex items-center space-x-2 flex-shrink-0">
                        <Filter size={18} className="text-sky-500" />
                        <select 
                            value={gradeFilter} 
                            onChange={(e) => setGradeFilter(e.target.value)}
                            className="py-2 pl-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-sky-500 focus:ring-sky-500 bg-white dark:bg-gray-700 dark:text-white"
                        >
                            <option value="all">All Grades</option>
                            <option value="A">Grade A</option>
                            <option value="B">Grade B</option>
                            <option value="C">Grade C</option>
                            <option value="D">Grade D</option>
                            <option value="F">Grade F</option>
                        </select>
                    </div>
                )}

                <div className="flex-shrink-0">
                    <span className="px-3 py-1 bg-gradient-to-r from-sky-100 to-purple-100 text-sky-700 dark:from-sky-900/50 dark:to-purple-900/50 dark:text-sky-300 rounded-full font-bold text-sm border border-sky-200 dark:border-sky-700">
                        {filteredHistory.length} {filteredHistory.length === 1 ? 'Result' : 'Results'}
                    </span>
                </div>
            </div>

            {/* Content Display */}
            {filteredHistory.length === 0 ? (
                <div className="no-history p-12 text-center text-gray-500 dark:text-gray-400 bg-gradient-to-br from-gray-50 to-sky-50/20 dark:from-gray-700/50 dark:to-gray-700/50 rounded-xl shadow-lg">
                    {activeTab === 'files' ? <FileCode size={64} className="mx-auto text-sky-500 mb-4" /> : <Github size={64} className="mx-auto text-purple-500 mb-4" />} 
                    <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
                        {searchTerm || gradeFilter !== 'all' 
                            ? 'No results match your criteria' 
                            : `No ${activeTab === 'files' ? 'File' : 'Repository'} Analyses Yet`}
                    </h2>
                    <p className="mb-6">
                        {searchTerm || gradeFilter !== 'all'
                            ? 'Please clear or adjust your search filters.'
                            : `${activeTab === 'files' ? 'Upload a Python file' : 'Clone a GitHub repository'} to see history here!`}
                    </p>
                    {!searchTerm && gradeFilter === 'all' && (
                        <button 
                            className="px-6 py-3 bg-gradient-to-r from-sky-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition duration-200"
                            onClick={() => navigate('/')}
                        >
                            Start Analyzing
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"> 
                    {filteredHistory.map((item) => {
                        const isFile = activeTab === 'files';
                        const grade = isFile ? item.summary?.quality_grade : 'N/A';
                        const score = isFile ? item.summary?.quality_score || 0 : Math.round(item.aggregate?.average_quality || 0);
                        const gradeColor = isFile ? getGradeHexColor(grade) : '#8b5cf6';
                        const itemName = isFile ? item.filename : (item.repo_url?.split('/').slice(-1)[0] || 'Unknown Repo');

                        return (
                            <div key={item.analysis_id} className="group bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg border-t-4 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                                style={{ borderTopColor: gradeColor }}>
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                        {isFile ? <FileCode size={20} className="text-sky-500 flex-shrink-0" /> : <Github size={20} className="text-purple-500 flex-shrink-0" />}
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate" title={isFile ? item.filename : item.repo_url}>
                                            {itemName}
                                        </h3>
                                    </div>
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${isFile ? getGradeClasses(grade) : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'}`}>
                                        {isFile ? (grade || 'N/A') : 'REPO'}
                                    </span>
                                </div>

                                <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="metric-row">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score:</span>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                                            <div 
                                                className="h-2.5 rounded-full transition-all duration-700"
                                                style={{ 
                                                    width: `${score}%`,
                                                    backgroundColor: gradeColor
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1 block">{score}/100</span>
                                    </div>

                                    {[
                                        { label: isFile ? 'Total Issues' : 'Total Issues', value: isFile ? item.summary?.total_issues || 0 : item.aggregate?.total_issues || 0, color: 'text-red-500' },
                                        { label: isFile ? 'Functions' : 'Files Analyzed', value: isFile ? item.summary?.total_functions || 0 : item.aggregate?.total_files || 0 },
                                        { label: isFile ? 'Classes' : 'Total Lines', value: isFile ? item.summary?.total_classes || 0 : (item.aggregate?.total_lines?.toLocaleString() || 'N/A') },
                                    ].map((metric, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{metric.label}:</span>
                                            <span className={`font-semibold ${metric.color || 'text-gray-800 dark:text-gray-200'}`}>{metric.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center pt-4 text-sm">
                                    <span className="analysis-date text-gray-500 dark:text-gray-400">
                                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>

                                    <div className="card-actions flex space-x-3">
                                        <button
                                            className={`flex items-center space-x-1 font-medium transition duration-150 ${
                                                isFile ? 'text-sky-600 hover:text-sky-800' : 'text-purple-600 hover:text-purple-800'
                                            }`}
                                            onClick={() => navigate(isFile ? `/results/${item.analysis_id}` : `/repo-results/${item._id}`)}
                                        >
                                            <Eye size={16} />
                                            <span>View</span>
                                        </button>
                                        <button
                                            className="text-red-500 hover:text-red-700 transition duration-150 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(
                                                    isFile ? item.analysis_id : item._id,
                                                    isFile ? 'file' : 'repo',
                                                    itemName
                                                );
                                            }}
                                            aria-label="Delete analysis"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default History;
