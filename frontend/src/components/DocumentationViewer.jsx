import { useState } from 'react';
import { 
    FileText, 
    ChevronDown, 
    ChevronUp, 
    Copy, 
    CheckCircle, 
    BookOpen, 
    Code, 
    Type,
    ListChecks
} from 'lucide-react';

// --- Copy Button Component ---
const CopyButton = ({ text, section, copiedSection, setCopiedSection }) => {
    const copyToClipboard = (content) => {
        const contentToCopy = typeof content === 'string' ? content : JSON.stringify(content);
        navigator.clipboard.writeText(contentToCopy).then(() => {
            setCopiedSection(section);
            setTimeout(() => setCopiedSection(null), 2000);
        });
    };

    return (
        <button 
            className="flex items-center space-x-1 text-sm font-medium transition duration-200 
                       text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(text);
            }}
        >
            {copiedSection === section ? (
                <>
                    <CheckCircle size={16} className="text-green-500" />
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <Copy size={16} />
                    <span>Copy</span>
                </>
            )}
        </button>
    );
};

function DocumentationViewer({ documentation }) {
    const [expandedSection, setExpandedSection] = useState('overview');
    const [copiedSection, setCopiedSection] = useState(null);

    if (!documentation || !documentation.sections) {
        return (
            <div className="p-10 text-center bg-white dark:bg-gray-800 rounded-xl shadow-lg text-gray-500">
                <FileText size={48} className="mx-auto text-sky-500 mb-3" />
                <p className="text-lg font-medium">No documentation available</p>
                <p className="text-sm">The AI could not generate documentation for this file.</p>
            </div>
        );
    }

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const formatDocstring = (docstring) => {
        if (!docstring) return <p className="italic text-gray-500 dark:text-gray-400">No documentation provided.</p>;
        
        return docstring.split('\n').map((line, idx) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                return <li key={idx} className="ml-4 list-disc text-gray-700 dark:text-gray-300">{trimmedLine.substring(2)}</li>
            }
            if (trimmedLine.match(/^\*\*/)) {
                return <p key={idx} className="mt-2 font-semibold text-gray-800 dark:text-gray-200">{line.replace(/\*\*/g, '')}</p>
            }
            return <p key={idx} className="text-gray-700 dark:text-gray-300">{line}</p>
        });
    };

    // Extract sections from documentation
    const sections = documentation.sections || {};
    const functions = sections.functions || [];
    const classes = sections.classes || [];
    const description = sections.description || 'No description available';
    const overview = sections.overview || {};
    const formattedOutput = documentation.formatted_output || '';

    const docSections = [
        { id: 'overview', title: 'Module Overview', icon: BookOpen, data: description, count: null },
        { id: 'functions', title: `Functions (${functions.length})`, icon: Code, data: functions, count: functions.length },
        { id: 'classes', title: `Classes (${classes.length})`, icon: Type, data: classes, count: classes.length },
        { id: 'markdown', title: 'Full Markdown Output', icon: ListChecks, data: formattedOutput, count: null },
    ].filter(section => section.data && (typeof section.data === 'string' ? section.data.length > 0 : section.data.length > 0) || section.id === 'overview');

    return (
        <div className="documentation-viewer bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b pb-3 border-gray-200 dark:border-gray-700">
                Generated Code Documentation
            </h2>

            <div className="space-y-4">
                {docSections.map((section) => (
                    <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        
                        {/* Section Header */}
                        <div 
                            className={`flex justify-between items-center p-4 cursor-pointer transition duration-150 
                                ${expandedSection === section.id ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`
                            }
                            onClick={() => toggleSection(section.id)}
                        >
                            <div className="flex items-center space-x-3">
                                <section.icon size={20} className="text-sky-600" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                            </div>
                            {expandedSection === section.id ? <ChevronUp size={20} className="text-sky-600" /> : <ChevronDown size={20} className="text-gray-500" />}
                        </div>

                        {/* Section Content */}
                        {expandedSection === section.id && (
                            <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                
                                {section.id === 'overview' && (
                                    <>
                                        {/* Module Description */}
                                        <div className="mb-6 p-4 rounded-lg bg-sky-50 dark:bg-gray-900/50 border border-sky-200 dark:border-sky-900">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-lg font-bold text-sky-700 dark:text-sky-300">Module Description</h4>
                                                <CopyButton 
                                                    text={description} 
                                                    section={'overview_copy'} 
                                                    copiedSection={copiedSection} 
                                                    setCopiedSection={setCopiedSection}
                                                />
                                            </div>
                                            <div className="doc-text prose dark:prose-invert max-w-none text-base">
                                                {formatDocstring(description)}
                                            </div>
                                        </div>

                                        {/* Overview Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                            {[
                                                { label: 'Total Lines', value: overview.total_lines || 0 },
                                                { label: 'Functions', value: overview.total_functions || 0 },
                                                { label: 'Classes', value: overview.total_classes || 0 },
                                                { label: 'Quality Score', value: `${overview.quality_score || 0}/100`, color: 'text-sky-600' },
                                            ].map((item, i) => (
                                                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">{item.label}</span>
                                                    <span className={`text-2xl font-bold ${item.color || 'text-gray-900 dark:text-white'}`}>{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {section.id === 'functions' && functions.length > 0 && (
                                    <div className="space-y-6">
                                        {functions.map((func, index) => (
                                            <FunctionClassDocCard 
                                                key={index}
                                                item={func}
                                                type="function"
                                                index={index}
                                                copiedSection={copiedSection}
                                                setCopiedSection={setCopiedSection}
                                                formatDocstring={formatDocstring}
                                            />
                                        ))}
                                    </div>
                                )}

                                {section.id === 'classes' && classes.length > 0 && (
                                    <div className="space-y-6">
                                        {classes.map((cls, index) => (
                                            <FunctionClassDocCard 
                                                key={index}
                                                item={cls}
                                                type="class"
                                                index={index}
                                                copiedSection={copiedSection}
                                                setCopiedSection={setCopiedSection}
                                                formatDocstring={formatDocstring}
                                            />
                                        ))}
                                    </div>
                                )}

                                {section.id === 'markdown' && formattedOutput && (
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <CopyButton 
                                                text={formattedOutput} 
                                                section={'markdown_copy'} 
                                                copiedSection={copiedSection} 
                                                setCopiedSection={setCopiedSection}
                                            />
                                        </div>
                                        <pre className="p-4 rounded-xl bg-gray-900 dark:bg-black text-green-300 overflow-x-auto text-sm shadow-inner">
                                            <code>{formattedOutput}</code>
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Function/Class Documentation Card Component ---
const FunctionClassDocCard = ({ item, type, index, copiedSection, setCopiedSection, formatDocstring }) => (
    <div className="p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md bg-gray-50 dark:bg-gray-900/40">
        <div className="flex justify-between items-start mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">
            <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="text-sm font-normal text-sky-600 dark:text-sky-400 mr-2 uppercase">{type}</span>
                <code className="bg-gray-200 dark:bg-gray-700 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded text-lg font-mono">
                    {item.name}
                </code>
            </h4>
            <CopyButton 
                text={item.docstring || item.name} 
                section={`${type}-${index}-copy`} 
                copiedSection={copiedSection} 
                setCopiedSection={setCopiedSection}
            />
        </div>

        {/* Signature */}
        <div className="mb-4 p-3 bg-gray-200/50 dark:bg-gray-700 rounded-lg overflow-x-auto text-sm font-mono text-gray-800 dark:text-gray-200">
            <code>{item.signature || `${type} ${item.name}`}</code>
        </div>

        {/* Docstring */}
        <div className="mb-4">
            <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 border-b dark:border-gray-700">Docstring</h5>
            <div className="prose dark:prose-invert max-w-none text-base pl-2">
                {formatDocstring(item.docstring)}
            </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap space-x-4 text-sm text-gray-500 dark:text-gray-400 border-t pt-3 dark:border-gray-700">
            <span className="meta-item">Lines: <strong className='dark:text-gray-300'>{item.line_start}-{item.line_end}</strong></span>
            {item.parameters && item.parameters.length > 0 && (
                <span className="meta-item">Parameters: <strong className='dark:text-gray-300'>{item.parameters.length}</strong></span>
            )}
            {item.methods && (
                <span className="meta-item">Methods: <strong className='dark:text-gray-300'>{item.methods.length}</strong></span>
            )}
        </div>
    </div>
);

export default DocumentationViewer;
