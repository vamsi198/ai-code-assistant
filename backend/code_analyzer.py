# backend/code_analyzer.py
import ast
import os
import subprocess
import json
from typing import Dict, List, Any
from io import StringIO
import sys
from pylint import lint
from pylint.reporters.text import TextReporter
from config import Config


class CodeAnalyzer:
    """
    Comprehensive code analyzer using AST, pylint, and flake8
    """
    
    def __init__(self):
        self.config = Config
    
    
    def analyze_file(self, filepath: str) -> Dict[str, Any]:
        """
        Main method to analyze a code file
        Returns comprehensive analysis results
        """
        # Read file content
        with open(filepath, 'r', encoding='utf-8') as f:
            code_content = f.read()
        
        file_extension = os.path.splitext(filepath)[1]
        
        # Currently supports Python files primarily
        if file_extension == '.py':
            return self._analyze_python_file(filepath, code_content)
        elif file_extension in ['.js', '.jsx', '.ts', '.tsx']:
            return self._analyze_javascript_file(filepath, code_content)
        else:
            return {
                'filepath': filepath,
                'language': 'unknown',
                'code': code_content,
                'error': f'Analysis not supported for {file_extension} files yet'
            }
    
    
    def _analyze_python_file(self, filepath: str, code: str) -> Dict[str, Any]:
        """Analyze Python file using AST, pylint, and flake8"""
        
        result = {
            'filepath': filepath,
            'language': 'python',
            'code': code,
            'ast_analysis': {},
            'pylint_analysis': {},
            'flake8_analysis': {},
            'issues': [],
            'summary': {}
        }
        
        # 1. AST Analysis
        try:
            result['ast_analysis'] = self._parse_ast_python(code)
        except Exception as e:
            result['ast_analysis'] = {'error': str(e)}
        
        # 2. Pylint Analysis
        try:
            result['pylint_analysis'] = self._run_pylint(filepath)
            result['pylint_score'] = result['pylint_analysis'].get('score', 0)
        except Exception as e:
            result['pylint_analysis'] = {'error': str(e)}
            result['pylint_score'] = 0
        
        # 3. Flake8 Analysis
        try:
            result['flake8_analysis'] = self._run_flake8(filepath)
        except Exception as e:
            result['flake8_analysis'] = {'error': str(e)}
        
        # 4. Combine issues
        result['issues'] = self._combine_issues(result)
        
        # 5. Generate summary
        result['summary'] = self._generate_summary(result)
        
        return result
    
    
    def _parse_ast_python(self, code: str) -> Dict[str, Any]:
        """Parse Python code using AST"""
        
        tree = ast.parse(code)
        
        analysis = {
            'functions': [],
            'classes': [],
            'imports': [],
            'global_variables': [],
            'total_lines': len(code.split('\n')),
            'docstring': ast.get_docstring(tree)
        }
        
        for node in ast.walk(tree):
            # Functions
            if isinstance(node, ast.FunctionDef):
                analysis['functions'].append({
                    'name': node.name,
                    'line_start': node.lineno,
                    'line_end': node.end_lineno,
                    'args': [arg.arg for arg in node.args.args],
                    'decorators': [d.id if isinstance(d, ast.Name) else str(d) for d in node.decorator_list],
                    'docstring': ast.get_docstring(node),
                    'is_async': isinstance(node, ast.AsyncFunctionDef)
                })
            
            # Classes
            elif isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                analysis['classes'].append({
                    'name': node.name,
                    'line_start': node.lineno,
                    'line_end': node.end_lineno,
                    'methods': methods,
                    'bases': [self._get_name(base) for base in node.bases],
                    'docstring': ast.get_docstring(node)
                })
            
            # Imports
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    analysis['imports'].append({
                        'module': alias.name,
                        'alias': alias.asname,
                        'type': 'import'
                    })
            
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    analysis['imports'].append({
                        'module': node.module,
                        'name': alias.name,
                        'alias': alias.asname,
                        'type': 'from_import'
                    })
        
        return analysis
    
    
    def _run_pylint(self, filepath: str) -> Dict[str, Any]:
        """Run pylint on the file"""
        
        pylint_output = StringIO()
        reporter = TextReporter(pylint_output)
        
        # Run pylint
        pylint_opts = [
            filepath,
            '--output-format=json',
            '--reports=y'
        ]
        
        if self.config.PYLINT_RCFILE:
            pylint_opts.append(f'--rcfile={self.config.PYLINT_RCFILE}')
        
        try:
            # Capture pylint results
            results = lint.Run(pylint_opts, reporter=reporter, exit=False)
            score = results.linter.stats.global_note
            
            # Get messages
            messages = []
            for msg in results.linter.reporter.messages:
                messages.append({
                    'type': msg.category,
                    'line': msg.line,
                    'column': msg.column,
                    'message': msg.msg,
                    'symbol': msg.symbol,
                    'severity': self._map_pylint_severity(msg.category)
                })
            
            return {
                'score': round(score, 2),
                'messages': messages,
                'total_messages': len(messages),
                'passed': score >= self.config.PYLINT_THRESHOLD
            }
        
        except Exception as e:
            return {
                'error': str(e),
                'score': 0,
                'messages': [],
                'passed': False
            }
    
    
    def _run_flake8(self, filepath: str) -> Dict[str, Any]:
        """Run flake8 on the file"""
        
        cmd = [
            'flake8',
            filepath,
            f'--max-line-length={self.config.FLAKE8_MAX_LINE_LENGTH}',
            f'--ignore={",".join(self.config.FLAKE8_IGNORE)}',
            '--format=%(row)d:%(col)d:%(code)s:%(text)s'
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            messages = []
            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        parts = line.split(':', 3)
                        if len(parts) >= 4:
                            messages.append({
                                'line': int(parts[0]),
                                'column': int(parts[1]),
                                'code': parts[2],
                                'message': parts[3],
                                'severity': self._map_flake8_severity(parts[2])
                            })
            
            return {
                'messages': messages,
                'total_messages': len(messages),
                'passed': len(messages) == 0
            }
        
        except subprocess.TimeoutExpired:
            return {
                'error': 'Flake8 analysis timeout',
                'messages': [],
                'passed': False
            }
        except Exception as e:
            return {
                'error': str(e),
                'messages': [],
                'passed': False
            }
    
    
    def _analyze_javascript_file(self, filepath: str, code: str) -> Dict[str, Any]:
        """Basic analysis for JavaScript files (can be expanded)"""
        
        return {
            'filepath': filepath,
            'language': 'javascript',
            'code': code,
            'total_lines': len(code.split('\n')),
            'note': 'JavaScript analysis support is basic. For full analysis, integrate ESLint.'
        }
    
    
    def _combine_issues(self, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Combine issues from all analyzers"""
        
        issues = []
        
        # Add pylint issues
        if 'messages' in result.get('pylint_analysis', {}):
            for msg in result['pylint_analysis']['messages']:
                issues.append({
                    'source': 'pylint',
                    'line': msg['line'],
                    'severity': msg['severity'],
                    'message': msg['message'],
                    'code': msg.get('symbol', '')
                })
        
        # Add flake8 issues
        if 'messages' in result.get('flake8_analysis', {}):
            for msg in result['flake8_analysis']['messages']:
                issues.append({
                    'source': 'flake8',
                    'line': msg['line'],
                    'severity': msg['severity'],
                    'message': msg['message'],
                    'code': msg.get('code', '')
                })
        
        # Sort by line number
        issues.sort(key=lambda x: x['line'])
        
        return issues
    
    
    def _generate_summary(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Generate analysis summary"""
        
        ast_data = result.get('ast_analysis', {})
        
        summary = {
            'total_functions': len(ast_data.get('functions', [])),
            'total_classes': len(ast_data.get('classes', [])),
            'total_imports': len(ast_data.get('imports', [])),
            'total_lines': ast_data.get('total_lines', 0),
            'total_issues': len(result.get('issues', [])),
            'pylint_score': result.get('pylint_score', 0),
            'pylint_passed': result.get('pylint_analysis', {}).get('passed', False),
            'flake8_passed': result.get('flake8_analysis', {}).get('passed', False),
            'has_docstring': ast_data.get('docstring') is not None
        }
        
        # Calculate overall quality score (0-100)
        quality_score = self._calculate_quality_score(result)
        summary['quality_score'] = quality_score
        summary['quality_grade'] = self._get_quality_grade(quality_score)
        
        return summary
    
    
    def _calculate_quality_score(self, result: Dict[str, Any]) -> float:
        """Calculate overall quality score (0-100)"""
        
        pylint_score = result.get('pylint_score', 0)
        total_issues = len(result.get('issues', []))
        total_lines = result.get('ast_analysis', {}).get('total_lines', 1)
        
        # Normalize pylint score (0-10 to 0-100)
        pylint_component = (pylint_score / 10) * 70  # 70% weight
        
        # Issue density penalty
        issue_density = total_issues / max(total_lines, 1)
        issue_component = max(0, 30 - (issue_density * 100))  # 30% weight
        
        quality_score = pylint_component + issue_component
        return round(min(100, max(0, quality_score)), 2)
    
    
    def _get_quality_grade(self, score: float) -> str:
        """Get quality grade from score"""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'
    
    
    def _map_pylint_severity(self, category: str) -> str:
        """Map pylint category to severity"""
        mapping = {
            'convention': 'info',
            'refactor': 'warning',
            'warning': 'warning',
            'error': 'error',
            'fatal': 'critical'
        }
        return mapping.get(category.lower(), 'info')
    
    
    def _map_flake8_severity(self, code: str) -> str:
        """Map flake8 code to severity"""
        if code.startswith('E'):
            return 'error'
        elif code.startswith('W'):
            return 'warning'
        elif code.startswith('F'):
            return 'error'
        else:
            return 'info'
    
    
    def _get_name(self, node) -> str:
        """Get name from AST node"""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{self._get_name(node.value)}.{node.attr}"
        else:
            return str(node)


# ============================================================================
# Helper Functions
# ============================================================================

def analyze_code_file(filepath: str) -> Dict[str, Any]:
    """
    Convenience function to analyze a code file
    """
    analyzer = CodeAnalyzer()
    return analyzer.analyze_file(filepath)


def calculate_metrics(filepath: str) -> Dict[str, Any]:
    """
    Calculate code metrics (complexity, maintainability, etc.)
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            code = f.read()
        
        tree = ast.parse(code)
        
        metrics = {
            'cyclomatic_complexity': _calculate_cyclomatic_complexity(tree),
            'maintainability_index': _calculate_maintainability_index(code),
            'lines_of_code': len(code.split('\n')),
            'comment_ratio': _calculate_comment_ratio(code)
        }
        
        return metrics
    
    except Exception as e:
        return {
            'error': str(e),
            'cyclomatic_complexity': 0,
            'maintainability_index': 0,
            'lines_of_code': 0,
            'comment_ratio': 0
        }


def _calculate_cyclomatic_complexity(tree) -> int:
    """Calculate cyclomatic complexity"""
    complexity = 1  # Base complexity
    
    for node in ast.walk(tree):
        if isinstance(node, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
            complexity += 1
        elif isinstance(node, ast.BoolOp):
            complexity += len(node.values) - 1
    
    return complexity


def _calculate_maintainability_index(code: str) -> float:
    """Calculate maintainability index (simplified)"""
    lines = code.split('\n')
    loc = len([line for line in lines if line.strip()])
    
    # Simplified MI formula
    if loc == 0:
        return 100
    
    mi = 171 - 5.2 * (loc / 100) - 0.23 * 10
    return round(max(0, min(100, mi)), 2)


def _calculate_comment_ratio(code: str) -> float:
    """Calculate ratio of comment lines to total lines"""
    lines = code.split('\n')
    total_lines = len(lines)
    comment_lines = len([line for line in lines if line.strip().startswith('#')])
    
    if total_lines == 0:
        return 0
    
    return round((comment_lines / total_lines) * 100, 2)
