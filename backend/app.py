from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from bson import ObjectId
import traceback # Used for detailed error logging
import ast # Import for robust syntax validation
import re # Import regex for enhanced sanitization
from typing import List, Dict, Any # <-- ADDED TYPING IMPORTS
from concurrent.futures import ThreadPoolExecutor # <--- Parallel Processing Executor

# Import our custom modules
from config import Config
from models import get_db, CodeAnalysis, AnalysisHistory, RepoAnalysis # <-- IMPORTED RepoAnalysis
from code_analyzer import analyze_code_file, calculate_metrics
from embeddings_service import EmbeddingService
from llm_service import LLMService 
from doc_generator import generate_documentation
from utils import allowed_file, cleanup_old_uploads, generate_unique_filename
from github_integration import GitHubIntegration, clone_and_analyze_repo

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize services
embedding_service = EmbeddingService()
llm_service = LLMService()
github_integration = GitHubIntegration()

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['VECTOR_DB_PATH'], exist_ok=True)


# ============================================================================
# HELPER FUNCTIONS (CORE LOGIC)
# ============================================================================

def sanitize_llm_code(text: str) -> str:
    """
    Cleans up LLM output for Python code.
    Only removes markdown fences and selectively strips leading error/explanation
    prefixes if they precede valid code. Preserves indentation.
    """
    # 1. Remove markdown code fences globally
    text = re.sub(r'```python\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'```\s*$', '', text)
    
    lines = text.strip().splitlines()
    
    # Check if first line is an obvious error/note/explanation message
    if lines:
        first_line = lines[0].strip()
        
        if first_line.lower().startswith(('error:', 'note:', 'warning:', 'explanation:')):
            
            # Try to find where actual code starts (import, def, class, etc.)
            for i, line in enumerate(lines):
                stripped = line.strip()
                
                if stripped and (
                    stripped.startswith(('import ', 'from ', 'def ', 'class ', '@')) or
                    (stripped.startswith('#') and not stripped.lower().startswith(('#error', '#note', '#warning', '#explanation'))) or
                    (i > 0 and lines[i-1].strip() == '')
                ):
                    # Found code start, return from this line onward, preserving indentation
                    return '\n'.join(lines[i:]).strip()
            
            return text.strip()

    return text.strip()


def analyze_batch_internal(files: List[str]) -> Dict[str, Any]:
    """
    Enhanced batch analysis with DETAILED per-file results including LLM review.
    """
    results = []
    total_score = 0
    total_issues = 0
    db = get_db()
    
    for filepath in files:
        filename = os.path.basename(filepath)
        print(f"🔍 Analyzing {filename}...")

        try:
            # Read code content (needed for LLM input)
            with open(filepath, 'r', encoding='utf-8') as f:
                code_content = f.read()

            # ⚡ PARALLEL ANALYSIS FOR EACH FILE
            with ThreadPoolExecutor(max_workers=4) as executor: 
                # Submit initial tasks (Static, Metrics, Embeddings)
                future_static = executor.submit(analyze_code_file, filepath)
                future_metrics = executor.submit(calculate_metrics, filepath)
                future_embeddings = executor.submit(embedding_service.process_code_file, filepath, filename)
                
                # Wait for static analysis result (needed for LLM review context)
                analysis_result = future_static.result()

                # ⭐ NEW: Add LLM review in parallel (after dependencies are ready)
                try:
                    embeddings_result = future_embeddings.result()
                    
                    # Get RAG context
                    if embeddings_result['embeddings']:
                        relevant_context = embedding_service.search_similar_code(
                            embeddings_result['embeddings'][0],
                            k=3
                        )
                    else:
                        relevant_context = []
                    
                    # Submit LLM review
                    future_llm_review = executor.submit(
                        llm_service.generate_code_review,
                        code_content=code_content,
                        static_analysis=analysis_result,
                        relevant_context=relevant_context
                    )
                    
                    # Wait for all remaining results
                    llm_review = future_llm_review.result()
                    metrics = future_metrics.result()
                    
                except Exception as e:
                    print(f"⚠️ LLM review failed for {filename}: {e}")
                    llm_review = {
                        'review': 'LLM review unavailable',
                        'suggestions': [],
                        'security_concerns': []
                    }
                    metrics = future_metrics.result()
                    embeddings_result = {'embeddings': [], 'metadata': []}

            # Calculate scores
            total_issues_count = len(analysis_result.get('issues', []))
            pylint_score = analysis_result.get('pylint_score', 0)

            quality_score = min(100, int(
                (pylint_score / 10 * 70) +
                (max(0, 100 - total_issues_count * 5) * 0.3)
            ))

            if quality_score >= 90: quality_grade = 'A'
            elif quality_score >= 80: quality_grade = 'B'
            elif quality_score >= 70: quality_grade = 'C'
            elif quality_score >= 60: quality_grade = 'D'
            else: quality_grade = 'F'

            # ⭐ STORE FULL DETAILS (including LLM review)
            results.append({
                'filename': filename,
                'quality_score': quality_score,
                'quality_grade': quality_grade,
                'issues_count': total_issues_count,
                'total_lines': analysis_result.get('ast_analysis', {}).get('total_lines', 0),

                'static_analysis': analysis_result,
                'metrics': metrics,
                'llm_review': llm_review,
                'summary': {
                    'quality_score': quality_score,
                    'quality_grade': quality_grade,
                    'pylint_score': pylint_score,
                    'total_issues': total_issues_count,
                    'total_functions': len(analysis_result.get('ast_analysis', {}).get('functions', [])),
                    'total_classes': len(analysis_result.get('ast_analysis', {}).get('classes', [])),
                    'total_lines': analysis_result.get('ast_analysis', {}).get('total_lines', 0),
                },
                'embedding_info': {
                    'total_embeddings': len(embeddings_result['embeddings']),
                    'functions_analyzed': len(embeddings_result['metadata'])
                }
            })

            total_score += quality_score
            total_issues += total_issues_count

        except Exception as e:
            print(f"❌ Error analyzing {filename}: {e}")
            results.append({
                'filename': filename,
                'quality_score': 0,
                'issues_count': 0,
                'error': str(e),
                'total_lines': 0
            })

    # Calculate aggregate stats
    aggregate = {
        'total_files': len(results),
        'average_quality': total_score / len(results) if results else 0,
        'total_issues': total_issues,
        'total_lines': sum(r.get('total_lines', 0) for r in results),
        'files_with_errors': sum(1 for r in results if 'error' in r),
        'quality_distribution': {
            'excellent': sum(1 for r in results if r.get('quality_score', 0) >= 90),
            'good': sum(1 for r in results if 70 <= r.get('quality_score', 0) < 90),
            'fair': sum(1 for r in results if 50 <= r.get('quality_score', 0) < 70),
            'poor': sum(1 for r in results if r.get('quality_score', 0) < 50),
        },
        'files': results
    }
    
    return aggregate


def store_repo_analysis(repo_analysis_data: Dict[str, Any]) -> ObjectId:
    """Store repository-level analysis using the RepoAnalysis model."""
    db = get_db()
    
    # Use the RepoAnalysis model's create method
    repo_analysis_data['timestamp'] = datetime.now().isoformat()
    return RepoAnalysis.create(db, repo_analysis_data)


# ============================================================================
# ROUTES
# ============================================================================

@app.route('/api/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'service': 'AI Code Assistant',
        'version': '1.0.0'
    })


@app.route('/api/upload', methods=['POST'])
def upload_code():
    """Upload code file for analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, app.config['ALLOWED_EXTENSIONS']):
            return jsonify({
                'error': f'File type not allowed. Allowed: {", ".join(app.config["ALLOWED_EXTENSIONS"])}'
            }), 400
        
        original_filename = secure_filename(file.filename)
        unique_filename = generate_unique_filename(original_filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': unique_filename,
            'original_filename': original_filename,
            'filepath': filepath
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Analyze uploaded code file with PARALLEL PROCESSING for speed"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'error': 'Filename required'}), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        print(f"🔍 Analyzing file: {filename}")
        
        # Read code content once
        with open(filepath, 'r', encoding='utf-8') as f:
            code_content = f.read()

        # ⚡⚡⚡ PARALLEL PROCESSING START ⚡⚡⚡
        print("⚡ Starting PARALLEL analysis...")

        with ThreadPoolExecutor(max_workers=4) as executor:
            # Task 1: Static Analysis (Required first)
            future_static = executor.submit(analyze_code_file, filepath)
            
            # Wait for static analysis to complete first (needed for RAG context, Docs, and LLM Review)
            analysis_result = future_static.result()

            # Task 2: Calculate Metrics (Runs parallel to Embeddings)
            future_metrics = executor.submit(calculate_metrics, filepath)
            
            # Task 3: Embeddings (Time consuming - runs parallel)
            future_embeddings = executor.submit(embedding_service.process_code_file, filepath, filename)
            
            # Process sequential dependencies after static analysis results are available
            try:
                # Get embeddings result
                embeddings_result = future_embeddings.result()
                
                # Search for similar code for RAG context (depends on embeddings)
                if embeddings_result['embeddings']:
                    relevant_context = embedding_service.search_similar_code(
                        embeddings_result['embeddings'][0],
                        k=3
                    )
                else:
                    relevant_context = []
                
                # Task 4, 5, 6: LLM Calls (Heavy lifting - runs parallel)
                future_llm_review = executor.submit(
                    llm_service.generate_code_review,
                    code_content=code_content,
                    static_analysis=analysis_result,
                    relevant_context=relevant_context
                )
                
                future_updated_code = executor.submit(
                    llm_service.get_updated_code,
                    code_content=code_content,
                    prompt=(
                        "You are a Python code refactoring assistant. "
                        "Rewrite the following Python code with improved readability, style, and best practices. "
                        "Return ONLY the complete, valid Python code. "
                        "Do NOT include explanations, markdown formatting, error messages, or any text other than code. "
                        "If you cannot refactor the code, return the code unchanged."
                    )
                )
                
                # Task 7: Documentation Generation (Depends on static analysis)
                future_documentation = executor.submit(generate_documentation, filepath, analysis_result)
                
                # Wait for all parallel results
                llm_review = future_llm_review.result()
                updated_code_raw = future_updated_code.result()
                documentation = future_documentation.result()
                metrics = future_metrics.result() # Wait for metrics too
            
            except Exception as e:
                print(f"⚠️ LLM processing failed: {e}")
                llm_review = {
                    'review': 'LLM review unavailable',
                    'suggestions': [],
                    'security_concerns': []
                }
                updated_code_raw = code_content
                documentation = {}
                metrics = future_metrics.result()
            
            print("✅ Parallel analysis complete!")
        # ⚡⚡⚡ PARALLEL PROCESSING END ⚡⚡⚡

        # Process updated code with validation
        updated_code_text = ""
        refactoring_successful = False
        
        config_keywords = ['config', 'settings', '.env', 'secret', 'key', 'credential', 'password', '__init__']
        skip_refactoring = any(keyword in filename.lower() for keyword in config_keywords)
        
        if skip_refactoring:
            print(f"⚠️ Skipping code refactoring for {filename} (likely a configuration file)")
            updated_code_text = code_content
        else:
            updated_code_text = sanitize_llm_code(updated_code_raw)
            stripped = updated_code_text.strip()
            
            if not stripped:
                print("⚠️ LLM returned empty output. Using original code.")
                updated_code_text = code_content
            else:
                try:
                    ast.parse(stripped)
                    print("✅ Updated code validated as proper Python syntax.")
                    refactoring_successful = True
                except SyntaxError:
                    print("⚠️ Updated code is not valid Python. Using original code as fallback.")
                    updated_code_text = code_content
        
        # Calculate summary scores (unchanged logic)
        total_issues = len(analysis_result.get('issues', []))
        pylint_score = analysis_result.get('pylint_score', 0)
        
        quality_score = min(100, int(
            (pylint_score / 10 * 70) +
            (max(0, 100 - total_issues * 5) * 0.3)
        ))
        
        if quality_score >= 90:
            quality_grade = 'A'
        elif quality_score >= 80:
            quality_grade = 'B'
        elif quality_score >= 70:
            quality_grade = 'C'
        elif quality_score >= 60:
            quality_grade = 'D'
        else:
            quality_grade = 'F'
        
        summary = {
            'quality_score': quality_score,
            'quality_grade': quality_grade,
            'pylint_score': pylint_score,
            'total_issues': total_issues,
            'total_functions': len(analysis_result.get('ast_analysis', {}).get('functions', [])),
            'total_classes': len(analysis_result.get('ast_analysis', {}).get('classes', [])),
            'total_lines': analysis_result.get('ast_analysis', {}).get('total_lines', 0),
            'has_docstring': bool(analysis_result.get('ast_analysis', {}).get('docstring')),
            'pylint_passed': pylint_score >= app.config['PYLINT_THRESHOLD'],
            'flake8_passed': analysis_result.get('flake8_passed', False)
        }
        
        complete_analysis = {
            'filename': filename,
            'timestamp': datetime.now().isoformat(),
            'static_analysis': analysis_result,
            'metrics': metrics,
            'llm_review': llm_review,
            'documentation': documentation,
            'summary': summary,
            'pylint_score': pylint_score,
            'updated_code': updated_code_text,
            'refactoring_successful': refactoring_successful,
            'embedding_info': {
                'total_embeddings': len(embeddings_result['embeddings']),
                'functions_analyzed': len(embeddings_result['metadata'])
            }
        }
        
        # Save to MongoDB
        db = get_db()
        analysis_id = CodeAnalysis.create(db, complete_analysis)
        
        # Add to history
        AnalysisHistory.add_entry(db, {
            'analysis_id': str(analysis_id),
            'filename': filename,
            'timestamp': datetime.now().isoformat(),
            'summary': summary
        })
        
        print(f"✅ Analysis complete. ID: {analysis_id}")
        
        # Cleanup old uploads
        cleanup_old_uploads(app.config['UPLOAD_FOLDER'], hours=24)
        
        return jsonify({
            'analysis_id': str(analysis_id),
            'message': 'Analysis completed successfully',
            'summary': summary
        }), 200
        
    except Exception as e:
        print(f"❌ Error in analyze: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/results/<analysis_id>', methods=['GET'])
def get_results(analysis_id):
    """Get analysis results by ID. Now includes updated_code and refactoring_successful."""
    try:
        db = get_db()
        result = CodeAnalysis.get_by_id(db, analysis_id)
        
        if not result:
            return jsonify({'error': 'Analysis not found'}), 404
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/results/<analysis_id>', methods=['DELETE'])
def delete_result(analysis_id):
    """Delete an analysis by ID, the associated file, and the history record."""
    try:
        db = get_db()
        result = CodeAnalysis.get_by_id(db, analysis_id)
        if not result:
            return jsonify({'error': 'Analysis not found'}), 404

        # 1. Delete physical file
        filename = result.get("filename")
        if filename:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as e:
                    print(f"Warning: Could not delete file {filepath}: {e}")

        # 2. Delete main analysis record
        success = CodeAnalysis.delete(db, analysis_id)
        if not success:
            # Note: File deletion may have succeeded, but DB failed. Log warning.
            print(f"Warning: Failed to delete main analysis record for ID {analysis_id}")
            return jsonify({'error': 'DB delete failed (main analysis)'}), 500

        # 3. Delete history entry (FIX FOR HISTORY REAPPEARING)
        history_deleted = AnalysisHistory.delete_by_analysis_id(db, analysis_id)
        if not history_deleted:
            print(f"Warning: Could not delete history entry for analysis {analysis_id}")
            # Note: We still return success here, as the critical analysis record is gone.

        return jsonify({
            'success': True,
            'message': 'Analysis and file deleted successfully'
        }), 200

    except Exception as e:
        print(f"❌ Error in delete_result: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# --- BATCH ANALYSIS ROUTE ---
@app.route('/api/analyze-batch', methods=['POST'])
def analyze_batch():
    """Analyze multiple files and aggregate results"""
    try:
        data = request.get_json()
        files = data.get('files', [])  # List of file paths

        if not files:
            return jsonify({'error': 'No files provided'}), 400

        # Uses the improved internal helper function
        aggregate = analyze_batch_internal(files) 

        return jsonify(aggregate), 200
    
    except Exception as e:
        print(f"❌ Error in analyze-batch: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# --- REPO RESULTS ROUTE (NEW GETTER) ---
@app.route('/api/repo-results/<repo_id>', methods=['GET'])
def get_repo_results(repo_id):
    """Get repository analysis results by ID"""
    try:
        db = get_db()
        # Using the RepoAnalysis model to fetch data
        result = RepoAnalysis.get_by_id(db, repo_id) 

        if not result:
            return jsonify({'error': 'Repository analysis not found'}), 404

        return jsonify(result), 200
    
    except Exception as e:
        print(f"❌ Error retrieving repo results: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/repo-results/<repo_id>', methods=['DELETE'])
def delete_repo_analysis(repo_id):
    """Delete repository analysis"""
    try:
        db = get_db()
        
        # Delete from repo_analyses collection
        success = RepoAnalysis.delete(db, repo_id)
        
        if success:
            print(f"✅ Deleted repository analysis: {repo_id}")
            return jsonify({
                'success': True,
                'message': 'Repository analysis deleted successfully'
            }), 200
        else:
            print(f"⚠️ Repository analysis not found: {repo_id}")
            return jsonify({
                'success': False,
                'error': 'Repository analysis not found'
            }), 404
    
    except Exception as e:
        print(f"❌ Error deleting repo analysis: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """Get analysis history"""
    try:
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        
        db = get_db()
        history = AnalysisHistory.get_all(db, limit=limit, offset=offset)
        
        return jsonify({
            'history': history,
            'limit': limit,
            'offset': offset
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/documentation/<analysis_id>', methods=['GET'])
def get_documentation(analysis_id):
    """Get generated documentation"""
    try:
        db = get_db()
        result = CodeAnalysis.get_by_id(db, analysis_id)
        
        if not result:
            return jsonify({'error': 'Analysis not found'}), 404
        
        documentation = result.get('documentation', {})
        
        return jsonify(documentation), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/search', methods=['POST'])
def search_similar_code():
    """Search for similar code using embeddings"""
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'Query required'}), 400
        
        k = data.get('k', 5)
        
        # Generate embedding for query text
        # Note: If embedding service uses an LLM for query, this would be different
        # Assuming model.encode is the correct method for the current EmbeddingService setup
        query_embedding = embedding_service.model.encode([query])[0] 
        
        # Search
        results = embedding_service.search_similar_code(query_embedding, k=k)
        
        return jsonify({
            'query': query,
            'results': results
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get overall statistics"""
    try:
        db = get_db()
        stats = CodeAnalysis.get_statistics(db)
        
        # Add embedding count
        stats['total_embeddings'] = embedding_service.get_total_embeddings()
        
        return jsonify(stats), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/repo-history', methods=['GET'])
def get_repo_history():
    """Get repository analysis history"""
    try:
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        
        db = get_db()
        history = RepoAnalysis.get_all(db, limit=limit, offset=offset)
        
        return jsonify({
            'history': history,
            'limit': limit,
            'offset': offset
        }), 200
    
    except Exception as e:
        print(f"❌ Error getting repo history: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# GITHUB INTEGRATION ROUTES
# ============================================================================

# Original github/clone route kept for compatibility, though usually replaced by analyze route:
@app.route('/api/github/clone', methods=['POST'])
def clone_github_repository():
    """Clones repository only (kept separate from analyze_github_repo for utility)"""
    try:
        data = request.get_json()
        repo_url = data.get('repo_url')
        
        if not repo_url:
            return jsonify({'error': 'Repository URL required'}), 400
        
        if not app.config['ENABLE_GIT_INTEGRATION']:
            return jsonify({'error': 'Git integration is disabled. Set ENABLE_GIT_INTEGRATION=True in .env'}), 403

        print(f"🔄 Cloning repository: {repo_url}")

        clone_result = github_integration.clone_repository(repo_url)

        if not clone_result.get('success'):
            return jsonify(clone_result), 400

        return jsonify({
            'success': True,
            'message': 'Repository cloned successfully',
            'repo_url': repo_url,
            'total_files': clone_result.get('total_files', 0),
            'files_found': clone_result.get('total_files', 0),
            'clone_path': clone_result.get('clone_path', ''),
            'branch': clone_result.get('branch', 'main'),
            'files': [f.replace('\\', '/').split('/')[-1] for f in clone_result.get('files', [])[:10]] 
        }), 200

    except Exception as e:
        print(f"❌ Error cloning repo: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# --- GITHUB REPO ANALYSIS ROUTE (CLEANUP DISABLED) ---
@app.route('/api/github/analyze', methods=['POST'])
def analyze_github_repo():
    """Clone repo and analyze all Python files, returning an aggregated report."""
    
    try:
        data = request.get_json()
        repo_url = data.get('repo_url')

        if not repo_url:
            return jsonify({'error': 'Repository URL required'}), 400
        
        if not app.config['ENABLE_GIT_INTEGRATION']:
            return jsonify({'error': 'Git integration is disabled'}), 403

        print(f"🔄 Cloning repository for batch analysis: {repo_url}")

        # ⭐ Clone repository with max_files limit (50 files)
        # clone_path is implicitly available here, but not tracked/used for cleanup
        clone_result = github_integration.clone_repository(repo_url, max_files=50) 

        if not clone_result.get('success'):
            return jsonify(clone_result), 400

        # Find all relevant files (full paths returned by clone_repository)
        python_files = clone_result.get('files', [])

        if not python_files:
            return jsonify({'success': False, 'error': 'No supported files found in repository.'}), 400

        print(f"📊 Analyzing {len(python_files)} Python files...")

        # Batch analyze all found Python files
        batch_result = analyze_batch_internal(python_files)

        # Store repo-level analysis aggregate
        repo_analysis_id = store_repo_analysis({
            'repo_url': repo_url,
            'aggregate': batch_result,
            'timestamp': datetime.now().isoformat()
        })

        return jsonify({
            'success': True,
            'repo_analysis_id': str(repo_analysis_id),
            'aggregate': batch_result
        }), 200

    except Exception as e:
        print(f"❌ Error analyzing GitHub repo: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/github/pr/comment', methods=['POST'])
def post_pr_comment():
    """
    Post analysis comment on GitHub PR
    ... (rest of the route remains unchanged)
    """
    try:
        data = request.get_json()

        repo_owner = data.get('repo_owner')
        repo_name = data.get('repo_name')
        pr_number = data.get('pr_number')
        analysis_id = data.get('analysis_id')

        if not all([repo_owner, repo_name, pr_number, analysis_id]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Get analysis results
        db = get_db()
        analysis = CodeAnalysis.get_by_id(db, analysis_id)

        if not analysis:
            return jsonify({'error': 'Analysis not found'}), 404

        # Format as comment
        comment_body = github_integration.format_analysis_as_comment(analysis)

        # Post comment
        result = github_integration.post_pr_comment(
            repo_owner=repo_owner,
            repo_name=repo_name,
            pr_number=pr_number,
            comment_body=comment_body,
            platform='github'
        )

        return jsonify(result), 200 if result.get('success') else 400

    except Exception as e:
        print(f"❌ Error posting PR comment: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/github/pr/files', methods=['GET'])
def get_pr_files():
    """
    Get files changed in a PR
    ... (rest of the route remains unchanged)
    """
    try:
        repo_owner = request.args.get('owner')
        repo_name = request.args.get('repo')
        pr_number = request.args.get('pr')

        if not all([repo_owner, repo_name, pr_number]):
            return jsonify({'error': 'Missing required parameters'}), 400

        result = github_integration.get_pr_files(
            repo_owner=repo_owner,
            repo_name=repo_name,
            pr_number=int(pr_number),
            platform='github'
        )

        return jsonify(result), 200 if result.get('success') else 400

    except Exception as e:
        print(f"❌ Error getting PR files: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/github/webhook/setup', methods=['POST'])
def setup_github_webhook():
    """
    Setup GitHub webhook for automated PR analysis
    ... (rest of the route remains unchanged)
    """
    try:
        data = request.get_json()

        repo_owner = data.get('repo_owner')
        repo_name = data.get('repo_name')
        webhook_url = data.get('webhook_url')
        events = data.get('events', ['pull_request'])

        if not all([repo_owner, repo_name, webhook_url]):
            return jsonify({'error': 'Missing required fields'}), 400

        result = github_integration.setup_webhook(
            repo_owner=repo_owner,
            repo_name=repo_name,
            webhook_url=webhook_url,
            events=events,
            platform='github'
        )

        return jsonify(result), 200 if result.get('success') else 400

    except Exception as e:
        print(f"❌ Error setting up webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/github/webhook', methods=['POST'])
def github_webhook_handler():
    """
    Handle GitHub webhook events
    ... (rest of the route remains unchanged)
    """
    try:
        # Get GitHub event type
        event_type = request.headers.get('X-GitHub-Event')

        if event_type != 'pull_request':
            return jsonify({'message': 'Event ignored'}), 200

        data = request.get_json()

        # Extract PR info
        pr = data.get('pull_request', {})
        action = data.get('action')

        # Only analyze on opened or synchronize (new commits)
        if action not in ['opened', 'synchronize']:
            return jsonify({'message': 'Action ignored'}), 200

        repo_owner = data['repository']['owner']['login']
        repo_name = data['repository']['name']
        pr_number = pr['number']
        
        print(f"📥 Webhook: PR #{pr_number} in {repo_owner}/{repo_name} (Action: {action})")

        # Get changed files
        files_result = github_integration.get_pr_files(
            repo_owner=repo_owner,
            repo_name=repo_name,
            pr_number=pr_number,
            platform='github'
        )

        if not files_result.get('success'):
            return jsonify(files_result), 400

        # Filter Python files
        python_files = [
            f for f in files_result.get('files', [])
            if f['filename'].endswith('.py')
        ]

        if not python_files:
            # Post a comment saying no Python files found
            comment = f"## 🤖 AI Code Review\n\nNo Python files found in this PR."
            github_integration.post_pr_comment(
                repo_owner=repo_owner,
                repo_name=repo_name,
                pr_number=pr_number,
                comment_body=comment,
                platform='github'
            )
            return jsonify({'message': 'No Python files in PR'}), 200

        print(f"📄 Found {len(python_files)} Python files to analyze")

        # Simple acknowledgment (real implementation would be async)
        # For production, use Celery/background tasks
        
        # Post initial comment
        initial_comment = f"""## 🤖 AI Code Review In Progress
Analyzing {len(python_files)} Python file(s):
{chr(10).join([f'- `{f["filename"]}`' for f in python_files[:5]])}
Analysis will be posted shortly..."""
        github_integration.post_pr_comment(
            repo_owner=repo_owner,
            repo_name=repo_name,
            pr_number=pr_number,
            comment_body=initial_comment,
            platform='github'
        )

        return jsonify({
            'message': 'Webhook processed',
            'pr_number': pr_number,
            'python_files_found': len(python_files),
            'status': 'Analysis queued'
        }), 200

    except Exception as e:
        print(f"❌ Webhook error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("🚀 Starting AI Code Assistant Backend...")
    print(f"📁 Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"🗄️ Vector DB path: {app.config['VECTOR_DB_PATH']}")
    print(f"🌐 Server running on http://localhost:5000")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )