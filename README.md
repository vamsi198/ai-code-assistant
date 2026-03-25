# AI Code Assistant - LLM-Powered Code Analyzer

## Overview
This project is an AI-powered code analysis tool that uses Large Language Models (LLM),
RAG (Retrieval-Augmented Generation), and static analysis tools to review, refactor,
and document Python code automatically.

- **Single File Analysis**: Upload a Python file and receive a structured code review
- **Repository Analysis**: Clone a GitHub/GitLab repository and analyze all Python files
- **AI-Powered Review**: LLM-generated suggestions, security concerns, and refactoring
- **Documentation Generation**: Auto-generated docstrings and Markdown documentation

---

## What's Included

### Core Features:
- LLM Integration: OpenRouter API with DeepSeek, Llama, and GPT models
- RAG Pipeline: Embedding-based retrieval for contextual code suggestions
- Static Analysis: Pylint, Flake8, and Radon for code quality metrics
- FAISS Vector Search: Semantic similarity search over codebase embeddings
- GitHub Integration: Automated PR comments and webhook support
- Parallel Processing: ThreadPoolExecutor for fast multi-file analysis
- Responsive UI: React/Vite frontend with modern dark theme

### Backend (Flask/Python)
- Endpoints: /api/upload, /api/analyze, /api/github/analyze, /api/history
- Features:
  - AST-based code parsing and metrics calculation
  - Cyclomatic complexity and maintainability index scoring
  - Quality scoring (0-100) with grade (A-F)
  - MongoDB storage for analysis history
  - FAISS vector database for embeddings
  - Shallow clone optimization (--depth 1) for fast repository cloning

### Frontend (React/Vite)
- Pages: Dashboard, File Analysis, Repository Analysis, History, Documentation
- Features:
  - File upload with drag-and-drop
  - Real-time analysis results
  - Code diff viewer (original vs refactored)
  - Quality score visualization
  - Analysis history with delete support

### GitHub Integration
- Endpoints: /api/github/clone, /api/github/analyze, /api/github/pr/comment
- Features:
  - Repository cloning from GitHub and GitLab
  - PR file retrieval and comment posting
  - Webhook setup and handler
  - Support for public repositories

---

## API Keys Used

| API Key          | Purpose                          | Where to Get                                        | Cost                  |
|------------------|----------------------------------|-----------------------------------------------------|-----------------------|
| OpenRouter API   | LLM code review & refactoring    | https://openrouter.ai/                              | Free tier available   |
| GitHub Token     | Repository cloning & PR comments | https://github.com/settings/tokens                  | Free                  |
| GitLab Token     | GitLab repository support        | https://gitlab.com/profile/personal_access_tokens   | Free                  |
| MongoDB URI      | Database for analysis storage    | https://mongodb.com/cloud/atlas                     | Free tier available   |

---

## Tech Stack

**Backend:**
- Python 3.10+
- Flask (REST API)
- MongoDB + PyMongo (Database)
- FAISS (Vector Search)
- Sentence-Transformers (Embeddings)
- Pylint, Flake8, Radon (Static Analysis)
- OpenRouter API (LLM)
- GitPython + Subprocess (Git Integration)

**Frontend:**
- React 18
- Vite
- Axios
- React Router DOM
- Monaco Editor (Code Viewer)

---

## File Structure

```
ai-code-assistant/
├── backend/
│   ├── app.py                  # Main Flask application
│   ├── config.py               # Configuration & environment variables
│   ├── models.py               # MongoDB models
│   ├── code_analyzer.py        # AST parsing & static analysis
│   ├── embeddings_service.py   # FAISS embeddings & search
│   ├── llm_service.py          # OpenRouter LLM integration
│   ├── doc_generator.py        # Documentation generation
│   ├── github_integration.py   # GitHub/GitLab API integration
│   ├── utils.py                # Helper utilities
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── api.js              # API service layer
│   │   └── App.jsx             # Main React app
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Setup Instructions (From ZIP File)

### Step 1: Extract ZIP
```
Extract the ZIP file to your desired location
Example: C:/Projects/ai-code-assistant/
```

### Step 2: Get Required API Keys

#### OpenRouter API Key (Required - for LLM)
1. Visit https://openrouter.ai/
2. Click "Sign Up" (top right)
3. Verify your email
4. Go to https://openrouter.ai/keys
5. Click "Create Key"
6. Name it "AI Code Assistant"
7. Copy the key (starts with sk-or-v1-...)
8. Add $1-5 credits (very affordable, ~1000 analyses per $1)

#### GitHub Token (Optional - for GitHub integration)
1. Visit https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "AI Code Assistant"
4. Select scopes: repo, read:org
5. Click "Generate token"
6. Copy the token (starts with ghp_...)

#### GitLab Token (Optional - for GitLab integration)
1. Visit https://gitlab.com/-/profile/personal_access_tokens
2. Name: "AI Code Assistant"
3. Select scopes: api, read_repository
4. Click "Create personal access token"
5. Copy the token

#### MongoDB URI (Required - for database)
1. Visit https://mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up and create a free cluster (M0 - Free Forever)
4. Click "Connect" -> "Connect your application"
5. Copy the connection string
6. Replace <password> with your actual password
7. Example: MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname

### Step 3: Setup Backend
```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Create .env File
Create a file named .env inside the backend/ folder with the following content:

```
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
DB_NAME=ai_code_assistant

# Optional (for GitHub integration)
GITHUB_TOKEN=ghp_your-token-here
GITLAB_TOKEN=glpat_your-token-here
ENABLE_GIT_INTEGRATION=True

# Settings
UPLOAD_FOLDER=uploads
VECTOR_DB_PATH=vector_db
PYLINT_THRESHOLD=7.0
MAX_FILE_SIZE_MB=10
```

### Step 5: Run Backend
```bash
# Make sure virtual environment is activated
cd backend
python app.py

# You should see:
# Starting AI Code Assistant Backend...
# Server running on http://localhost:5000
```

### Step 6: Setup and Run Frontend
```bash
# Open a NEW terminal
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# You should see:
# VITE v4.x.x  ready in xxx ms
# Local: http://localhost:5173/
```

### Step 7: Open the Application
```
Open your browser and visit:
http://localhost:5173
```

---

## Quick Checklist

- [ ] ZIP file extracted
- [ ] OpenRouter API key obtained
- [ ] MongoDB URI obtained
- [ ] .env file created with all keys
- [ ] Virtual environment created and activated
- [ ] pip install -r requirements.txt completed
- [ ] Backend running on http://localhost:5000
- [ ] npm install completed in frontend folder
- [ ] Frontend running on http://localhost:5173
- [ ] Application opened in browser

---

## Usage

### Single File Analysis
1. Click "Upload File" on the dashboard
2. Select any Python (.py) file
3. Click "Analyze"
4. View quality score, issues, and AI suggestions

### Repository Analysis
1. Click "Analyze Repository"
2. Paste a GitHub/GitLab repository URL
   Example: https://github.com/username/repo
3. Click "Analyze Repository"
4. View aggregate results for all Python files

### View History
1. Click "History" in the navigation
2. View all previous analyses
3. Click any entry to view full results

---

## External Dependencies

All versions use the following:
- OpenRouter API (LLM provider - DeepSeek, Llama, GPT models)
- Sentence-Transformers (all-MiniLM-L6-v2 model - auto-downloaded on first run)
- FAISS (vector database - stored locally)
- MongoDB Atlas (cloud database - free tier)
- Google Fonts (Inter - loaded via CDN)
- Font Awesome (icons - loaded via CDN)

---

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Troubleshooting

| Problem                        | Solution                                                        |
|--------------------------------|-----------------------------------------------------------------|
| ModuleNotFoundError            | Run pip install -r requirements.txt again                       |
| MongoDB connection failed      | Check your MONGODB_URI in .env file                             |
| OpenRouter API error           | Verify your API key and check credits at openrouter.ai          |
| Port 5000 already in use       | Kill the process or change port in app.py                       |
| npm install failed             | Delete node_modules/ folder and run npm install again           |
| Git clone timeout              | Repository too large; try a smaller repository                  |
| FAISS index error              | Delete vector_db/ folder and restart backend                    |

---

## Notes

- First run will auto-download the Sentence-Transformers model (~90MB)
- FAISS index is stored locally in vector_db/ folder
- Uploaded files are stored in uploads/ folder
- Cloned repositories are stored in uploads/repo_*/ folders
- Only public GitHub/GitLab repositories are supported
- Maximum file size: 10MB per file
- Maximum repository files: 50 Python files per analysis

---

## Support

For questions or issues, contact your development team.

---

**Last Updated**: March 2026  
**Version**: 2.0  
**Stack**: Flask + React + MongoDB + FAISS + OpenRouter  
**Author**: AI Code Assistant Team
