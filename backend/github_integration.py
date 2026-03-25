import os
import requests
import subprocess
from typing import Dict, List, Any, Optional
from config import Config
import shutil
from pathlib import Path


class GitHubIntegration:
    """
    GitHub API integration for PR comments and repository cloning
    Optional feature for CI/CD automation
    """
    
    def __init__(self):
        self.config = Config()
        self.github_token = self.config.GITHUB_TOKEN
        self.gitlab_token = self.config.GITLAB_TOKEN
        self.enabled = self.config.ENABLE_GIT_INTEGRATION
        
        if not self.github_token and self.enabled:
            print("⚠️  Warning: GITHUB_TOKEN not set. GitHub integration disabled.")
    
    def clone_repository(
        self, 
        repo_url: str, 
        clone_path: Optional[str] = None,
        max_files: int = 50
    ) -> Dict[str, Any]:
        """
        Clone a GitHub/GitLab repository with SHALLOW CLONE for speed.
        
        Args:
            repo_url: Repository URL
            clone_path: Optional custom clone path
            max_files: Maximum number of Python files to analyze (default: 50)
        
        Returns:
            Dictionary with clone results
        """
        try:
            if not clone_path:
                # Generate unique clone path
                repo_name = repo_url.split('/')[-1].replace('.git', '')
                clone_path = os.path.join(
                    self.config.UPLOAD_FOLDER, 
                    f'repo_{repo_name}_{os.urandom(4).hex()}'
                )
            
            # Remove existing directory if present
            if os.path.exists(clone_path):
                shutil.rmtree(clone_path)
            
            print(f"🔄 Cloning repository: {repo_url}")
            
            # ⭐ SHALLOW CLONE using subprocess (10-50x FASTER!)
            result = subprocess.run(
                [
                    'git', 'clone',
                    '--depth', '1',
                    '--single-branch',
                    '--filter=blob:none',
                    repo_url,
                    clone_path
                ],
                timeout=180,
                capture_output=True,
                text=True,
                check=True
            )
            
            print(f"✅ Repository cloned successfully")
            
            # Get repository info
            files = self._get_python_files(clone_path)
            
            print(f"📄 Found {len(files)} Python files")
            
            # ⭐ ENFORCE FILE LIMIT
            if len(files) > max_files:
                print(f"⚠️ Repository has {len(files)} files. Limiting to {max_files}.")
                files = files[:max_files]
            
            # Get current branch
            branch_name = self._get_current_branch(clone_path)
            
            # ❌ CLEANUP DISABLED - No automatic cleanup
            # self._cleanup_old_clones(3)
            
            return {
                'success': True,
                'clone_path': clone_path,
                'repo_url': repo_url,
                'files': files,
                'total_files': len(files),
                'branch': branch_name
            }
        
        except subprocess.TimeoutExpired:
            print(f"❌ Git clone timed out after 3 minutes")
            return {
                'success': False,
                'error': 'Repository clone timed out. The repository may be too large or your internet connection is slow.'
            }
        
        except subprocess.CalledProcessError as e:
            print(f"❌ Git clone failed: {e.stderr}")
            error_msg = e.stderr if e.stderr else str(e)
            
            # Handle common errors
            if 'not found' in error_msg.lower():
                return {
                    'success': False,
                    'error': 'Repository not found. Please check the URL and ensure it is public.'
                }
            elif 'authentication' in error_msg.lower() or 'denied' in error_msg.lower():
                return {
                    'success': False,
                    'error': 'Repository is private. Only public repositories are supported.'
                }
            else:
                return {
                    'success': False,
                    'error': f'Git clone failed: {error_msg[:200]}'
                }
        
        except Exception as e:
            print(f"❌ Unexpected error cloning repository: {str(e)}")
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }
    
    def _get_current_branch(self, repo_path: str) -> str:
        """Get current git branch name"""
        try:
            result = subprocess.run(
                ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip() or 'main'
        except:
            return 'main'
    
    def _cleanup_old_clones(self, keep_recent=3):
        """Cleanup disabled - repositories will be kept"""
        # ⭐ CLEANUP DISABLED
        return
    
    def cleanup_repo(self, clone_path: str):
        """Clean up specific cloned repository (disabled)"""
        # ⭐ CLEANUP DISABLED
        return
    
    def post_pr_comment(
        self, 
        repo_owner: str,
        repo_name: str,
        pr_number: int,
        comment_body: str,
        platform: str = 'github'
    ) -> Dict[str, Any]:
        """Post a comment on a GitHub/GitLab Pull Request"""
        if not self.enabled:
            return {
                'success': False,
                'error': 'Git integration is disabled'
            }
        
        try:
            if platform == 'github':
                return self._post_github_pr_comment(
                    repo_owner, repo_name, pr_number, comment_body
                )
            elif platform == 'gitlab':
                return self._post_gitlab_mr_comment(
                    repo_owner, repo_name, pr_number, comment_body
                )
            else:
                return {
                    'success': False,
                    'error': f'Unsupported platform: {platform}'
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _post_github_pr_comment(
        self,
        repo_owner: str,
        repo_name: str,
        pr_number: int,
        comment_body: str
    ) -> Dict[str, Any]:
        """Post comment to GitHub PR"""
        
        if not self.github_token:
            return {
                'success': False,
                'error': 'GitHub token not configured'
            }
        
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{pr_number}/comments'
        
        headers = {
            'Authorization': f'token {self.github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        payload = {
            'body': comment_body
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 201:
            return {
                'success': True,
                'comment_id': response.json().get('id'),
                'comment_url': response.json().get('html_url')
            }
        else:
            return {
                'success': False,
                'error': f'GitHub API error: {response.status_code}',
                'details': response.text
            }
    
    def _post_gitlab_mr_comment(
        self,
        repo_owner: str,
        repo_name: str,
        mr_number: int,
        comment_body: str
    ) -> Dict[str, Any]:
        """Post comment to GitLab MR"""
        
        if not self.gitlab_token:
            return {
                'success': False,
                'error': 'GitLab token not configured'
            }
        
        project_id = f'{repo_owner}%2F{repo_name}'
        url = f'https://gitlab.com/api/v4/projects/{project_id}/merge_requests/{mr_number}/notes'
        
        headers = {
            'PRIVATE-TOKEN': self.gitlab_token
        }
        
        payload = {
            'body': comment_body
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 201:
            return {
                'success': True,
                'note_id': response.json().get('id'),
                'note_url': response.json().get('web_url')
            }
        else:
            return {
                'success': False,
                'error': f'GitLab API error: {response.status_code}',
                'details': response.text
            }
    
    def format_analysis_as_comment(
        self, 
        analysis_result: Dict[str, Any]
    ) -> str:
        """Format analysis results as PR/MR comment"""
        filename = analysis_result.get('filename', 'unknown')
        summary = analysis_result.get('summary', {})
        llm_review = analysis_result.get('llm_review', {})
        
        comment = f"""## 🤖 AI Code Review: `{filename}`

### 📊 Quality Metrics
- **Quality Score:** {summary.get('quality_score', 0)}/100 (Grade: {summary.get('quality_grade', 'N/A')})
- **Pylint Score:** {analysis_result.get('pylint_score', 0)}/10
- **Total Issues:** {summary.get('total_issues', 0)}
- **Functions:** {summary.get('total_functions', 0)}
- **Classes:** {summary.get('total_classes', 0)}

"""
        
        if llm_review and llm_review.get('review'):
            review_text = llm_review['review'][:1000]
            comment += f"""### 🔍 AI Review Summary
{review_text}

"""
        
        suggestions = llm_review.get('suggestions', [])
        if suggestions:
            comment += "### ⚠️ Key Issues\n"
            for i, suggestion in enumerate(suggestions[:5], 1):
                comment += f"{i}. {suggestion}\n"
            comment += "\n"
        
        security = llm_review.get('security_concerns', [])
        if security:
            comment += "### 🔒 Security Concerns\n"
            for concern in security[:3]:
                comment += f"- {concern}\n"
            comment += "\n"
        
        comment += """---
*Generated by AI Code Assistant*
"""
        
        return comment
    
    def get_pr_files(
        self,
        repo_owner: str,
        repo_name: str,
        pr_number: int,
        platform: str = 'github'
    ) -> Dict[str, Any]:
        """Get list of files changed in a PR/MR"""
        try:
            if platform == 'github':
                return self._get_github_pr_files(repo_owner, repo_name, pr_number)
            elif platform == 'gitlab':
                return self._get_gitlab_mr_files(repo_owner, repo_name, pr_number)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported platform: {platform}'
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_github_pr_files(
        self,
        repo_owner: str,
        repo_name: str,
        pr_number: int
    ) -> Dict[str, Any]:
        """Get files changed in GitHub PR"""
        
        if not self.github_token:
            return {
                'success': False,
                'error': 'GitHub token not configured'
            }
        
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/pulls/{pr_number}/files'
        
        headers = {
            'Authorization': f'token {self.github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            files = response.json()
            return {
                'success': True,
                'files': [
                    {
                        'filename': f['filename'],
                        'status': f['status'],
                        'additions': f['additions'],
                        'deletions': f['deletions'],
                        'changes': f['changes']
                    }
                    for f in files
                ],
                'total_files': len(files)
            }
        else:
            return {
                'success': False,
                'error': f'GitHub API error: {response.status_code}'
            }
    
    def _get_gitlab_mr_files(
        self,
        repo_owner: str,
        repo_name: str,
        mr_number: int
    ) -> Dict[str, Any]:
        """Get files changed in GitLab MR"""
        
        if not self.gitlab_token:
            return {
                'success': False,
                'error': 'GitLab token not configured'
            }
        
        project_id = f'{repo_owner}%2F{repo_name}'
        url = f'https://gitlab.com/api/v4/projects/{project_id}/merge_requests/{mr_number}/changes'
        
        headers = {
            'PRIVATE-TOKEN': self.gitlab_token
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            changes = data.get('changes', [])
            
            return {
                'success': True,
                'files': [
                    {
                        'filename': c['new_path'],
                        'status': 'modified',
                        'old_path': c.get('old_path')
                    }
                    for c in changes
                ],
                'total_files': len(changes)
            }
        else:
            return {
                'success': False,
                'error': f'GitLab API error: {response.status_code}'
            }
    
    def _get_python_files(self, directory: str) -> List[str]:
        """Get all Python files in a directory recursively"""
        python_files = []
        
        for root, dirs, files in os.walk(directory):
            # Skip common directories
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'venv', 'env', 'node_modules', '.venv', 'dist', 'build']]
            
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    python_files.append(filepath)
        
        return python_files
    
    def setup_webhook(
        self,
        repo_owner: str,
        repo_name: str,
        webhook_url: str,
        events: List[str] = None,
        platform: str = 'github'
    ) -> Dict[str, Any]:
        """Setup webhook for automated PR analysis"""
        if not self.enabled:
            return {
                'success': False,
                'error': 'Git integration is disabled'
            }
        
        if events is None:
            events = ['pull_request', 'push']
        
        try:
            if platform == 'github':
                return self._setup_github_webhook(repo_owner, repo_name, webhook_url, events)
            elif platform == 'gitlab':
                return self._setup_gitlab_webhook(repo_owner, repo_name, webhook_url, events)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported platform: {platform}'
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_github_webhook(
        self,
        repo_owner: str,
        repo_name: str,
        webhook_url: str,
        events: List[str]
    ) -> Dict[str, Any]:
        """Setup GitHub webhook"""
        
        if not self.github_token:
            return {
                'success': False,
                'error': 'GitHub token not configured'
            }
        
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/hooks'
        
        headers = {
            'Authorization': f'token {self.github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        payload = {
            'name': 'web',
            'active': True,
            'events': events,
            'config': {
                'url': webhook_url,
                'content_type': 'json'
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 201:
            return {
                'success': True,
                'webhook_id': response.json().get('id'),
                'webhook_url': response.json().get('url')
            }
        else:
            return {
                'success': False,
                'error': f'GitHub API error: {response.status_code}',
                'details': response.text
            }
    
    def _setup_gitlab_webhook(
        self,
        repo_owner: str,
        repo_name: str,
        webhook_url: str,
        events: List[str]
    ) -> Dict[str, Any]:
        """Setup GitLab webhook"""
        
        if not self.gitlab_token:
            return {
                'success': False,
                'error': 'GitLab token not configured'
            }
        
        project_id = f'{repo_owner}%2F{repo_name}'
        url = f'https://gitlab.com/api/v4/projects/{project_id}/hooks'
        
        headers = {
            'PRIVATE-TOKEN': self.gitlab_token
        }
        
        gitlab_events = {
            'merge_requests_events': 'pull_request' in events,
            'push_events': 'push' in events
        }
        
        payload = {
            'url': webhook_url,
            **gitlab_events
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 201:
            return {
                'success': True,
                'hook_id': response.json().get('id'),
                'hook_url': response.json().get('url')
            }
        else:
            return {
                'success': False,
                'error': f'GitLab API error: {response.status_code}',
                'details': response.text
            }


# ============================================================================
# Helper Functions
# ============================================================================

def clone_and_analyze_repo(repo_url: str) -> Dict[str, Any]:
    """Convenience function to clone and prepare repository for analysis"""
    integration = GitHubIntegration()
    return integration.clone_repository(repo_url)
