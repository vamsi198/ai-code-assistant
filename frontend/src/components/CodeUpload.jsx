import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Github, AlertCircle, CheckCircle, FileText, Loader2, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';

// --- Helper component for a modern button with loading state ---
const ActionButton = ({ onClick, disabled, loading, children, variant = 'primary', icon: Icon, className = '' }) => {
    const baseStyle = 'flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold text-lg transition duration-200 shadow-md focus:outline-none focus:ring-4';
    let variantStyle = '';

    if (variant === 'primary') {
        variantStyle = 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500/50';
    } else if (variant === 'secondary') {
        variantStyle = 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500/50';
    }

    const disabledStyle = 'disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyle} ${variantStyle} ${disabledStyle} ${className}`}
        >
            {loading ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>{children}...</span>
                </>
            ) : (
                <>
                    {Icon && <Icon size={20} />}
                    <span>{children}</span>
                </>
            )}
        </button>
    );
};

function CodeUpload() {
    const [file, setFile] = useState(null);
    const [githubUrl, setGithubUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isCloning, setIsCloning] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [cloneProgress, setCloneProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const navigate = useNavigate();

    // Simulate progress while uploading/analyzing file
    useEffect(() => {
        let interval;
        if (isUploading) {
            setUploadProgress(10);
            interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev < 70) return prev + 5;
                    if (prev < 95) return prev + 1;
                    return 95;
                });
            }, 500);
        } else {
            clearInterval(interval);
            setUploadProgress(0);
        }
        return () => clearInterval(interval);
    }, [isUploading]);

    // Simulate progress while cloning/analyzing repo
    useEffect(() => {
        let interval;
        if (isCloning) {
            setCloneProgress(10);
            interval = setInterval(() => {
                setCloneProgress(prev => {
                    if (prev < 50) return prev + 3;
                    if (prev < 85) return prev + 1;
                    return 85;
                });
            }, 750);
        } else {
            clearInterval(interval);
            setCloneProgress(0);
        }
        return () => clearInterval(interval);
    }, [isCloning]);

    const handleFocus = () => {
        setMessage('');
        setMessageType('');
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.py')) {
                setMessage('Please select a Python (.py) file');
                setMessageType('error');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setMessage('');
        }
    };

    const handleUploadAndAnalyze = async () => {
        if (!file) {
            setMessage('Please select a file');
            setMessageType('error');
            return;
        }

        try {
            setIsUploading(true);
            setMessage('Uploading file...');
            setMessageType('');

            const uploadResponse = await apiService.uploadFile(file);
            setUploadProgress(75);

            setMessage('Analyzing code...');

            const analyzeResponse = await apiService.analyzeCode(uploadResponse.filename);

            setUploadProgress(100);

            navigate(`/results/${analyzeResponse.analysis_id}`);

        } catch (error) {
            console.error('Upload/Analysis error:', error);
            setMessage(error.response?.data?.error || error.message || 'Upload failed');
            setMessageType('error');
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const handleGitHubClone = async () => {
        if (!githubUrl.trim()) {
            setMessage('Please enter a GitHub URL');
            setMessageType('error');
            return;
        }

        if (!githubUrl.includes('github.com')) {
            setMessage('Please enter a valid GitHub URL');
            setMessageType('error');
            return;
        }

        try {
            setIsCloning(true);
            setMessage('Cloning repository... This may take a moment.');
            setMessageType('');

            const result = await apiService.analyzeRepository(githubUrl);
            setCloneProgress(100);

            if (result.success) {
                const fileCount = result.aggregate?.total_files || 0;
                setMessage(`✅ Repository analyzed successfully! Found ${fileCount} Python file${fileCount !== 1 ? 's' : ''}`);
                setMessageType('success');

                setGithubUrl('');

                navigate(`/repo-results/${result.repo_analysis_id}`);

            } else {
                setMessage(`❌ Analysis failed: ${result.error || 'Unknown error'}`);
                setMessageType('error');
            }

        } catch (error) {
            console.error('Analysis error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Analysis failed';
            setMessage(`❌ ${errorMsg}`);
            setMessageType('error');
            setCloneProgress(0);
        } finally {
            setIsCloning(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && githubUrl.trim() && !isCloning) {
            handleGitHubClone();
        }
    };

    const renderUploadProgressBar = () => (
        <div className="w-full mt-4">
            <div className="flex justify-between mb-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                <span>File Processing...</span>
                <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                    className="bg-sky-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                ></div>
            </div>
        </div>
    );

    const renderCloneProgressBar = () => (
        <div className="w-full mt-4">
            <div className="flex justify-between mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                <span>Cloning & Analyzing Repository...</span>
                <span>{cloneProgress}%</span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2.5 dark:bg-gray-700">
                <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-750"
                    style={{ width: `${cloneProgress}%` }}
                ></div>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-10 text-center">
                Start Your Code Analysis
            </h1>

            {/* Main Grid for Two Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* File Upload Card */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-t-4 border-sky-600 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-4 mb-4">
                            <Upload size={30} className="text-sky-600" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Single File Upload</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Upload a single Python (`.py`) file for quick, AI-powered code analysis.
                        </p>

                        {/* Custom File Input Area */}
                        <label
                            htmlFor="file-input"
                            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition duration-300 mb-6
                                ${file ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-sky-500 dark:border-gray-600 dark:hover:border-sky-500'}`
                            }
                            onFocus={handleFocus}
                        >
                            <input
                                id="file-input"
                                type="file"
                                onChange={handleFileChange}
                                accept=".py"
                                className="hidden"
                            />
                            {file ? (
                                <div className="flex items-center space-x-3 text-green-700 dark:text-green-400">
                                    <FileText size={24} />
                                    <span className="font-medium truncate max-w-xs">{file.name}</span>
                                    <span className="text-sm text-green-600 dark:text-green-500 ml-2">
                                        ({(file.size / 1024).toFixed(2)} KB)
                                    </span>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                    <Upload size={36} className="mx-auto mb-2 text-sky-500" />
                                    <p className="font-medium">Click to upload or drag & drop</p>
                                    <p className="text-sm mt-1">Python files only (.py)</p>
                                </div>
                            )}
                        </label>
                    </div>

                    <ActionButton
                        onClick={handleUploadAndAnalyze}
                        disabled={!file || isCloning || isUploading}
                        loading={isUploading}
                        variant="primary"
                        icon={ArrowRight}
                        className="w-full mt-4"
                    >
                        {isUploading ? 'Analyzing' : 'Analyze File'}
                    </ActionButton>

                    {isUploading && renderUploadProgressBar()}
                </div>

                {/* ⭐ GitHub Clone Card - WARNING MOVED BEFORE INPUT */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-t-4 border-gray-700 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-4 mb-4">
                            <Github size={30} className="text-gray-700 dark:text-white" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clone GitHub Repository</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Analyze an entire GitHub repository
                        </p>

                        {/* ⭐ WARNING - NOW BEFORE INPUT FIELD */}
                        <div className="flex items-start space-x-2 text-sm text-yellow-700 dark:text-yellow-400 mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                            <p>
                                Only <strong>public</strong> repositories are supported. Cloning may take up to a few minutes for large projects.
                            </p>
                        </div>

                        {/* Input Field */}
                        <div className="relative" onFocus={handleFocus}>
                            <Github size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="https://github.com/org/repo-name"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isCloning || isUploading}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-sky-500 focus:ring-sky-500 bg-gray-50 dark:bg-gray-700 dark:text-white text-gray-900 placeholder-gray-500 disabled:opacity-70"
                            />
                        </div>
                    </div>

                    <ActionButton
                        onClick={handleGitHubClone}
                        disabled={!githubUrl.trim() || isUploading || isCloning}
                        loading={isCloning}
                        variant="secondary"
                        icon={Github}
                        className="w-full mt-8"
                    >
                        {isCloning ? 'Cloning' : 'Clone & Analyze'}
                    </ActionButton>

                    {isCloning && renderCloneProgressBar()}
                </div>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`mt-8 p-4 rounded-xl flex items-center space-x-3 transition-all duration-300 shadow-lg ${messageType === 'error'
                        ? 'bg-red-100 text-red-800 border-l-4 border-red-500 dark:bg-red-900/30 dark:text-red-300'
                        : messageType === 'success'
                            ? 'bg-green-100 text-green-800 border-l-4 border-green-500 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-sky-100 text-sky-800 border-l-4 border-sky-500 dark:bg-sky-900/30 dark:text-sky-300'
                    }`}>
                    {messageType === 'error' && <AlertCircle size={20} className="flex-shrink-0" />}
                    {messageType === 'success' && <CheckCircle size={20} className="flex-shrink-0" />}
                    {messageType === '' && <Loader2 size={20} className="animate-spin flex-shrink-0" />}
                    <span className="font-medium">{message}</span>
                </div>
            )}
        </div>
    );
}

export default CodeUpload;
