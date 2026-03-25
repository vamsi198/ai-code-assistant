import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """
    Configuration class for AI Code Assistant
    Loads all settings from environment variables with fallback defaults
    """
    
    # ============================================================================
    # Flask Configuration
    # ============================================================================
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # ============================================================================
    # MongoDB Configuration
    # ============================================================================
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    DB_NAME = os.getenv('DB_NAME', 'ai_code_assistant')
    
    # Collections
    ANALYSES_COLLECTION = 'analyses'
    HISTORY_COLLECTION = 'analysis_history'
    EMBEDDINGS_METADATA_COLLECTION = 'embeddings_metadata'
    
    # ============================================================================
    # LLM Provider Configuration
    # ============================================================================
    # Options: 'openai', 'gemini', or 'openrouter'
    LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'gemini')
    
    # ============================================================================
    # OpenAI Configuration
    # ============================================================================
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
    OPENAI_TEMPERATURE = float(os.getenv('OPENAI_TEMPERATURE', '0.3'))
    OPENAI_MAX_TOKENS = int(os.getenv('OPENAI_MAX_TOKENS', '2000'))
    
    # ============================================================================
    # Google Gemini Configuration
    # ============================================================================
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash') # Default to a fast, powerful model
    
    # ============================================================================
    # OpenRouter Configuration (NEW)
    # ============================================================================
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
    OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct')
    OPENROUTER_BASE_URL = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')
    
    # ============================================================================
    # File Upload Configuration
    # ============================================================================
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
    MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 10 * 1024 * 1024)) 
    ALLOWED_EXTENSIONS = {
        'py', 
        'js', 
        'jsx', 
        'ts', 
        'tsx', 
        'java', 
        'cpp',
        'c', 
        'h',  
        'cs', 
        'php', 
        'rb', 
        'go', 
        'rs', 
        'swift', 
        'kt', 
    }
    
    # ============================================================================
    # FAISS & Embeddings Configuration
    # ============================================================================
    VECTOR_DB_PATH = os.getenv('VECTOR_DB_PATH', './vector_db')
    FAISS_INDEX_FILE = os.path.join(VECTOR_DB_PATH, 'faiss_index.bin')
    METADATA_FILE = os.path.join(VECTOR_DB_PATH, 'metadata.json')
    
    # Embedding model from sentence-transformers
    EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
    EMBEDDING_DIMENSION = int(os.getenv('EMBEDDING_DIMENSION', '384'))
    
    # ============================================================================
    # Code Analysis Configuration
    # ============================================================================
    # Pylint settings
    PYLINT_RCFILE = os.getenv('PYLINT_RCFILE', None) 
    PYLINT_THRESHOLD = float(os.getenv('PYLINT_THRESHOLD', '7.0'))
    
    # Flake8 settings
    FLAKE8_MAX_LINE_LENGTH = int(os.getenv('FLAKE8_MAX_LINE_LENGTH', '88'))
    FLAKE8_IGNORE = os.getenv('FLAKE8_IGNORE', 'E501,W503').split(',')
    
    # Complexity thresholds
    MAX_COMPLEXITY = int(os.getenv('MAX_COMPLEXITY', '10'))
    MAX_FUNCTION_LENGTH = int(os.getenv('MAX_FUNCTION_LENGTH', '50'))
    
    # ============================================================================
    # GitHub/GitLab Integration (Optional)
    # ============================================================================
    GITHUB_TOKEN = os.getenv('GITHUB_TOKEN', '')
    GITLAB_TOKEN = os.getenv('GITLAB_TOKEN', '')
    ENABLE_GIT_INTEGRATION = os.getenv('ENABLE_GIT_INTEGRATION', 'False').lower() == 'true'
    
    # ============================================================================
    # RAG (Retrieval-Augmented Generation) Configuration
    # ============================================================================
    RAG_TOP_K = int(os.getenv('RAG_TOP_K', '5')) 
    RAG_SIMILARITY_THRESHOLD = float(os.getenv('RAG_SIMILARITY_THRESHOLD', '0.7'))
    
    # ============================================================================
    # Documentation Generation Configuration
    # ============================================================================
    DOC_FORMAT = os.getenv('DOC_FORMAT', 'markdown')
    INCLUDE_EXAMPLES = os.getenv('INCLUDE_EXAMPLES', 'True').lower() == 'true'
    
    # ============================================================================
    # Cleanup & Maintenance Configuration
    # ============================================================================
    CLEANUP_UPLOADS_AFTER_HOURS = int(os.getenv('CLEANUP_UPLOADS_AFTER_HOURS', '24'))
    MAX_ANALYSIS_HISTORY = int(os.getenv('MAX_ANALYSIS_HISTORY', '100'))
    
    # ============================================================================
    # Logging Configuration
    # ============================================================================
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'app.log')
    
    # ============================================================================
    # CORS Configuration
    # ============================================================================
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # ============================================================================
    # Rate Limiting (Optional)
    # ============================================================================
    ENABLE_RATE_LIMITING = os.getenv('ENABLE_RATE_LIMITING', 'False').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', '60'))
    
    
    @staticmethod
    def validate():
        """
        Validate critical configuration values
        Raises ValueError if required configs are missing
        """
        errors = []
        
        # Check API key based on selected provider
        if Config.LLM_PROVIDER == 'openai' and not Config.OPENAI_API_KEY:
            errors.append("OPENAI_API_KEY is required when LLM_PROVIDER is 'openai'")
        if Config.LLM_PROVIDER == 'gemini' and not Config.GEMINI_API_KEY:
             errors.append("GEMINI_API_KEY is required when LLM_PROVIDER is 'gemini'")
        if Config.LLM_PROVIDER == 'openrouter' and not Config.OPENROUTER_API_KEY:
             errors.append("OPENROUTER_API_KEY is required when LLM_PROVIDER is 'openrouter'")
        
        if not Config.MONGO_URI:
            errors.append("MONGO_URI is required")
        
        if not os.path.exists(Config.UPLOAD_FOLDER):
            try:
                os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create UPLOAD_FOLDER: {e}")
        
        if not os.path.exists(Config.VECTOR_DB_PATH):
            try:
                os.makedirs(Config.VECTOR_DB_PATH, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create VECTOR_DB_PATH: {e}")
        
        if errors:
            raise ValueError("Configuration errors:\n" + "\n".join(errors))
        
        return True
    
    
    @staticmethod
    def print_config():
        """Print configuration summary (for debugging)"""
        print("\n" + "="*60)
        print("AI CODE ASSISTANT - CONFIGURATION")
        print("="*60)
        print(f"Debug Mode: {Config.DEBUG}")
        print(f"LLM Provider: {Config.LLM_PROVIDER}")
        
        if Config.LLM_PROVIDER == 'gemini':
            print(f"Gemini Model: {Config.GEMINI_MODEL}")
        elif Config.LLM_PROVIDER == 'openai':
             print(f"OpenAI Model: {Config.OPENAI_MODEL}")
        elif Config.LLM_PROVIDER == 'openrouter':
            print(f"OpenRouter Model: {Config.OPENROUTER_MODEL}")
            print(f"OpenRouter Base URL: {Config.OPENROUTER_BASE_URL}")

        print(f"MongoDB URI: {Config.MONGO_URI}")
        print(f"Database: {Config.DB_NAME}")
        print(f"Upload Folder: {Config.UPLOAD_FOLDER}")
        print(f"Vector DB Path: {Config.VECTOR_DB_PATH}")
        print(f"Embedding Model: {Config.EMBEDDING_MODEL}")
        print(f"Git Integration: {'Enabled' if Config.ENABLE_GIT_INTEGRATION else 'Disabled'}")
        print("="*60 + "\n")


# Validate configuration on import
try:
    Config.validate()
    if Config.DEBUG:
        Config.print_config()
except ValueError as e:
    print(f"⚠️  Configuration Error: {e}")
    print("Please check your .env file and ensure all required variables are set.")