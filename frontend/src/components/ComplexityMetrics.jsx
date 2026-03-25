import { BarChart3, Activity, AlertCircle, TrendingUp, Code2, Scale } from 'lucide-react';

function ComplexityMetrics({ metrics }) {
    if (!metrics) {
        return (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-700 rounded-xl shadow-inner text-gray-500">
                <AlertCircle size={48} className="mx-auto text-yellow-500 mb-3" />
                <p className="text-lg font-medium">No complexity metrics available for this file.</p>
                <p className="text-sm">Metrics are typically calculated after successful static analysis.</p>
            </div>
        );
    }

    // Core functionality: Get complexity level color (No color changes here; kept standard complexity colors)
    const getComplexityColor = (complexity) => {
        if (complexity <= 5) return { color: 'text-green-500 dark:text-green-400', label: 'Low', hex: '#10b981' }; // green
        if (complexity <= 10) return { color: 'text-lime-500 dark:text-lime-400', label: 'Moderate', hex: '#84cc16' }; // lime
        if (complexity <= 20) return { color: 'text-amber-500 dark:text-amber-400', label: 'High', hex: '#f59e0b' }; // amber
        return { color: 'text-red-500 dark:text-red-400', label: 'Very High', hex: '#ef4444' }; // red
    };

    // Core functionality: Get maintainability color (No color changes here; kept standard quality colors)
    const getMaintainabilityColor = (score) => {
        if (score >= 80) return { color: 'text-green-500 dark:text-green-400', label: 'Excellent', hex: '#10b981' };
        if (score >= 60) return { color: 'text-lime-500 dark:text-lime-400', label: 'Good', hex: '#84cc16' };
        if (score >= 40) return { color: 'text-yellow-500 dark:text-yellow-400', label: 'Fair', hex: '#f59e0b' };
        if (score >= 20) return { color: 'text-orange-500 dark:text-orange-400', label: 'Poor', hex: '#f97316' };
        return { color: 'text-red-500 dark:text-red-400', label: 'Very Poor', hex: '#ef4444' };
    };

    // Data extraction and calculation (Core functionality preserved)
    const avgComplexity = metrics.cyclomatic_complexity || 0;
    const complexityInfo = getComplexityColor(avgComplexity);
    const maintainability = metrics.maintainability_index || 0;
    const maintainabilityInfo = getMaintainabilityColor(maintainability);

    // Component for a single detailed metric row
    const MetricRow = ({ name, value, tooltip }) => (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150 rounded-md px-2 -mx-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">{name}</span>
            <span className="text-gray-800 dark:text-gray-200 font-semibold text-lg">{value}</span>
        </div>
    );

    return (
        <div className="complexity-metrics space-y-8">
            <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <BarChart3 size={28} className="text-sky-600 dark:text-sky-400" /> {/* Updated to Sky Blue */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Code Maintainability Analysis</h2>
            </div>

            {/* Main Metrics Grid (Three Key Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> 

                {/* 1. Cyclomatic Complexity Card */}
                <div className={`p-6 rounded-2xl shadow-xl border-t-4 bg-white dark:bg-gray-800`} 
                     style={{ borderTopColor: complexityInfo.hex }}>
                    <div className="flex items-center justify-between mb-4">
                        <Activity size={32} className={`${complexityInfo.color}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${complexityInfo.color} bg-opacity-10`}
                              style={{ backgroundColor: `${complexityInfo.hex}20` }}>
                            {complexityInfo.label}
                        </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Cyclomatic Complexity</h3>
                    
                    <div className={`text-4xl font-extrabold mt-1`} style={{ color: complexityInfo.hex }}>
                        {avgComplexity.toFixed(1)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Measures the number of linearly independent paths. Lower complexity is easier to test.
                    </p>
                </div>

                {/* 2. Maintainability Index Card */}
                <div className={`p-6 rounded-2xl shadow-xl border-t-4 bg-white dark:bg-gray-800`} 
                     style={{ borderTopColor: maintainabilityInfo.hex }}>
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp size={32} className={`${maintainabilityInfo.color}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${maintainabilityInfo.color} bg-opacity-10`}
                              style={{ backgroundColor: `${maintainabilityInfo.hex}20` }}>
                            {maintainabilityInfo.label}
                        </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Maintainability Index</h3>
                    
                    <div className={`text-4xl font-extrabold mt-1`} style={{ color: maintainabilityInfo.hex }}>
                        {maintainability.toFixed(0)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        A score from 0 to 100. Higher score indicates better ease of maintenance.
                    </p>
                </div>

                {/* 3. Halstead Volume Card (Conditional) */}
                {metrics.halstead_metrics ? (
                    <div className="p-6 rounded-2xl shadow-xl border-t-4 border-sky-500 bg-white dark:bg-gray-800"> {/* Updated border color */}
                        <div className="flex items-center justify-between mb-4">
                            <Code2 size={32} className="text-sky-500" /> {/* Updated icon color */}
                            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full text-sky-500 bg-sky-500/20"> {/* Updated badge color */}
                                Size Metric
                            </span>
                        </div>
                        
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Halstead Volume</h3>
                        
                        <div className="text-4xl font-extrabold mt-1 text-sky-500"> {/* Updated value color */}
                            {metrics.halstead_metrics.volume?.toFixed(0) || 'N/A'}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Measures the required information content of the implementation.
                        </p>
                    </div>
                ) : (
                    <div className="p-6 rounded-2xl shadow-xl border-t-4 border-gray-400 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500">
                        <p className='text-center'>Halstead Metrics N/A</p>
                    </div>
                )}
            </div>

            {/* Detailed Metrics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                
                {/* Lines of Code Metrics */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Scale size={20} className="mr-2 text-sky-500" /> {/* Updated icon color */}
                        Code Size and Structure
                    </h3>
                    <div className="space-y-1">
                        <MetricRow name="Lines of Code (LOC)" value={metrics.lines_of_code || 0} />
                        <MetricRow name="Logical Lines of Code (LLOC)" value={metrics.logical_lines_of_code || 0} />
                        <MetricRow name="Source Lines of Code (SLOC)" value={metrics.source_lines_of_code || 0} />
                        <MetricRow name="Comment Lines" value={metrics.comments || 0} />
                        <MetricRow name="Multi-line Comments" value={metrics.multi_line_comments || 0} />
                        <MetricRow name="Blank Lines" value={metrics.blank_lines || 0} />
                    </div>
                </div>

                {/* Halstead Metrics Detailed (Conditional) */}
                {metrics.halstead_metrics && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Code2 size={20} className="mr-2 text-sky-500" /> {/* Updated icon color */}
                            Halstead Metrics Deep Dive
                        </h3>
                        <div className="space-y-1">
                            <MetricRow name="Program Length (N)" value={metrics.halstead_metrics.length?.toFixed(0) || 0} />
                            <MetricRow name="Vocabulary Size (eta)" value={metrics.halstead_metrics.vocabulary || 0} />
                            <MetricRow name="Difficulty (D)" value={metrics.halstead_metrics.difficulty?.toFixed(2) || 0} />
                            <MetricRow name="Effort (E)" value={metrics.halstead_metrics.effort?.toFixed(0) || 0} />
                            <MetricRow name="Time to Program (seconds)" value={metrics.halstead_metrics.time?.toFixed(0) || 0} />
                            <MetricRow name="Estimated Bugs (B)" value={metrics.halstead_metrics.bugs?.toFixed(2) || 0} />
                        </div>
                    </div>
                )}
            </div>

            {/* Complexity Interpretation Guide */}
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700 mt-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Cyclomatic Complexity Guide</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { range: '1 - 5', label: 'Low', description: 'Easy to test, debug, and maintain.', color: getComplexityColor(5).hex },
                        { range: '6 - 10', label: 'Moderate', description: 'Acceptable complexity, standard for simple logic.', color: getComplexityColor(10).hex },
                        { range: '11 - 20', label: 'High', description: 'Requires thorough testing. Consider splitting into smaller functions.', color: getComplexityColor(20).hex },
                        { range: '21+', label: 'Very High', description: 'Extremely complex. High risk of bugs and difficult to maintain.', color: getComplexityColor(21).hex },
                    ].map((item, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700/50 rounded-lg shadow-sm">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                            <div className='text-sm'>
                                <strong className='dark:text-white'>{item.range} ({item.label}):</strong> 
                                <span className='text-gray-600 dark:text-gray-400 ml-1'>{item.description}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ComplexityMetrics;