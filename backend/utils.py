# backend/utils.py
import os
import shutil
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Set, Optional, List
from werkzeug.utils import secure_filename
from config import Config


# ============================================================================
# File Upload Utilities
# ============================================================================

def allowed_file(filename: str, allowed_extensions: Set[str] = None) -> bool:
    """
    Check if file extension is allowed
    """
    if allowed_extensions is None:
        allowed_extensions = Config.ALLOWED_EXTENSIONS
    
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def generate_unique_filename(original_filename: str) -> str:
    """
    Generate unique filename with timestamp and UUID
    """
    # Secure the filename
    safe_filename = secure_filename(original_filename)
    
    # Split name and extension
    name, ext = os.path.splitext(safe_filename)
    
    # Generate unique identifier
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    
    # Create unique filename
    unique_filename = f"{name}_{timestamp}_{unique_id}{ext}"
    
    return unique_filename


def get_file_hash(filepath: str) -> str:
    """
    Calculate MD5 hash of file
    """
    try:
        hash_md5 = hashlib.md5()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        print(f"❌ Error calculating file hash: {e}")
        return ""


def get_file_size(filepath: str) -> int:
    """
    Get file size in bytes
    """
    try:
        return os.path.getsize(filepath)
    except Exception as e:
        print(f"❌ Error getting file size: {e}")
        return 0


def validate_file_size(filepath: str, max_size: int = None) -> bool:
    """
    Validate file size
    """
    if max_size is None:
        max_size = Config.MAX_FILE_SIZE
    
    file_size = get_file_size(filepath)
    return file_size <= max_size


# ============================================================================
# Directory Management
# ============================================================================

def cleanup_old_uploads(upload_folder: str, hours: int = 24) -> int:
    """
    Clean up uploaded files older than specified hours
    """
    if not os.path.exists(upload_folder):
        return 0
    
    try:
        deleted_count = 0
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        for filename in os.listdir(upload_folder):
            filepath = os.path.join(upload_folder, filename)
            
            # Skip directories and .gitkeep
            if os.path.isdir(filepath) or filename == '.gitkeep':
                continue
            
            # Check file modification time
            file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            
            if file_mtime < cutoff_time:
                try:
                    os.remove(filepath)
                    deleted_count += 1
                except Exception as e:
                    print(f"⚠️  Error deleting {filepath}: {e}")
        
        if deleted_count > 0:
            print(f"🗑️  Cleaned up {deleted_count} old upload(s)")
        
        return deleted_count
    
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        return 0


def ensure_directory_exists(directory: str) -> bool:
    """
    Ensure directory exists, create if not
    """
    try:
        os.makedirs(directory, exist_ok=True)
        return True
    except Exception as e:
        print(f"❌ Error creating directory {directory}: {e}")
        return False


def delete_directory(directory: str) -> bool:
    """
    Delete directory and all contents
    """
    try:
        if os.path.exists(directory):
            shutil.rmtree(directory)
            return True
        return False
    except Exception as e:
        print(f"❌ Error deleting directory {directory}: {e}")
        return False


def get_directory_size(directory: str) -> int:
    """
    Get total size of directory in bytes
    """
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(directory):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                if os.path.exists(filepath):
                    total_size += os.path.getsize(filepath)
        return total_size
    except Exception as e:
        print(f"❌ Error calculating directory size: {e}")
        return 0


# ============================================================================
# File Operations
# ============================================================================

def read_file_content(filepath: str, encoding: str = 'utf-8') -> Optional[str]:
    """
    Safely read file content
    """
    try:
        with open(filepath, 'r', encoding=encoding) as f:
            return f.read()
    except UnicodeDecodeError:
        # Try with different encoding
        try:
            with open(filepath, 'r', encoding='latin-1') as f:
                return f.read()
        except Exception as e:
            print(f"❌ Error reading file with alternate encoding: {e}")
            return None
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return None


def write_file_content(filepath: str, content: str, encoding: str = 'utf-8') -> bool:
    """
    Safely write content to file
    """
    try:
        with open(filepath, 'w', encoding=encoding) as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"❌ Error writing file: {e}")
        return False


def copy_file(src: str, dst: str) -> bool:
    """
    Copy file from source to destination
    """
    try:
        shutil.copy2(src, dst)
        return True
    except Exception as e:
        print(f"❌ Error copying file: {e}")
        return False


def get_file_extension(filename: str) -> str:
    """
    Get file extension (without dot)
    """
    _, ext = os.path.splitext(filename)
    return ext.lstrip('.')


def get_files_in_directory(
    directory: str, 
    extensions: Optional[List[str]] = None,
    recursive: bool = False
) -> List[str]:
    """
    Get all files in directory, optionally filtered by extension
    """
    files = []
    
    try:
        if recursive:
            for root, dirs, filenames in os.walk(directory):
                # Skip common directories
                dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'venv', 'env', 'node_modules']]
                
                for filename in filenames:
                    filepath = os.path.join(root, filename)
                    if extensions is None or get_file_extension(filename) in extensions:
                        files.append(filepath)
        else:
            for filename in os.listdir(directory):
                filepath = os.path.join(directory, filename)
                if os.path.isfile(filepath):
                    if extensions is None or get_file_extension(filename) in extensions:
                        files.append(filepath)
        
        return files
    
    except Exception as e:
        print(f"❌ Error listing files: {e}")
        return []


# ============================================================================
# Data Formatting Utilities
# ============================================================================

def format_bytes(bytes_size: int) -> str:
    """
    Format bytes to human-readable format
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f} PB"


def format_timestamp(iso_timestamp: str) -> str:
    """
    Format ISO timestamp to readable format
    """
    try:
        dt = datetime.fromisoformat(iso_timestamp)
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except Exception as e:
        return iso_timestamp


def truncate_text(text: str, max_length: int = 100, suffix: str = '...') -> str:
    """
    Truncate text to max length
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename by removing/replacing invalid characters
    """
    # Remove invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    
    # Remove leading/trailing spaces and dots
    filename = filename.strip('. ')
    
    return filename


# ============================================================================
# Validation Utilities
# ============================================================================

def is_valid_code_file(filepath: str) -> bool:
    """
    Check if file is a valid code file
    """
    if not os.path.exists(filepath):
        return False
    
    if not os.path.isfile(filepath):
        return False
    
    # Check extension
    if not allowed_file(os.path.basename(filepath)):
        return False
    
    # Check size
    if not validate_file_size(filepath):
        return False
    
    return True


def is_text_file(filepath: str) -> bool:
    """
    Check if file is a text file (not binary)
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(512)  # Try reading first 512 bytes
        return True
    except UnicodeDecodeError:
        return False
    except Exception:
        return False


# ============================================================================
# Error Handling Utilities
# ============================================================================

def safe_execute(func, *args, default=None, **kwargs):
    """
    Safely execute function and return default on error
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        print(f"⚠️  Error executing {func.__name__}: {e}")
        return default


# ============================================================================
# Performance Utilities
# ============================================================================

def measure_execution_time(func):
    """
    Decorator to measure function execution time
    """
    def wrapper(*args, **kwargs):
        start_time = datetime.now()
        result = func(*args, **kwargs)
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"⏱️  {func.__name__} executed in {duration:.2f} seconds")
        return result
    return wrapper


# ============================================================================
# String Utilities
# ============================================================================

def extract_code_language(filename: str) -> str:
    """
    Extract programming language from filename
    """
    language_map = {
        'py': 'python',
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin'
    }
    
    ext = get_file_extension(filename)
    return language_map.get(ext, 'unknown')


def count_lines_of_code(code: str) -> dict:
    """
    Count different types of lines in code
    """
    lines = code.split('\n')
    
    total_lines = len(lines)
    blank_lines = sum(1 for line in lines if not line.strip())
    comment_lines = sum(1 for line in lines if line.strip().startswith('#'))
    code_lines = total_lines - blank_lines - comment_lines
    
    return {
        'total': total_lines,
        'code': code_lines,
        'comments': comment_lines,
        'blank': blank_lines
    }


# ============================================================================
# Configuration Utilities
# ============================================================================

def get_config_summary() -> dict:
    """
    Get summary of current configuration
    """
    return {
        'upload_folder': Config.UPLOAD_FOLDER,
        'vector_db_path': Config.VECTOR_DB_PATH,
        'max_file_size': format_bytes(Config.MAX_FILE_SIZE),
        'allowed_extensions': list(Config.ALLOWED_EXTENSIONS),
        'openai_model': Config.OPENAI_MODEL,
        'embedding_model': Config.EMBEDDING_MODEL,
        'debug_mode': Config.DEBUG
    }


# ============================================================================
# Logging Utilities
# ============================================================================

def log_info(message: str):
    """Log info message"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] ℹ️  {message}")


def log_success(message: str):
    """Log success message"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] ✅ {message}")


def log_warning(message: str):
    """Log warning message"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] ⚠️  {message}")


def log_error(message: str):
    """Log error message"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] ❌ {message}")
