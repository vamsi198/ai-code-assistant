import { MessageSquare, ThumbsUp, AlertTriangle, Info, CheckCircle2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function ReviewComments({ comments, llmReview }) {
    if (!comments && !llmReview) {
        return (
            <div className="p-10 text-center bg-white dark:bg-gray-800 rounded-xl shadow-lg text-gray-500">
                <MessageSquare size={48} className="mx-auto text-sky-500 mb-3" />
                <p className="text-lg font-medium">No review comments available</p>
                <p className="text-sm">Run a full analysis to generate code comments and suggestions.</p>
            </div>
        );
    }

    const getCommentTypeInfo = (type) => {
        const defaultInfo = { icon: Info, color: 'text-gray-600', border: 'border-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/50', name: 'INFO' };
        const types = {
            'error': { icon: AlertTriangle, color: 'text-red-600', border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/30', name: 'ERROR' },
            'warning': { icon: AlertTriangle, color: 'text-orange-600', border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30', name: 'WARNING' },
            'suggestion': { icon: ThumbsUp, color: 'text-sky-600', border: 'border-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/30', name: 'SUGGESTION' },
            'info': defaultInfo,
            'best-practice': { icon: CheckCircle2, color: 'text-green-600', border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/30', name: 'BEST PRACTICE' }
        };
        return types[type] || defaultInfo;
    };

    const categorizedComments = { critical: [], important: [], suggestions: [], info: [] };

    if (llmReview?.suggestions) {
        llmReview.suggestions.forEach((suggestion, index) => {
            categorizedComments.suggestions.push({
                id: `llm-suggestion-${index}`,
                type: 'suggestion',
                message: suggestion,
                source: 'AI Review'
            });
        });
    }

    if (llmReview?.security_concerns) {
        llmReview.security_concerns.forEach((concern, index) => {
            categorizedComments.critical.push({
                id: `security-${index}`,
                type: 'error',
                message: concern,
                source: 'Security Analysis',
                severity: 'CRITICAL'
            });
        });
    }

    if (comments) {
        comments.forEach((comment, index) => {
            const severity = comment.severity?.toLowerCase() || 'info';
            const category =
                severity === 'critical' || severity === 'error' ? 'critical' :
                severity === 'high' || severity === 'warning' ? 'important' :
                severity === 'medium' || severity === 'suggestion' ? 'suggestions' : 'info';
            categorizedComments[category].push({ id: `comment-${index}`, ...comment });
        });
    }

    const totalComments =
        categorizedComments.critical.length +
        categorizedComments.important.length +
        categorizedComments.suggestions.length +
        categorizedComments.info.length;

    // Custom Markdown renderer components
    const markdownComponents = {
        h1: ({ children }) => (
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2 border-b border-sky-200 dark:border-sky-700 pb-1">{children}</h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mt-4 mb-1">{children}</h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-3 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{children}</p>
        ),
        ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 space-y-1 mb-3">{children}</ul>
        ),
        ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 space-y-1 mb-3">{children}</ol>
        ),
        li: ({ children }) => (
            <li className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
        ),
        em: ({ children }) => (
            <em className="italic text-gray-600 dark:text-gray-400">{children}</em>
        ),
        code: ({ inline, children }) =>
            inline ? (
                <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-sm font-mono text-sky-700 dark:text-sky-300">{children}</code>
            ) : (
                <pre className="mt-2 p-3 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-x-auto text-sm font-mono text-gray-800 dark:text-gray-200">
                    <code>{children}</code>
                </pre>
            ),
        blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-sky-400 pl-4 italic text-gray-600 dark:text-gray-400 my-2">{children}</blockquote>
        ),
    };

    const CommentCard = ({ comment }) => {
        const typeKey = comment.type?.toLowerCase() || 'info';
        const typeInfo = getCommentTypeInfo(typeKey);
        const Icon = typeInfo.icon;
        const isCritical = comment.severity?.toLowerCase() === 'critical' || comment.source === 'Security Analysis';
        const cardClasses = isCritical
            ? 'border-l-4 border-red-700 bg-red-100 dark:bg-red-900/50 shadow-lg'
            : `border-l-4 ${typeInfo.border} ${typeInfo.bg} shadow-md`;

        return (
            <div className={`flex items-start p-4 rounded-xl transition duration-150 space-x-3 ${cardClasses}`}>
                <div className={`flex-shrink-0 pt-1 ${typeInfo.color}`}>
                    <Icon size={24} />
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                        <span
                            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeInfo.color} bg-opacity-10`}
                            style={{ backgroundColor: isCritical ? 'rgba(220, 38, 38, 0.1)' : typeInfo.bg }}
                        >
                            {isCritical ? 'CRITICAL' : typeInfo.name}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2">
                            {comment.line && <span>Line {comment.line}</span>}
                            {comment.source && <span className="font-semibold">{comment.source}</span>}
                        </div>
                    </div>
                    <p className="text-gray-800 dark:text-gray-100 mt-1 font-medium leading-relaxed">{comment.message}</p>
                    {comment.code && (
                        <pre className="mt-3 p-3 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 overflow-x-auto text-gray-800 dark:text-gray-200">
                            <code>{comment.code}</code>
                        </pre>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="review-comments bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <MessageSquare size={28} className="text-sky-600 dark:text-sky-400" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review Comments</h2>
                    <span className="px-3 py-1 bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 rounded-full font-bold text-sm">
                        {totalComments} Total
                    </span>
                </div>
            </div>

            {/* Severity Summary Pills */}
            <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">Summary:</span>
                {categorizedComments.critical.length > 0 && (
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full font-semibold text-sm shadow-sm">
                        <AlertTriangle size={16} />
                        <span>{categorizedComments.critical.length} Critical</span>
                    </div>
                )}
                {categorizedComments.important.length > 0 && (
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-full font-semibold text-sm shadow-sm">
                        <AlertTriangle size={16} />
                        <span>{categorizedComments.important.length} Important</span>
                    </div>
                )}
                {categorizedComments.suggestions.length > 0 && (
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 rounded-full font-semibold text-sm shadow-sm">
                        <ThumbsUp size={16} />
                        <span>{categorizedComments.suggestions.length} Suggestions</span>
                    </div>
                )}
            </div>

            {/* AI Review Overview Card */}
            {llmReview?.review && (
                <div className="p-5 border-2 border-sky-200 dark:border-sky-700 rounded-xl bg-sky-50 dark:bg-gray-900/40 shadow-inner">
                    <div className="flex items-center space-x-2 mb-4">
                        <Bot size={24} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
                        <h3 className="text-xl font-bold text-sky-700 dark:text-sky-300">AI Analysis Overview</h3>
                    </div>
                    <div className="text-base">
                        <ReactMarkdown components={markdownComponents}>
                            {llmReview.review}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {/* Critical Comments Section */}
            {categorizedComments.critical.length > 0 && (
                <div className="comment-category space-y-4">
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400 flex items-center space-x-2">
                        <AlertTriangle size={20} className="flex-shrink-0" />
                        <span>Critical Issues ({categorizedComments.critical.length})</span>
                    </h3>
                    <div className="comments-list space-y-4">
                        {categorizedComments.critical.map((comment) => (
                            <CommentCard key={comment.id} comment={comment} />
                        ))}
                    </div>
                </div>
            )}

            {/* Important Comments Section */}
            {categorizedComments.important.length > 0 && (
                <div className="comment-category space-y-4">
                    <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400 flex items-center space-x-2">
                        <AlertTriangle size={20} className="flex-shrink-0" />
                        <span>Important Issues ({categorizedComments.important.length})</span>
                    </h3>
                    <div className="comments-list space-y-4">
                        {categorizedComments.important.map((comment) => (
                            <CommentCard key={comment.id} comment={comment} />
                        ))}
                    </div>
                </div>
            )}

            {/* Suggestions Section */}
            {categorizedComments.suggestions.length > 0 && (
                <div className="comment-category space-y-4">
                    <h3 className="text-xl font-bold text-sky-700 dark:text-sky-400 flex items-center space-x-2">
                        <ThumbsUp size={20} className="flex-shrink-0" />
                        <span>Suggestions ({categorizedComments.suggestions.length})</span>
                    </h3>
                    <div className="comments-list space-y-4">
                        {categorizedComments.suggestions.map((comment) => (
                            <CommentCard key={comment.id} comment={comment} />
                        ))}
                    </div>
                </div>
            )}

            {/* Informational / Best Practices Section */}
            {categorizedComments.info.length > 0 && (
                <div className="comment-category space-y-4">
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-400 flex items-center space-x-2">
                        <Info size={20} className="flex-shrink-0" />
                        <span>Informational/Best Practices ({categorizedComments.info.length})</span>
                    </h3>
                    <div className="comments-list space-y-4">
                        {categorizedComments.info.map((comment) => (
                            <CommentCard key={comment.id} comment={comment} />
                        ))}
                    </div>
                </div>
            )}

            {/* No Comments Success Message */}
            {totalComments === 0 && (
                <div className="no-comments-message p-8 text-center bg-green-50 dark:bg-green-900/30 rounded-xl border-2 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300">
                    <CheckCircle2 size={48} className="mx-auto mb-3" />
                    <h3 className="text-2xl font-bold">Excellent! No issues found.</h3>
                    <p className="text-lg">Your code looks great! Keep up the good work! 🎉</p>
                </div>
            )}
        </div>
    );
}

export default ReviewComments;