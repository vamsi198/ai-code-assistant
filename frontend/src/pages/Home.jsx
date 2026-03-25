import { Sparkles, Zap, Shield, BookOpen, Upload, Code } from 'lucide-react';
import CodeUpload from '../components/CodeUpload';

function Home() {
    const features = [
        {
            icon: Sparkles,
            title: 'AI-Powered Review',
            description: 'Get intelligent code analysis with actionable insights and suggestions.',
            color: 'text-indigo-700',
            bg: 'bg-indigo-50',
            border: 'border-indigo-200'
        },
        {
            icon: Zap,
            title: 'Performance Metrics',
            description: 'Analyze code complexity (Cyclomatic, Halstead) and maintainability index in seconds.',
            color: 'text-sky-700', // Primary Accent Color
            bg: 'bg-sky-50',
            border: 'border-sky-200'
        },
        {
            icon: Shield,
            title: 'Security Focus',
            description: 'Detect potential security vulnerabilities and get recommendations for secure coding practices.',
            color: 'text-red-700',
            bg: 'bg-red-50',
            border: 'border-red-200'
        },
        {
            icon: BookOpen,
            title: 'Auto Documentation',
            description: 'Generate comprehensive documentation automatically from your code structure and docstrings.',
            color: 'text-green-700',
            bg: 'bg-green-50',
            border: 'border-green-200'
        }
    ];

    const stats = [
        { value: '10+', label: 'Analysis Metrics' },
        { value: '100%', label: 'Free & Open' },
        { value: '<5s', label: 'Avg. Time' },
        { value: 'A-F', label: 'Quality Grades' }
    ];

    const steps = [
        { number: 1, title: 'Upload or Clone', description: 'Upload a Python file or paste a GitHub repository URL into the box below.' },
        { number: 2, title: 'AI & Static Analysis', description: 'Our system runs your code through advanced static checkers and the Gemini API.' },
        { number: 3, title: 'Review Results', description: 'Receive a detailed report with scores, suggestions, and auto-generated documentation.' }
    ];

    return (
        <div className="home-page max-w-7xl mx-auto">
            
            {/* 1. Hero Section: Clean White Background */}
            <section className="py-20 md:py-32 text-center relative bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4">
                    
                    {/* REMOVED: Badge ("Powered by Google Gemini AI") */}
                    
                    {/* Title */}
                    <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                        Intelligent Code Review 
                        <span className="block text-sky-600 mt-2">
                             Made Simple.
                        </span>
                    </h1>
                    
                    {/* Description */}
                    <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
                        Get instant analysis, quality metrics, security insights, and auto-generated documentation.
                    </p>

                    {/* Stats */}
                    <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 p-4 rounded-xl border border-gray-200 max-w-3xl mx-auto bg-gray-50">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-item">
                                <div className="text-3xl font-extrabold text-sky-600">{stat.value}</div>
                                <div className="text-sm text-gray-500 font-medium mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 2. Upload Section (Call to Action) */}
            <section className="py-16 px-4 -mt-20 z-10 relative">
                <CodeUpload /> 
            </section>

            {/* 3. Features Section: Light Gray Background */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900">
                            Why Choose AI Code Assistant?
                        </h2>
                        <p className="text-lg text-gray-600 mt-2">
                            Comprehensive code analysis with cutting-edge technology.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <div key={index} className={`p-6 rounded-xl shadow-lg bg-white transition duration-300 hover:shadow-xl border ${feature.border}`}>
                                    <div className={`w-12 h-12 flex items-center justify-center rounded-lg mb-4 ${feature.bg} ${feature.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                                    <p className="mt-2 text-gray-600 text-base">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
            
            {/* 4. How It Works Section: White Background */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900">
                            How It Works
                        </h2>
                        <p className="text-lg text-gray-600 mt-2">
                            Get professional code analysis in three simple steps.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-8 relative">
                        {steps.map((step, index) => (
                            <div key={index} className="flex-1 max-w-sm relative">
                                {/* Arrow Separator */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-10 left-[calc(100%+8px)] w-8 h-px bg-gray-300 before:content-[''] before:absolute before:-right-1 before:-top-1 before:w-3 before:h-3 before:border-r before:border-t before:border-gray-300 before:rotate-45"></div>
                                )}

                                <div className="step-card p-6 bg-white rounded-xl shadow-xl border-t-4 border-sky-500 text-center transition duration-300 hover:shadow-2xl">
                                    <div className="w-10 h-10 mx-auto mb-4 flex items-center justify-center bg-sky-600 text-white rounded-full font-bold text-xl shadow-md">
                                        {step.number}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                                    <p className="mt-2 text-gray-600 text-base">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. CTA Section: Light Sky Blue Background */}
            <section className="py-20 px-4 bg-sky-50 shadow-inner border-t border-gray-200">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-extrabold text-gray-800">Ready to Improve Your Code?</h2>
                    <p className="mt-4 text-lg text-sky-700">
                        Start analyzing your Python projects today — completely free!
                    </p>
                    <button 
                        className="mt-8 inline-flex items-center space-x-2 px-8 py-4 bg-sky-600 text-white rounded-full font-bold text-lg shadow-xl hover:bg-sky-700 transition duration-300 transform hover:scale-105"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <Upload size={20} />
                        <span>Start Analyzing Now</span>
                    </button>
                </div>
            </section>
        </div>
    );
}

export default Home;