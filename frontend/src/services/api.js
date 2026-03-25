import axios from 'axios';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format error message for display.
 * @param {import('axios').AxiosError | Error} error - Error object
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (error) => {
    if (axios.isAxiosError(error)) {
        if (error.response) {
            // Server responded with error (4xx or 5xx)
            return error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
        } else if (error.request) {
            // Request made but no response (network error)
            return 'Network error: Unable to reach the server. Please check your connection.';
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            // ⭐ IMPROVED: Better timeout detection and message
            return 'Request timed out. The repository may be too large. Please try a smaller repository or check your network connection.';
        }
    }
    // Other errors (e.g., code execution error)
    return error.message || 'An unexpected error occurred';
};

/**
 * Retry a function with exponential backoff.
 * @param {() => Promise<any>} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} delay - Initial delay in ms
 * @returns {Promise<any>} Function result
 */
export const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) {
                console.error(`❌ All retry attempts failed. Final error: ${formatErrorMessage(error)}`);
                throw error;
            }

            // Don't retry on definitive client errors (4xx)
            if (axios.isAxiosError(error) && error.response?.status >= 400 && error.response?.status < 500) {
                console.error(`❌ Client error (${error.response.status}). Retrying stopped.`);
                throw error;
            }

            const waitTime = delay * Math.pow(2, i);
            console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }
};

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** @type {import('axios').AxiosInstance} */
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 90000, // 90 seconds default
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for logging
axiosInstance.interceptors.request.use(
    (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', formatErrorMessage(error));
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.config.url}`, response.status);
        return response;
    },
    (error) => {
        // Log the formatted error for better developer readability
        console.error(`❌ API Request Failed: ${formatErrorMessage(error)}`);
        return Promise.reject(error);
    }
);

// ============================================================================
// API Service
// ============================================================================

export const apiService = {
    // ============================================================================
    // File Upload & Analysis
    // ============================================================================

    /**
     * Upload a Python file
     * @param {File} file - Python file to upload
     * @returns {Promise<{filename: string}>} Upload response with filename
     */
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        // ⭐ FIXED: Use axiosInstance instead of axios
        const response = await axiosInstance.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 60000, // 60 seconds for file upload
        });

        return response.data;
    },

    /**
     * Analyze uploaded code
     * @param {string} filename - Filename to analyze
     * @returns {Promise<{analysis_id: string, message: string}>} Analysis results
     */
    analyzeCode: async (filename) => {
        const response = await axiosInstance.post('/analyze', { filename });
        return response.data;
    },

    /**
     * Upload and analyze in one step
     * @param {File} file - Python file
     * @returns {Promise<{analysis_id: string, message: string}>} Analysis results
     */
    uploadAndAnalyze: async (file) => {
        const uploadResult = await apiService.uploadFile(file);
        const analysisResult = await apiService.analyzeCode(uploadResult.filename);
        return analysisResult;
    },

    // ============================================================================
    // Results & History
    // ============================================================================

    /**
     * Get analysis results by ID
     * @param {string} analysisId - Analysis ID
     * @returns {Promise<object>} Complete analysis results
     */
    getResults: async (analysisId) => {
        const response = await axiosInstance.get(`/results/${analysisId}`);
        return response.data;
    },

    /**
     * Get analysis history
     * @param {number} [limit=10] - Number of results to fetch
     * @param {number} [offset=0] - Offset for pagination
     * @returns {Promise<{history: Array<object>, total: number}>} History data
     */
    getHistory: async (limit = 10, offset = 0) => {
        const response = await axiosInstance.get(`/history?limit=${limit}&offset=${offset}`);
        return response.data;
    },

    /**
     * Delete an analysis
     * @param {string} analysisId - Analysis ID to delete
     * @returns {Promise<object>} Delete confirmation
     */
    deleteAnalysis: async (analysisId) => {
        const response = await axiosInstance.delete(`/results/${analysisId}`);
        return response.data;
    },

    // ============================================================================
    // Statistics
    // ============================================================================

    /**
     * Get overall statistics
     * @returns {Promise<object>} Statistics data
     */
    getStatistics: async () => {
        const response = await axiosInstance.get('/stats');
        return response.data;
    },

    // ============================================================================
    // Documentation
    // ============================================================================

    /**
     * Get documentation for analysis
     * @param {string} analysisId - Analysis ID
     * @returns {Promise<object>} Documentation data
     */
    getDocumentation: async (analysisId) => {
        const response = await axiosInstance.get(`/documentation/${analysisId}`);
        return response.data;
    },

    // ============================================================================
    // Search
    // ============================================================================

    /**
     * Search similar code using vector search
     * @param {string} query - Search query
     * @param {number} [k=5] - Number of results
     * @returns {Promise<Array<object>>} Search results
     */
    searchSimilarCode: async (query, k = 5) => {
        const response = await axiosInstance.post('/search', { query, k });
        return response.data;
    },

    // ============================================================================
    // GitHub Integration (⭐ UPDATED WITH LONGER TIMEOUTS)
    // ============================================================================

    /**
     * Clone a GitHub repository (clone only, no analysis)
     * @param {string} repoUrl - GitHub repository URL
     * @returns {Promise<object>} Clone results with file list
     */
    cloneRepository: async (repoUrl) => {
        const response = await axiosInstance.post(
            '/github/clone',
            { repo_url: repoUrl },
            { timeout: 300000 } // ⭐ 5 minutes for cloning
        );
        return response.data;
    },

    /**
     * Clone and analyze a GitHub repository (recommended for full analysis)
     * @param {string} repoUrl - GitHub repository URL
     * @returns {Promise<{success: boolean, repo_analysis_id: string, aggregate: object}>} Analysis results
     */
    analyzeRepository: async (repoUrl) => {
        const response = await axiosInstance.post(
            '/github/analyze',
            { repo_url: repoUrl },
            { timeout: 1000000 }  
        );
        return response.data;
    },

    /**
     * Get repository analysis results by ID
     * @param {string} repoId - Repository analysis ID
     * @returns {Promise<object>} Complete repository analysis data
     */
    getRepoResults: async (repoId) => {
        const response = await axiosInstance.get(`/repo-results/${repoId}`);
        return response.data;
    },

    /**
     * Get repository analysis history
     * @param {number} [limit=10] - Number of results 
     * @param {number} [offset=0] - Offset for pagination 
     * @returns {Promise<{history: Array<object>}>} Repo history data 
     */
    getRepoHistory: async (limit = 10, offset = 0) => {
        const response = await axiosInstance.get(`/repo-history?limit=${limit}&offset=${offset}`);
        return response.data;
    },

    /**
     * Delete repository analysis
     * @param {string} repoId - Repository analysis ID
     * @returns {Promise<object>} Delete confirmation
     */
    deleteRepoAnalysis: async (repoId) => {
        const response = await axiosInstance.delete(`/repo-results/${repoId}`);
        return response.data;
    },

    /**
     * Get files changed in a PR
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {number} prNumber - Pull request number
     * @returns {Promise<Array<object>>} PR files data
     */
    getPRFiles: async (owner, repo, prNumber) => {
        const response = await axiosInstance.get(
            `/github/pr/files?owner=${owner}&repo=${repo}&pr=${prNumber}`
        );
        return response.data;
    },

    /**
     * Post comment on PR
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {number} prNumber - Pull request number
     * @param {string} comment - Comment text
     * @returns {Promise<object>} Post result
     */
    postPRComment: async (owner, repo, prNumber, comment) => {
        const response = await axiosInstance.post('/github/pr/comment', {
            owner,
            repo,
            pr_number: prNumber,
            comment,
        });
        return response.data;
    },

    // ============================================================================
    // Health Check
    // ============================================================================

    /**
     * Check backend health
     * @returns {Promise<object>} Health status
     */
    healthCheck: async () => {
        const response = await axiosInstance.get('/');
        return response.data;
    },

    /**
     * Test backend connection
     * @returns {Promise<boolean>} Connection status
     */
    testConnection: async () => {
        try {
            await apiService.healthCheck();
            return true;
        } catch (error) {
            return false;
        }
    },

    // Exporting the utility functions here to make them accessible via apiService.
    retryWithBackoff,
    formatErrorMessage,
};

// ============================================================================
// Export default for convenience
// ============================================================================

export default apiService;

// Log API initialization
console.log('✅ API Service initialized');
console.log(`🔗 Backend URL: ${API_BASE_URL}`);

// Test connection on load (optional, runs in background)
apiService.testConnection().then((isConnected) => {
    if (isConnected) {
        console.log('✅ Backend connection successful');
    } else {
        console.warn('⚠️ Backend connection failed - some features may not work');
    }
});
