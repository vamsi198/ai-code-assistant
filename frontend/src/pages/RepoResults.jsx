import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    Share2,
    Github,
    BarChart3,
    AlertCircle,
    Loader2,
    FileCode,
    TrendingUp,
    AlertTriangle,
    ChevronRight,
    X,
    FileText,
    MessageSquare,
    Sparkles,
} from 'lucide-react';
import { apiService } from '../services/api';
import AnalysisResults from '../components/AnalysisResults';
import ComplexityMetrics from '../components/ComplexityMetrics';
import ReviewComments from '../components/ReviewComments';

function RepoResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [repoData, setRepoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchRepoAnalysis();
    }, [id]);

    const fetchRepoAnalysis = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await apiService.getRepoResults(id);
            setRepoData(data);
        } catch (err) {
            console.error('❌ Error fetching repo:', err);
            setError(apiService.formatErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = () => {
        if (!repoData) return;
        alert('Repository PDF export coming soon!');
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Repository Analysis: ${repoData?.repo_url}`,
                text: `Average Quality: ${Math.round(repoData?.aggregate?.average_quality || 0)}/100`,
                url: window.location.href
            }).catch(err => console.log('Share failed:', err));
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Report link copied to clipboard!');
        }
    };

    const getGradeColor = (score) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 80) return 'text-lime-600';
        if (score >= 70) return 'text-yellow-600';
        if (score >= 60) return 'text-orange-600';
        return 'text-red-600';
    };

    const getGradeBg = (score) => {
        if (score >= 90) return 'bg-green-100 border-green-500';
        if (score >= 80) return 'bg-lime-100 border-lime-500';
        if (score >= 70) return 'bg-yellow-100 border-yellow-500';
        if (score >= 60) return 'bg-orange-100 border-orange-500';
        return 'bg-red-100 border-red-500';
    };

    // ⭐ FILE DETAIL MODAL - FULLSCREEN
    const renderFileDetails = () => {
        if (!selectedFile) return null;

        const tabs = [
            { id: 'overview', icon: FileText, label: 'Overview' },
            { id: 'ai_review', icon: Sparkles, label: 'AI Review' },
            { id: 'metrics', icon: BarChart3, label: 'Metrics' },
            { id: 'comments', icon: AlertTriangle, label: 'Static Issues' },
        ];

        const structuredResults = {
            summary: selectedFile.summary,
            static_analysis: selectedFile.static_analysis,
            metrics: selectedFile.metrics,
            llm_review: selectedFile.llm_review,
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 w-full h-full overflow-hidden flex flex-col">

                    {/* Modal Header */}
                    <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                <FileCode className="mr-2 text-sky-600" size={24} />
                                {selectedFile.filename}
                            </h2>
                            <div className="flex items-center space-x-4 mt-2">
                                <span className={`text-2xl font-bold ${getGradeColor(selectedFile.quality_score)}`}>
                                    {selectedFile.quality_score}/100
                                </span>
                                <span className="text-base text-gray-500 dark:text-gray-400">
                                    Grade: {selectedFile.quality_grade}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                            title="Close (Esc)"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <nav className="flex space-x-2 px-6 overflow-x-auto">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        className={`
                                            flex items-center space-x-2 px-4 py-3 text-sm font-semibold transition whitespace-nowrap
                                            ${activeTab === tab.id
                                                ? 'text-sky-600 border-b-2 border-sky-600 bg-white dark:bg-gray-900'
                                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }
                                        `}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <Icon size={18} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        {activeTab === 'overview' && (
                            <div className="max-w-7xl mx-auto space-y-4">
                                <AnalysisResults results={structuredResults} />
                            </div>
                        )}

                        {activeTab === 'ai_review' && selectedFile.llm_review && (
                            <div className="max-w-7xl mx-auto space-y-4">
                                <ReviewComments
                                    comments={[]}
                                    llmReview={selectedFile.llm_review}
                                />
                            </div>
                        )}

                        {activeTab === 'metrics' && selectedFile.metrics && (
                            <div className="max-w-7xl mx-auto space-y-4">
                                <ComplexityMetrics metrics={selectedFile.metrics} />
                            </div>
                        )}

                        {activeTab === 'comments' && selectedFile.static_analysis && (
                            <div className="max-w-7xl mx-auto space-y-4">
                                <ReviewComments
                                    comments={selectedFile.static_analysis.issues}
                                    llmReview={null}
                                />
                            </div>
                        )}

                        {selectedFile.error && (
                            <div className="text-center py-12 text-red-500 dark:text-red-400">
                                <AlertCircle size={48} className="mx-auto mb-3" />
                                <p className="text-lg font-medium">Detailed Analysis Failed for this File.</p>
                                <p className="text-sm mt-2">Error: {selectedFile.error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-purple-600 p-8">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-xl font-medium text-gray-700">Loading repository analysis...</p>
            </div>
        );
    }

    if (error || !repoData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-xl shadow-lg">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {error ? 'Failed to Load Results' : 'No Results Found'}
                </h2>
                <p className="text-gray-600 mb-6 max-w-md">{error || "The repository analysis you're looking for doesn't exist or may have been deleted."}</p>
                <button
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition duration-200 shadow-md"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>
            </div>
        );
    }

    const { aggregate, repo_url, timestamp } = repoData;
    const avgQuality = Math.round(aggregate?.average_quality || 0);

    return (
        <div className="repo-results-page max-w-7xl mx-auto space-y-6 p-4 md:p-8">

            {/* ⭐ Header & Actions - ROUNDED BORDER + MARGIN */}
            <div className="flex justify-between items-start pb-4 border-2 border-gray-200 rounded-xl px-4 py-4 sticky top-16 z-20 bg-white shadow-sm mb-6">

                <div className="flex items-center space-x-4">
                    <button
                        className="p-2 rounded-full text-gray-500 hover:text-purple-600 hover:bg-gray-100 transition duration-200 flex items-center space-x-1 font-medium text-sm"
                        onClick={() => navigate('/dashboard')}
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={20} />
                        <span className='hidden sm:inline'>Dashboard</span>
                    </button>

                    <div className="header-info">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Github size={24} className="inline mr-2 text-purple-600" />
                            {repo_url?.split('/').slice(-1)[0] || 'Repository Analysis'}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-2xl" title={repo_url}>
                            {repo_url}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Analyzed: {new Date(timestamp).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                <div className="header-actions flex space-x-3 flex-shrink-0">
                    <button
                        className="flex items-center space-x-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition duration-200 text-sm font-medium"
                        onClick={handleDownloadReport}
                    >
                        <Download size={18} />
                        <span>Download PDF</span>
                    </button>
                    <button
                        className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm font-medium"
                        onClick={handleShare}
                    >
                        <Share2 size={18} />
                        <span>Share Link</span>
                    </button>
                </div>

            </div>

            {/* Aggregate Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-purple-500 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white">
                            <TrendingUp size={30} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Quality</p>
                            <p className={`text-3xl font-extrabold ${getGradeColor(avgQuality)}`}>{avgQuality}/100</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-sky-500 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-gradient-to-br from-sky-600 to-sky-700 text-white">
                            <FileCode size={30} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Files</p>
                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{aggregate?.total_files || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-red-500 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white">
                            <AlertTriangle size={30} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Issues</p>
                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{aggregate?.total_issues || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-green-500 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white">
                            <BarChart3 size={30} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Lines</p>
                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{aggregate?.total_lines?.toLocaleString() || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quality Distribution */}
            {aggregate?.quality_distribution && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                        <BarChart3 className="mr-2 text-purple-600" size={24} />
                        Quality Distribution
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Excellent (90+)', value: aggregate.quality_distribution.excellent || 0, color: 'bg-green-500' },
                            { label: 'Good (70-89)', value: aggregate.quality_distribution.good || 0, color: 'bg-lime-500' },
                            { label: 'Fair (50-69)', value: aggregate.quality_distribution.fair || 0, color: 'bg-yellow-500' },
                            { label: 'Poor (<50)', value: aggregate.quality_distribution.poor || 0, color: 'bg-red-500' },
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200">
                                <div className={`w-full h-2 ${item.color} rounded-full mb-2`}></div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{item.label}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Files List - Clickable */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <FileCode className="mr-2 text-sky-600" size={24} />
                    Files Analyzed ({aggregate?.files?.length || 0})
                    <span className="text-sm font-normal text-gray-500 ml-2">
                        (Click to view details)
                    </span>
                </h2>

                {aggregate?.files && aggregate.files.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {aggregate.files.map((file, i) => {
                            const score = file.quality_score || 0;
                            const gradeClass = getGradeBg(score);
                            const topColor = getGradeColor(score).replace('text-', 'border-');

                            return (
                                <div
                                    key={i}
                                    className={`p-4 rounded-lg border-l-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer group ${gradeClass} ${topColor}`}
                                    onClick={() => setSelectedFile(file)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-mono font-bold text-gray-900 dark:text-white text-sm truncate flex-1" title={file.filename}>
                                            {file.filename}
                                        </h3>
                                        <ChevronRight className="text-gray-400 group-hover:text-sky-600 transition flex-shrink-0" size={20} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Quality:</span>
                                            <span className={`font-bold ${getGradeColor(score)}`}>{score}/100</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Issues:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{file.issues_count || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Lines:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{file.total_lines}</span>
                                        </div>
                                        {file.error && (
                                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                                                ⚠️ {file.error}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <FileCode size={48} className="mx-auto mb-3 text-gray-300" />
                        <p>No files were analyzed in this repository.</p>
                    </div>
                )}
            </div>

            {/* File Detail Modal */}
            {selectedFile && renderFileDetails()}

            {/* Back Button */}
            <div className="flex justify-center">
                <button
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-semibold hover:-translate-y-0.5"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>
            </div>
        </div>
    );
}

export default RepoResults;
