import { useState } from 'react';
import { 
    CheckCircle, 
    AlertTriangle, 
    XCircle, 
    TrendingUp,
    Code,
    Shield,
    Lightbulb,
    FileText,
    List,
    Layers,
    ClipboardList,
    Loader2
} from 'lucide-react';

function AnalysisResults({ results }) {
    // NOTE: The state is retained here for local tab management, 
    // even though the parent Results.jsx handles the main tabs.
    const [activeTab, setActiveTab] = useState('review'); 

    if (!results) {
        return <div className="p-8 text-center text-xl text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-lg">No analysis results available</div>;
    }

    const { summary, llm_review, static_analysis } = results;

    // Core functionality: Get grade color
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

    // Core functionality: Get quality color (for the gauge chart)
    const getQualityColor = (score) => {
        if (score >= 90) return '#10b981'; // Emerald
        if (score >= 80) return '#84cc16'; // Lime
        if (score >= 70) return '#f59e0b'; // Amber
        if (score >= 60) return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    // Helper component for different issue types
    const getIssueVisuals = (type) => {
        switch (type) {
            case 'error':
                return { icon: XCircle, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' };
            case 'warning':
                return { icon: AlertTriangle, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' };
            case 'convention':
            case 'refactor':
                return { icon: Lightbulb, color: 'text-sky-500 bg-sky-100 dark:bg-sky-900/30' }; // Updated to Sky Blue
            default:
                return { icon: FileText, color: 'text-gray-500 bg-gray-100 dark:bg-gray-700/50' };
        }
    };

    // Tab Data Structure for easier rendering
    const tabs = [
        { id: 'review', label: 'AI Code Review', icon: Code, content: llm_review?.review },
        { id: 'suggestions', label: 'Key Suggestions', icon: Lightbulb, count: llm_review?.suggestions?.length, content: llm_review?.suggestions },
        { id: 'issues', label: 'Static Issues', icon: ClipboardList, count: static_analysis?.issues?.length, content: static_analysis?.issues },
        { id: 'security', label: 'Security Concerns', icon: Shield, count: llm_review?.security_concerns?.length, content: llm_review?.security_concerns },
        { id: 'structure', label: 'Code Structure', icon: Layers, content: static_analysis?.ast_analysis }
    ].filter(tab => tab.content || tab.id === 'review'); // Only show tabs with data or the default review tab

    const renderTabContent = () => {
        switch (activeTab) {
            case 'review':
                return (
                    <div className="prose dark:prose-invert max-w-none">
                        {llm_review?.review ? (
                            llm_review.review.split('\n').map((paragraph, index) => (
                                paragraph.trim() && <p key={index}>{paragraph}</p>
                            ))
                        ) : (
                            <p className="text-gray-500 italic">No detailed AI code review available.</p>
                        )}
                    </div>
                );
            case 'suggestions':
                return (
                    <ul className="space-y-4">
                        {llm_review?.suggestions?.length > 0 ? (
                            llm_review.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm">
                                    <CheckCircle size={20} className="text-sky-500 mt-1 flex-shrink-0 mr-3" /> {/* Updated to Sky Blue */}
                                    <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                                </li>
                            ))
                        ) : (
                            <p className="text-gray-500 italic">The AI did not find any specific suggestions.</p>
                        )}
                    </ul>
                );
            case 'security':
                return (
                    <ul className="space-y-4">
                        {llm_review?.security_concerns?.length > 0 ? (
                            llm_review.security_concerns.map((concern, index) => (
                                <li key={index} className="flex items-start p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-md">
                                    <Shield size={20} className="text-red-600 mt-1 flex-shrink-0 mr-3" />
                                    <span className="font-medium text-red-800 dark:text-red-300">{concern}</span>
                                </li>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <Shield size={36} />
                                <p className="mt-2 font-semibold">No critical security concerns were identified by the AI.</p>
                            </div>
                        )}
                    </ul>
                );
            case 'issues':
                return (
                    <div className="space-y-3">
                        {static_analysis?.issues?.length > 0 ? (
                            static_analysis.issues.slice(0, 50).map((issue, index) => {
                                const { icon: Icon, color: colorClass } = getIssueVisuals(issue.type);
                                return (
                                    <div key={index} className={`flex items-start p-4 rounded-xl border ${colorClass} dark:border-gray-700`}>
                                        <Icon size={20} className="flex-shrink-0 mt-1 mr-3" />
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start text-sm font-semibold mb-1">
                                                <span className={`uppercase text-xs px-2 py-0.5 rounded-full ${colorClass.replace('bg-', 'bg-').replace('text-', 'text-')}`}>{issue.type || 'Error'}</span>
                                                <span className="text-gray-600 dark:text-gray-400">Line {issue.line || 'N/A'}</span>
                                            </div>
                                            <p className="text-gray-800 dark:text-gray-200">{issue.message || 'No description'}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <CheckCircle size={48} />
                                <p className="mt-4 font-semibold">No static analysis issues found! Your code is clean. 🎉</p>
                            </div>
                        )}
                    </div>
                );
            case 'structure':
                const ast = static_analysis?.ast_analysis;
                if (!ast) return <p className="text-gray-500 italic">No structure analysis data available.</p>;
                return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* Summary Metrics */}
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner">
                            <Layers size={24} className="text-sky-500 mb-2" /> {/* Updated to Sky Blue */}
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Lines</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{ast.total_lines || 0}</p>
                        </div>
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner">
                            <Code size={24} className="text-sky-500 mb-2" /> {/* Updated to Sky Blue */}
                            <p className="text-xs text-gray-500 dark:text-gray-400">Functions</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{ast.functions?.length || 0}</p>
                        </div>
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner">
                            <FileText size={24} className="text-sky-500 mb-2" /> {/* Updated to Sky Blue */}
                            <p className="text-xs text-gray-500 dark:text-gray-400">Classes</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{ast.classes?.length || 0}</p>
                        </div>
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner">
                            <ClipboardList size={24} className={`${ast.docstring ? 'text-green-500' : 'text-red-500'} mb-2`} />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Has Docstring</p>
                            <p className={`text-2xl font-bold ${ast.docstring ? 'text-green-500' : 'text-red-500'}`}>
                                {ast.docstring ? 'Yes' : 'No'}
                            </p>
                        </div>
                        
                        {/* Detailed Lists */}
                        {ast.functions?.length > 0 && (
                            <div className="col-span-full md:col-span-2 mt-4">
                                <h4 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center"><List size={20} className="mr-2 text-sky-500"/> Defined Functions</h4> {/* Updated to Sky Blue */}
                                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600 dark:text-gray-400 max-h-48 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                                    {ast.functions.map((func, index) => (
                                        <li key={index} className="truncate">**{func.name}** (Line {func.line})</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {ast.classes?.length > 0 && (
                            <div className="col-span-full md:col-span-2 mt-4">
                                <h4 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center"><Layers size={20} className="mr-2 text-sky-500"/> Defined Classes</h4> {/* Updated to Sky Blue */}
                                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600 dark:text-gray-400 max-h-48 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                                    {ast.classes.map((cls, index) => (
                                        <li key={index} className="truncate">**{cls.name}** (Line {cls.line})</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="analysis-results max-w-6xl mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <TrendingUp size={28} className="mr-3 text-sky-600" /> {/* Updated to Sky Blue */}
                Detailed Code Analysis Report
            </h1>

            {/* Quality Score Card - High-level Summary */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl mb-8 border-t-4 border-sky-600"> {/* Updated border color */}
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                    
                    {/* Score Display (Gauge) */}
                    <div className="relative flex-shrink-0 w-36 h-36">
                        <div 
                            className="w-full h-full rounded-full"
                            style={{ 
                                background: `conic-gradient(${getQualityColor(summary?.quality_score || 0)} ${(summary?.quality_score || 0) * 3.6}deg, #e0e0e0 0deg)`,
                            }}
                        >
                            <div className="absolute inset-2 bg-white dark:bg-gray-800 rounded-full flex flex-col items-center justify-center">
                                <span className="text-4xl font-extrabold" style={{ color: getQualityColor(summary?.quality_score || 0) }}>
                                    {summary?.quality_score || 0}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
                            </div>
                        </div> 
                    </div> 

                    {/* Grade and Summary Metrics */}
                    <div className="flex-grow">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className={`px-4 py-2 text-2xl font-bold rounded-full shadow-lg ${getGradeClasses(summary?.quality_grade || 'F')}`}>
                                Grade {summary?.quality_grade || 'N/A'}
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Overall Code Quality</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t dark:border-gray-700">
                            {[
                                { label: 'Pylint Score', value: `${results.pylint_score || 0}/10` },
                                { label: 'Total Issues', value: summary?.total_issues || 0 },
                                { label: 'Functions', value: summary?.total_functions || 0 },
                                { label: 'Classes', value: summary?.total_classes || 0 }
                            ].map((metric, index) => (
                                <div key={index} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <p className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase">{metric.label}</p> {/* Updated to Sky Blue */}
                                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{metric.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabbed Navigation Section - Replicated from Results.jsx (simplified/integrated here) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl">
                {/* Tabs Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto whitespace-nowrap">
                    <nav className="flex space-x-2" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center space-x-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors duration-200
                                    ${activeTab === tab.id
                                        ? 'text-sky-600 border-b-2 border-sky-600 dark:text-sky-400 dark:border-sky-400 bg-gray-50 dark:bg-gray-700/50' // Highlight Sky Blue
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }
                                `}
                            >
                                <tab.icon size={20} />
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${tab.id === 'security' ? 'bg-red-500 text-white' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300'}`}> {/* Updated badge color */}
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}

export default AnalysisResults;