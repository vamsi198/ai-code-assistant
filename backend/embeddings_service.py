# backend/embeddings_service.py
import os
import json
import ast
import numpy as np
import faiss
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sentence_transformers import SentenceTransformer
from config import Config


class EmbeddingService:
    """
    Service for generating and managing code embeddings using FAISS
    Supports semantic search and retrieval for RAG
    """
    
    def __init__(self):
        self.config = Config
        self.model = None
        self.index = None
        self.metadata = []
        self.dimension = self.config.EMBEDDING_DIMENSION
        
        # Initialize embedding model
        self._load_embedding_model()
        
        # Load or create FAISS index
        self._load_or_create_index()
        
        # Load metadata
        self._load_metadata()
    
    
    def _load_embedding_model(self):
        """Load sentence-transformers model"""
        try:
            print(f"🔄 Loading embedding model: {self.config.EMBEDDING_MODEL}")
            self.model = SentenceTransformer(self.config.EMBEDDING_MODEL)
            print(f"✅ Embedding model loaded successfully")
        except Exception as e:
            print(f"❌ Error loading embedding model: {e}")
            raise
    
    
    def _load_or_create_index(self):
        """Load existing FAISS index or create new one"""
        index_path = self.config.FAISS_INDEX_FILE
        
        if os.path.exists(index_path):
            try:
                self.index = faiss.read_index(index_path)
                print(f"✅ Loaded existing FAISS index: {self.index.ntotal} embeddings")
            except Exception as e:
                print(f"⚠️  Error loading FAISS index: {e}")
                print("Creating new index...")
                self._create_new_index()
        else:
            self._create_new_index()
    
    
    def _create_new_index(self):
        """Create new FAISS index"""
        # Using L2 distance (Euclidean)
        self.index = faiss.IndexFlatL2(self.dimension)
        print(f"✅ Created new FAISS index with dimension {self.dimension}")
    
    
    def _save_index(self):
        """Save FAISS index to disk"""
        try:
            os.makedirs(self.config.VECTOR_DB_PATH, exist_ok=True)
            faiss.write_index(self.index, self.config.FAISS_INDEX_FILE)
            print(f"✅ FAISS index saved: {self.index.ntotal} embeddings")
        except Exception as e:
            print(f"❌ Error saving FAISS index: {e}")
    
    
    def _load_metadata(self):
        """Load metadata from JSON file"""
        metadata_path = self.config.METADATA_FILE
        
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.metadata = data.get('embeddings', [])
                print(f"✅ Loaded metadata: {len(self.metadata)} entries")
            except Exception as e:
                print(f"⚠️  Error loading metadata: {e}")
                self.metadata = []
        else:
            self.metadata = []
            print("📝 No existing metadata found, starting fresh")
    
    
    def _save_metadata(self):
        """Save metadata to JSON file"""
        try:
            os.makedirs(self.config.VECTOR_DB_PATH, exist_ok=True)
            
            metadata_obj = {
                'embeddings': self.metadata,
                'total_embeddings': len(self.metadata),
                'last_updated': datetime.now().isoformat(),
                'model': self.config.EMBEDDING_MODEL,
                'dimension': self.dimension
            }
            
            with open(self.config.METADATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(metadata_obj, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Metadata saved: {len(self.metadata)} entries")
        except Exception as e:
            print(f"❌ Error saving metadata: {e}")
    
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text snippet
        """
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding
        except Exception as e:
            print(f"❌ Error generating embedding: {e}")
            return np.zeros(self.dimension)
    
    
    def generate_embeddings_batch(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for multiple text snippets (batch)
        """
        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return embeddings
        except Exception as e:
            print(f"❌ Error generating batch embeddings: {e}")
            return np.zeros((len(texts), self.dimension))
    
    
    def process_code_file(self, filepath: str, filename: str) -> Dict[str, Any]:
        """
        Process a code file: extract functions/classes and generate embeddings
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                code_content = f.read()
            
            # Extract code snippets (functions, classes, etc.)
            code_snippets = self._extract_code_snippets(code_content, filepath)
            
            if not code_snippets:
                return {
                    'success': False,
                    'message': 'No code snippets extracted',
                    'embeddings': [],
                    'metadata': []
                }
            
            # Generate embeddings
            texts = [snippet['text'] for snippet in code_snippets]
            embeddings = self.generate_embeddings_batch(texts)
            
            # Add to FAISS index
            embeddings_float32 = embeddings.astype('float32')
            start_index = self.index.ntotal
            self.index.add(embeddings_float32)
            
            # Create metadata entries
            new_metadata = []
            for i, snippet in enumerate(code_snippets):
                metadata_entry = {
                    'index': start_index + i,
                    'filename': filename,
                    'filepath': filepath,
                    'type': snippet['type'],
                    'name': snippet['name'],
                    'code_snippet': snippet['code'],
                    'line_start': snippet['line_start'],
                    'line_end': snippet['line_end'],
                    'text': snippet['text'],
                    'timestamp': datetime.now().isoformat()
                }
                new_metadata.append(metadata_entry)
                self.metadata.append(metadata_entry)
            
            # Save to disk
            self._save_index()
            self._save_metadata()
            
            return {
                'success': True,
                'message': f'Processed {len(code_snippets)} code snippets',
                'embeddings': embeddings.tolist(),
                'metadata': new_metadata,
                'total_embeddings': self.index.ntotal
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'embeddings': [],
                'metadata': []
            }
    
    
    def _extract_code_snippets(self, code: str, filepath: str) -> List[Dict[str, Any]]:
        """
        Extract meaningful code snippets (functions, classes) from code
        """
        snippets = []
        
        # Determine language
        ext = os.path.splitext(filepath)[1]
        
        if ext == '.py':
            snippets = self._extract_python_snippets(code)
        elif ext in ['.js', '.jsx', '.ts', '.tsx']:
            snippets = self._extract_javascript_snippets(code)
        else:
            # For unsupported languages, treat whole file as one snippet
            snippets.append({
                'type': 'file',
                'name': os.path.basename(filepath),
                'code': code,
                'text': f"File: {os.path.basename(filepath)}\n\n{code[:500]}",
                'line_start': 1,
                'line_end': len(code.split('\n'))
            })
        
        return snippets
    
    
    def _extract_python_snippets(self, code: str) -> List[Dict[str, Any]]:
        """Extract snippets from Python code using AST"""
        snippets = []
        
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                # Functions
                if isinstance(node, ast.FunctionDef):
                    func_code = ast.get_source_segment(code, node)
                    docstring = ast.get_docstring(node) or ""
                    
                    text = f"Function: {node.name}\n"
                    if docstring:
                        text += f"Docstring: {docstring}\n"
                    text += f"Code:\n{func_code}"
                    
                    snippets.append({
                        'type': 'function',
                        'name': node.name,
                        'code': func_code,
                        'text': text,
                        'line_start': node.lineno,
                        'line_end': node.end_lineno
                    })
                
                # Classes
                elif isinstance(node, ast.ClassDef):
                    class_code = ast.get_source_segment(code, node)
                    docstring = ast.get_docstring(node) or ""
                    
                    text = f"Class: {node.name}\n"
                    if docstring:
                        text += f"Docstring: {docstring}\n"
                    text += f"Code:\n{class_code}"
                    
                    snippets.append({
                        'type': 'class',
                        'name': node.name,
                        'code': class_code,
                        'text': text,
                        'line_start': node.lineno,
                        'line_end': node.end_lineno
                    })
        
        except Exception as e:
            print(f"⚠️  Error parsing Python code: {e}")
        
        return snippets
    
    
    def _extract_javascript_snippets(self, code: str) -> List[Dict[str, Any]]:
        """Basic extraction for JavaScript (can be improved with JS parser)"""
        snippets = []
        lines = code.split('\n')
        
        # Simple regex-based extraction (basic approach)
        import re
        
        # Find function declarations
        func_pattern = r'function\s+(\w+)\s*\('
        for i, line in enumerate(lines):
            match = re.search(func_pattern, line)
            if match:
                func_name = match.group(1)
                # Get next 10 lines as context
                func_code = '\n'.join(lines[i:min(i+10, len(lines))])
                
                snippets.append({
                    'type': 'function',
                    'name': func_name,
                    'code': func_code,
                    'text': f"Function: {func_name}\nCode:\n{func_code}",
                    'line_start': i + 1,
                    'line_end': min(i + 10, len(lines))
                })
        
        return snippets
    
    
    def search_similar_code(self, query_embedding: np.ndarray, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for similar code snippets using embedding
        """
        if query_embedding is None or self.index.ntotal == 0:
            return []
        
        try:
            # Ensure correct shape and type
            query_embedding = np.array(query_embedding).astype('float32')
            if query_embedding.ndim == 1:
                query_embedding = query_embedding.reshape(1, -1)
            
            # Search FAISS
            k = min(k, self.index.ntotal)
            distances, indices = self.index.search(query_embedding, k)
            
            # Retrieve metadata
            results = []
            for i, idx in enumerate(indices[0]):
                if idx < len(self.metadata):
                    result = self.metadata[idx].copy()
                    result['distance'] = float(distances[0][i])
                    result['similarity'] = 1 / (1 + result['distance'])  # Convert distance to similarity
                    results.append(result)
            
            return results
        
        except Exception as e:
            print(f"❌ Error searching similar code: {e}")
            return []
    
    
    def search_by_text(self, query_text: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for similar code using text query
        """
        query_embedding = self.generate_embedding(query_text)
        return self.search_similar_code(query_embedding, k)
    
    
    def get_total_embeddings(self) -> int:
        """Get total number of embeddings in index"""
        return self.index.ntotal if self.index else 0
    
    
    def clear_index(self):
        """Clear all embeddings (use with caution)"""
        self._create_new_index()
        self.metadata = []
        self._save_index()
        self._save_metadata()
        print("✅ Index and metadata cleared")
    
    
    def get_embedding_by_index(self, index: int) -> Optional[Dict[str, Any]]:
        """Get metadata for a specific embedding index"""
        if 0 <= index < len(self.metadata):
            return self.metadata[index]
        return None
    
    
    def rebuild_index_from_metadata(self):
        """Rebuild FAISS index from existing metadata (recovery function)"""
        if not self.metadata:
            print("⚠️  No metadata to rebuild from")
            return
        
        print(f"🔄 Rebuilding index from {len(self.metadata)} entries...")
        
        # Extract texts and regenerate embeddings
        texts = [entry['text'] for entry in self.metadata]
        embeddings = self.generate_embeddings_batch(texts)
        
        # Create new index and add embeddings
        self._create_new_index()
        embeddings_float32 = embeddings.astype('float32')
        self.index.add(embeddings_float32)
        
        # Save
        self._save_index()
        print(f"✅ Index rebuilt: {self.index.ntotal} embeddings")
