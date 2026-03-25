from pymongo import MongoClient, DESCENDING
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId
from config import Config


# ============================================================================
# Database Connection
# ============================================================================

_client = None
_db = None


def get_db():
    """
    Get MongoDB database connection (singleton pattern)
    """
    global _client, _db
    
    if _db is None:
        try:
            _client = MongoClient(
                Config.MONGO_URI,
                serverSelectionTimeoutMS=5000
            )
            _db = _client[Config.DB_NAME]
            
            # Test connection
            _client.server_info()
            print(f"✅ Connected to MongoDB: {Config.DB_NAME}")
            
            # Create indexes
            _create_indexes(_db)
            
        except Exception as e:
            print(f"❌ MongoDB connection error: {e}")
            raise
    
    return _db


def _create_indexes(db):
    """Create database indexes for better query performance"""
    try:
        # Analyses collection
        db.analyses.create_index([('timestamp', DESCENDING)])
        db.analyses.create_index([('filename', 1)])
        
        # Analysis history collection
        db.analysis_history.create_index([('timestamp', DESCENDING)])
        db.analysis_history.create_index([('filename', 1)])
        
        # Repo analyses collection (NEW)
        db.repo_analyses.create_index([('timestamp', DESCENDING)])
        db.repo_analyses.create_index([('repo_url', 1)])
        
        print("✅ Database indexes created")
    except Exception as e:
        print(f"⚠️  Warning: Error creating indexes: {e}")


def close_db():
    """Close MongoDB connection"""
    global _client
    if _client:
        _client.close()
        print("MongoDB connection closed")


# ============================================================================
# Code Analysis Model
# ============================================================================

class CodeAnalysis:
    """
    Model for code analysis results
    """
    
    @staticmethod
    def create(db, analysis_data: Dict[str, Any]) -> ObjectId:
        """
        Create new code analysis record
        """
        try:
            # Add timestamp if not present
            if 'timestamp' not in analysis_data:
                analysis_data['timestamp'] = datetime.now().isoformat()
            
            # Insert into database
            result = db.analyses.insert_one(analysis_data)
            
            return result.inserted_id
        
        except Exception as e:
            print(f"❌ Error creating analysis: {e}")
            raise
    
    
    @staticmethod
    def get_by_id(db, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Get analysis by ID
        """
        try:
            obj_id = ObjectId(analysis_id)
            result = db.analyses.find_one({'_id': obj_id})
            
            if result:
                result['_id'] = str(result['_id'])
            
            return result
        
        except Exception as e:
            print(f"❌ Error getting analysis: {e}")
            return None
    
    
    @staticmethod
    def get_all(
        db, 
        limit: int = 10, 
        offset: int = 0,
        sort_by: str = 'timestamp',
        order: int = -1
    ) -> List[Dict[str, Any]]:
        """
        Get all analyses with pagination
        """
        try:
            cursor = db.analyses.find().sort(sort_by, order).skip(offset).limit(limit)
            
            results = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                results.append(doc)
            
            return results
        
        except Exception as e:
            print(f"❌ Error getting analyses: {e}")
            return []
    
    
    @staticmethod
    def get_by_filename(
        db, 
        filename: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get analyses by filename
        """
        try:
            cursor = db.analyses.find(
                {'filename': filename}
            ).sort('timestamp', DESCENDING).limit(limit)
            
            results = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                results.append(doc)
            
            return results
        
        except Exception as e:
            print(f"❌ Error getting analyses by filename: {e}")
            return []
    
    
    @staticmethod
    def update(db, analysis_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update analysis record
        """
        try:
            obj_id = ObjectId(analysis_id)
            
            # Add updated timestamp
            update_data['updated_at'] = datetime.now().isoformat()
            
            result = db.analyses.update_one(
                {'_id': obj_id},
                {'$set': update_data}
            )
            
            return result.modified_count > 0
        
        except Exception as e:
            print(f"❌ Error updating analysis: {e}")
            return False
    
    
    @staticmethod
    def delete(db, analysis_id: str) -> bool:
        """
        Delete analysis record
        """
        try:
            obj_id = ObjectId(analysis_id)
            result = db.analyses.delete_one({'_id': obj_id})
            
            return result.deleted_count > 0
        
        except Exception as e:
            print(f"❌ Error deleting analysis: {e}")
            return False
    
    
    @staticmethod
    def count_all(db) -> int:
        """
        Get total count of analyses
        """
        try:
            return db.analyses.count_documents({})
        except Exception as e:
            print(f"❌ Error counting analyses: {e}")
            return 0
    
    
    @staticmethod
    def get_statistics(db) -> Dict[str, Any]:
        """
        Get overall statistics
        """
        try:
            total_analyses = db.analyses.count_documents({})
            
            # Average quality score
            pipeline = [
                {
                    '$group': {
                        '_id': None,
                        'avg_quality': {'$avg': '$summary.quality_score'},
                        'avg_pylint': {'$avg': '$pylint_score'},
                        'total_issues': {'$sum': '$summary.total_issues'}
                    }
                }
            ]
            
            stats = list(db.analyses.aggregate(pipeline))
            
            if stats:
                return {
                    'total_analyses': total_analyses,
                    'average_quality_score': round(stats[0].get('avg_quality', 0), 2),
                    'average_pylint_score': round(stats[0].get('avg_pylint', 0), 2),
                    'total_issues_found': stats[0].get('total_issues', 0)
                }
            else:
                return {
                    'total_analyses': total_analyses,
                    'average_quality_score': 0,
                    'average_pylint_score': 0,
                    'total_issues_found': 0
                }
            
        except Exception as e:
            print(f"❌ Error getting statistics: {e}")
            return {}


# ============================================================================
# Analysis History Model
# ============================================================================

class AnalysisHistory:
    """
    Model for analysis history (lightweight records)
    """
    
    @staticmethod
    def add_entry(db, entry_data: Dict[str, Any]) -> ObjectId:
        """
        Add entry to analysis history
        """
        try:
            if 'timestamp' not in entry_data:
                entry_data['timestamp'] = datetime.now().isoformat()
            
            result = db.analysis_history.insert_one(entry_data)
            
            return result.inserted_id
        
        except Exception as e:
            print(f"❌ Error adding history entry: {e}")
            raise
    
    
    @staticmethod
    def get_all(
        db, 
        limit: int = 10, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get analysis history with pagination
        """
        try:
            cursor = db.analysis_history.find().sort(
                'timestamp', DESCENDING
            ).skip(offset).limit(limit)
            
            results = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                results.append(doc)
            
            return results
        
        except Exception as e:
            print(f"❌ Error getting history: {e}")
            return []
    
    
    @staticmethod
    def get_by_filename(db, filename: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get history entries by filename
        """
        try:
            cursor = db.analysis_history.find(
                {'filename': filename}
            ).sort('timestamp', DESCENDING).limit(limit)
            
            results = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                results.append(doc)
            
            return results
        
        except Exception as e:
            print(f"❌ Error getting history by filename: {e}")
            return []
    
    
    @staticmethod
    def delete_by_analysis_id(db, analysis_id: str) -> bool:
        """
        Delete a history entry based on the analysis_id foreign key.
        """
        try:
            result = db.analysis_history.delete_one({'analysis_id': analysis_id})
            return result.deleted_count > 0
        except Exception as e:
            print(f"❌ Error deleting history entry: {e}")
            return False
    
    
    @staticmethod
    def clear_old_entries(db, days: int = 30) -> int:
        """
        Clear history entries older than specified days
        """
        try:
            cutoff_date = datetime.now()
            cutoff_date = cutoff_date.replace(day=cutoff_date.day - days)
            cutoff_iso = cutoff_date.isoformat()
            
            result = db.analysis_history.delete_many(
                {'timestamp': {'$lt': cutoff_iso}}
            )
            
            print(f"🗑️  Deleted {result.deleted_count} old history entries")
            return result.deleted_count
        
        except Exception as e:
            print(f"❌ Error clearing old entries: {e}")
            return 0


# ============================================================================
# Repository Analysis Model (NEW)
# ============================================================================

class RepoAnalysis:
    """Model for repository-level analysis aggregates"""
        
    @staticmethod
    def create(db, repo_data: Dict[str, Any]) -> ObjectId:
        """Create new repo analysis"""
        if 'timestamp' not in repo_data:
            repo_data['timestamp'] = datetime.now().isoformat()
            
        result = db.repo_analyses.insert_one(repo_data)
        return result.inserted_id

    @staticmethod
    def get_by_id(db, repo_id: str) -> Optional[Dict[str, Any]]:
        """Get repo analysis by ID"""
        try:
            obj_id = ObjectId(repo_id)
            result = db.repo_analyses.find_one({'_id': obj_id})
            if result:
                result['_id'] = str(result['_id'])
            return result
        except Exception as e:
            print(f"❌ Error retrieving repo analysis: {e}")
            return None

    @staticmethod
    def get_all(db, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all repo analyses"""
        try:
            results = list(db.repo_analyses.find()
                          .sort('timestamp', DESCENDING)
                          .skip(offset)
                          .limit(limit))
            for r in results:
                r['_id'] = str(r['_id'])
            return results
        except Exception as e:
            print(f"❌ Error retrieving all repo analyses: {e}")
            return []

    @staticmethod
    def delete(db, repo_id: str) -> bool:
        """Delete repo analysis"""
        try:
            obj_id = ObjectId(repo_id)
            result = db.repo_analyses.delete_one({'_id': obj_id})
            return result.deleted_count > 0
        except Exception as e:
            print(f"❌ Error deleting repo analysis: {e}")
            return False


# ============================================================================
# Embeddings Metadata Model (Optional - for backup)
# ============================================================================

class EmbeddingsMetadata:
    """
    Model for storing embeddings metadata in MongoDB
    Optional backup to vector_db/metadata.json
    """
    
    @staticmethod
    def save_metadata(db, metadata: Dict[str, Any]) -> ObjectId:
        """
        Save embeddings metadata
        """
        try:
            metadata['timestamp'] = datetime.now().isoformat()
            result = db.embeddings_metadata.insert_one(metadata)
            
            return result.inserted_id
        
        except Exception as e:
            print(f"❌ Error saving embeddings metadata: {e}")
            raise
    
    
    @staticmethod
    def get_latest(db) -> Optional[Dict[str, Any]]:
        """
        Get latest embeddings metadata
        """
        try:
            result = db.embeddings_metadata.find_one(
                sort=[('timestamp', DESCENDING)]
            )
            
            if result:
                result['_id'] = str(result['_id'])
            
            return result
        
        except Exception as e:
            print(f"❌ Error getting embeddings metadata: {e}")
            return None


# ============================================================================
# User Model (Optional - for future authentication)
# ============================================================================

class User:
    """
    Model for user management (optional feature)
    """
    
    @staticmethod
    def create(db, user_data: Dict[str, Any]) -> ObjectId:
        """
        Create new user
        """
        try:
            user_data['created_at'] = datetime.now().isoformat()
            result = db.users.insert_one(user_data)
            
            return result.inserted_id
        
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            raise
    
    
    @staticmethod
    def get_by_email(db, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email
        """
        try:
            result = db.users.find_one({'email': email})
            
            if result:
                result['_id'] = str(result['_id'])
            
            return result
        
        except Exception as e:
            print(f"❌ Error getting user: {e}")
            return None
    
    
    @staticmethod
    def update_last_login(db, user_id: str) -> bool:
        """
        Update user's last login timestamp
        """
        try:
            obj_id = ObjectId(user_id)
            
            result = db.users.update_one(
                {'_id': obj_id},
                {'$set': {'last_login': datetime.now().isoformat()}}
            )
            
            return result.modified_count > 0
        
        except Exception as e:
            print(f"❌ Error updating last login: {e}")
            return False


# ============================================================================
# Helper Functions
# ============================================================================

def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert MongoDB document to JSON-serializable format
    """
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


def init_database():
    """
    Initialize database and create collections/indexes
    """
    try:
        db = get_db()
        
        # Create collections if they don't exist
        collections = db.list_collection_names()
        
        required_collections = [
            'analyses',
            'analysis_history',
            'repo_analyses', # <-- Include new collection
            'embeddings_metadata'
        ]
        
        for collection in required_collections:
            if collection not in collections:
                db.create_collection(collection)
                print(f"✅ Created collection: {collection}")
        
        print("✅ Database initialized successfully")
        return True
    
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False