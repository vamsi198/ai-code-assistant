import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    Share2,
    FileText,
    BarChart3,
    MessageSquare,
    BookOpen,
    Loader2,
    AlertCircle,
    CodeIcon,
} from 'lucide-react';
import { apiService } from '../services/api';
import AnalysisResults from '../components/AnalysisResults';
import ComplexityMetrics from '../components/ComplexityMetrics';
import ReviewComments from '../components/ReviewComments';
import DocumentationViewer from '../components/DocumentationViewer';
import UpdatedCode from '../components/UpdatedCode';
import { generateComprehensivePDFReport } from '../utils/pdfReportGenerator';

function Results() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchResults();
    }, [id]);

    const fetchResults = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await apiService.getResults(id);
            setResults(data);
        } catch (err) {
            console.error('Error fetching results:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = () => {
        if (!results) return;
        generateComprehensivePDFReport(results);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Code Analysis: ${results?.filename}`,
                text: `Quality Score: ${results?.summary?.quality_score}/100 (Grade ${results?.summary?.quality_grade})`,
                url: window.location.href
            }).catch(err => console.log('Share failed:', err));
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Report link copied to clipboard!');
        }
    };

    const tabs = [
        { id: 'overview', icon: FileText, label: 'Quality Score' },
        { id: 'metrics', icon: BarChart3, label: 'Complexity Metrics' },
        { id: 'comments', icon: MessageSquare, label: 'Review Comments' },
        { id: 'documentation', icon: BookOpen, label: 'Documentation' },
        { id: 'updated_code', icon: CodeIcon, label: 'Updated Code' }
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-sky-600 p-8">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-xl font-medium text-gray-700">Analyzing data and fetching results...</p>
            </div>
        );
    }

    if (error || !results) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-xl shadow-lg">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {error ? 'Failed to Load Results' : 'No Results Found'}
                </h2>
                <p className="text-gray-600 mb-6 max-w-md">{error || "The analysis you're looking for doesn't exist or may have been deleted."}</p>
                <button
                    className="flex items-center space-x-2 px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition duration-200 shadow-md"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>
            </div>
        );
    }

    return (
        <div className="results-page max-w-7xl mx-auto space-y-6 p-4 md:p-8">

            {/* ⭐ Header & Actions - ROUNDED BORDER + MARGIN */}
            <div className="flex justify-between items-start pb-4 border-2 border-gray-200 rounded-xl px-4 py-4 sticky top-16 z-20 bg-white shadow-sm mb-6">
                
                <div className="flex items-center space-x-4">
                    <button
                        className="p-2 rounded-full text-gray-500 hover:text-sky-600 hover:bg-gray-100 transition duration-200 flex items-center space-x-1 font-medium text-sm"
                        onClick={() => navigate('/dashboard')}
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={20} />
                        <span className='hidden sm:inline'>Dashboard</span>
                    </button>

                    <div className="header-info">
                        <h1 className="text-2xl font-bold text-gray-900 truncate max-w-md" title={results.filename}>
                            <FileText size={24} className="inline mr-2 text-sky-600" />
                            {results.filename}
                        </h1>
                        <p className="analysis-date text-sm text-gray-500 mt-0.5">
                            Analyzed: {new Date(results.timestamp).toLocaleDateString('en-US', {
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
                        className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-sky-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition duration-200 text-sm font-medium"
                        onClick={handleShare}
                    >
                        <Share2 size={18} />
                        <span>Share Link</span>
                    </button>
                </div>
            </div>

            {/* ⭐ Tabs Navigation - ROUNDED BORDER */}
            <div className="sticky top-32 z-10 bg-white border-2 border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                <nav className="flex space-x-2 overflow-x-auto whitespace-nowrap">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`
                                    flex items-center space-x-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200
                                    ${activeTab === tab.id
                                        ? 'text-sky-600 bg-sky-50 border-2 border-sky-500'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }
                                `}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={20} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content Area */}
            <div className="results-content pt-4">
                {activeTab === 'overview' && (
                    <AnalysisResults results={results} />
                )}

                {activeTab === 'metrics' && (
                    <ComplexityMetrics metrics={results.metrics} />
                )}

                {activeTab === 'comments' && (
                    <ReviewComments
                        comments={results.static_analysis?.issues}
                        llmReview={results.llm_review}
                    />
                )}

                {activeTab === 'documentation' && (
                    <DocumentationViewer documentation={results.documentation} />
                )}

                {activeTab === 'updated_code' && (
                    <UpdatedCode
                        code={results.updated_code}
                        refactoringSuccessful={results.refactoring_successful}
                    />
                )}
            </div>
        </div>
    );
}

export default Results;
