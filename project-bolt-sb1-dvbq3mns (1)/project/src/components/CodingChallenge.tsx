import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Clock, CheckCircle, XCircle, AlertCircle, Filter, Building, Trophy, TrendingUp, Code, Terminal, Zap, Target, RotateCcw, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Judge0Service } from '../utils/judge0';
import { generateInterviewFeedback } from '../utils/gemini';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { getRandomCodingQuestions, getAllCompanies, getAllCategories, getTotalQuestionCount, type CodingQuestion } from '../data/codingQuestions';

export const CodingChallenge = () => {
  const { challengeId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [challenges, setChallenges] = useState<CodingQuestion[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<CodingQuestion[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<CodingQuestion | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  
  // Filter states
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, [challengeId]);

  const loadChallenges = async () => {
    // Load 100 coding challenges
    const loadedChallenges = getRandomCodingQuestions(undefined, undefined, undefined, 100);
    setChallenges(loadedChallenges);
    setFilteredChallenges(loadedChallenges);

    if (challengeId) {
      const challenge = loadedChallenges.find(c => c.id === challengeId);
      if (challenge) {
        selectChallenge(challenge);
      }
    }
  };

  useEffect(() => {
    // Apply filters
    let filtered = challenges;

    if (selectedDifficulty) {
      filtered = filtered.filter(c => c.difficulty === selectedDifficulty);
    }

    if (selectedCategory) {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    if (selectedCompany) {
      filtered = filtered.filter(c => c.company === selectedCompany);
    }

    setFilteredChallenges(filtered);
  }, [challenges, selectedDifficulty, selectedCategory, selectedCompany]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsTimerActive(false);
            handleTimeUp();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const selectChallenge = (challenge: CodingQuestion) => {
    setSelectedChallenge(challenge);
    setCode(challenge.starterCode[language as keyof typeof challenge.starterCode] || '');
    setTimeLeft(challenge.timeLimit * 60);
    setExecutionResult(null);
    setSubmissionResult(null);
    setSubmissions([]);
    setAiAnalysis('');
    setCustomInput('');
    setIsTimerActive(false);
    setShowSubmitSuccess(false);
    setTerminalOutput(`🚀 Challenge loaded: ${challenge.title}\n📊 Difficulty: ${challenge.difficulty} | Category: ${challenge.category}\n⏱️ Time limit: ${challenge.timeLimit} minutes\n\n`);
    
    // Auto-scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (selectedChallenge) {
      setCode(selectedChallenge.starterCode[newLanguage as keyof typeof selectedChallenge.starterCode] || '');
      setTerminalOutput(prev => prev + `🔄 Language changed to ${newLanguage}\n`);
    }
  };

  const startTimer = () => {
    setIsTimerActive(true);
    setTerminalOutput(prev => prev + `⏰ Timer started for ${selectedChallenge?.title}\n`);
  };

  const handleTimeUp = () => {
    setTerminalOutput(prev => prev + `⏰ Time's up! You can still continue working...\n`);
  };

  const runCode = async () => {
    if (!selectedChallenge) return;

    setIsRunning(true);
    setTerminalOutput(prev => prev + `🔄 Running code with ${language}...\n`);
    
    try {
      // Use custom input if provided, otherwise use visible test cases
      let testCases;
      if (customInput.trim()) {
        testCases = [{
          input: customInput.trim(),
          expectedOutput: 'Custom input - check output manually',
          isHidden: false
        }];
      } else {
        testCases = selectedChallenge.testCases.filter(tc => !tc.isHidden);
      }
      
      const result = await Judge0Service.runTestCases(code, language, testCases);
      
      setExecutionResult({
        ...result,
        status: result.passed === result.total ? 'accepted' : 'wrong_answer',
        isCustomInput: !!customInput.trim()
      });

      // Enhanced terminal output
      setTerminalOutput(prev => prev + 
        `✅ Code execution completed!\n` +
        `📊 Results: ${result.passed}/${result.total} test cases passed\n` +
        `⚡ Status: ${result.passed === result.total ? 'ACCEPTED' : 'WRONG ANSWER'}\n` +
        `⏱️  Total time: ${result.totalExecutionTime.toFixed(2)}ms\n` +
        `💾 Max memory: ${result.maxMemory}KB\n` +
        `🎯 Overall status: ${result.overallStatus}\n\n`
      );

      // Log activity
      if (user?.id) {
        dbOperations.logActivity(
          user.id,
          'coding',
          `Code Test - ${selectedChallenge.title}`,
          (result.passed / result.total) * 100,
          Math.round(result.totalExecutionTime),
          `Language: ${language}, Passed: ${result.passed}/${result.total}`
        );
      }
      
    } catch (error) {
      console.error('Code execution error:', error);
      setTerminalOutput(prev => prev + `❌ Service unavailable, please retry.\n`);
      setExecutionResult({
        status: 'runtime_error',
        error: 'Service unavailable, please retry.',
        passed: 0,
        total: selectedChallenge.testCases.length,
        results: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedChallenge || !user?.id) return;

    setIsSubmitting(true);
    setTerminalOutput(prev => prev + `📤 Submitting solution for evaluation...\n`);
    
    try {
      const result = await Judge0Service.submitCode(code, language, selectedChallenge.testCases);
      
      setSubmissionResult(result);
      setTerminalOutput(prev => prev + 
        `🎯 Submission evaluation completed!\n` +
        `📈 Score: ${result.score.toFixed(1)}%\n` +
        `🏆 Status: ${result.status.toUpperCase()}\n` +
        `⚡ Execution time: ${result.executionTime.toFixed(2)}ms\n` +
        `💾 Memory used: ${result.memory}KB\n\n`
      );

      // Generate AI feedback
      try {
        const aiFeedback = await generateInterviewFeedback(
          `Code Review for ${selectedChallenge.title}`,
          `Problem: ${selectedChallenge.title}
Difficulty: ${selectedChallenge.difficulty}
Category: ${selectedChallenge.category}
Language: ${language}

Code Solution:
${code}

Test Results:
- Status: ${result.status}
- Score: ${result.score}%
- Execution Time: ${result.executionTime}ms
- Memory: ${result.memory}KB

Please provide code quality assessment, algorithm efficiency analysis, and optimization suggestions.`,
          'Software Developer',
          'Code Review'
        );

        setAiAnalysis(aiFeedback.feedback);
      } catch (aiError) {
        console.error('AI feedback error:', aiError);
        setAiAnalysis('AI feedback temporarily unavailable. Your code has been submitted successfully.');
      }

      // Save submission
      const submission = {
        id: uuidv4(),
        userId: user.id,
        challengeId: selectedChallenge.id,
        challengeTitle: selectedChallenge.title,
        difficulty: selectedChallenge.difficulty,
        code,
        language,
        status: result.status,
        score: result.score,
        executionTime: result.executionTime,
        memory: result.memory,
        testCasesPassed: result.testResults.filter(t => t.passed).length,
        totalTestCases: result.testResults.length,
        aiFeedback: aiFeedback?.feedback || '',
        aiScore: aiFeedback?.rating || 0
      };

      dbOperations.saveCodingSubmission(submission);
      setSubmissions(prev => [...prev, submission]);

      // Update user progress
      if (result.status === 'accepted') {
        const progress = dbOperations.getUserProgress(user.id);
        dbOperations.updateUserProgress(user.id, {
          codingChallengesSolved: (progress?.codingChallengesSolved || 0) + 1
        });
        
        setTerminalOutput(prev => prev + `🎉 Congratulations! Problem solved successfully!\n`);
        setShowSubmitSuccess(true);
      }

      setIsTimerActive(false);
      
    } catch (error) {
      console.error('Submission error:', error);
      setTerminalOutput(prev => prev + `❌ Service unavailable, please retry.\n`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadNextChallenge = () => {
    const currentIndex = filteredChallenges.findIndex(c => c.id === selectedChallenge?.id);
    if (currentIndex < filteredChallenges.length - 1) {
      const nextChallenge = filteredChallenges[currentIndex + 1];
      selectChallenge(nextChallenge);
      setTerminalOutput(prev => prev + `➡️ Moving to next challenge: ${nextChallenge.title}\n`);
    } else {
      setTerminalOutput(prev => prev + `🏁 You've completed all challenges in this set!\n`);
    }
  };

  const loadPreviousChallenge = () => {
    const currentIndex = filteredChallenges.findIndex(c => c.id === selectedChallenge?.id);
    if (currentIndex > 0) {
      const prevChallenge = filteredChallenges[currentIndex - 1];
      selectChallenge(prevChallenge);
      setTerminalOutput(prev => prev + `⬅️ Moving to previous challenge: ${prevChallenge.title}\n`);
    }
  };

  const resetChallenge = () => {
    if (selectedChallenge) {
      setCode(selectedChallenge.starterCode[language as keyof typeof selectedChallenge.starterCode] || '');
      setExecutionResult(null);
      setSubmissionResult(null);
      setAiAnalysis('');
      setCustomInput('');
      setShowSubmitSuccess(false);
      setTerminalOutput(prev => prev + `🔄 Challenge reset: ${selectedChallenge.title}\n`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'wrong_answer': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'time_limit': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'runtime_error': 
      case 'compilation_error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertCircle className="h-5 w-5 text-slate-600" />;
    }
  };

  if (!selectedChallenge) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            🚀 Coding Challenge Platform (Codytech/HackerRank Clone)
          </h1>
          <p className="text-lg text-slate-600">
            Master coding with {challenges.length}+ real interview questions from FAANG, TCS, Wipro, Infosys, and more.
          </p>
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-slate-600">
            <div className="flex items-center space-x-1">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span>Judge0 Compiler</span>
            </div>
            <div className="flex items-center space-x-1">
              <Terminal className="h-4 w-4 text-blue-600" />
              <span>Live Execution</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4 text-purple-600" />
              <span>AI Code Review</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Filter Problems</h3>
            <span className="text-sm text-slate-500">({filteredChallenges.length} problems)</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy ({challenges.filter(c => c.difficulty === 'easy').length})</option>
              <option value="medium">Medium ({challenges.filter(c => c.difficulty === 'medium').length})</option>
              <option value="hard">Hard ({challenges.filter(c => c.difficulty === 'hard').length})</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {getAllCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Companies</option>
              {getAllCompanies().map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Challenge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <div
              key={challenge.id}
              onClick={() => selectChallenge(challenge)}
              className="card bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">
                  {challenge.title}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty}
                </span>
              </div>
              
              <p className="text-slate-600 mb-4 line-clamp-3 text-sm">
                {challenge.description.split('\n')[0]}
              </p>
              
              <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>{challenge.company || 'General'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{challenge.timeLimit} min</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Target className="h-3 w-3" />
                  <span>{challenge.category}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Code className="h-3 w-3" />
                  <span>{challenge.testCases.length} tests</span>
                </span>
              </div>
              
              {/* Progress indicator if challenge was attempted */}
              {submissions.some(s => s.challengeId === challenge.id) && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Attempted</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">No challenges match your current filters.</p>
            <button
              onClick={() => {
                setSelectedDifficulty('');
                setSelectedCategory('');
                setSelectedCompany('');
              }}
              className="mt-4 text-indigo-600 hover:text-indigo-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    );
  }

  const getCurrentChallengeIndex = () => {
    return filteredChallenges.findIndex(c => c.id === selectedChallenge?.id);
  };

  const canGoNext = () => {
    return getCurrentChallengeIndex() < filteredChallenges.length - 1;
  };

  const canGoPrevious = () => {
    return getCurrentChallengeIndex() > 0;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {selectedChallenge.title}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(selectedChallenge.difficulty)}`}>
                {selectedChallenge.difficulty}
              </span>
              {selectedChallenge.company && (
                <div className="flex items-center space-x-1 text-sm text-slate-600">
                  <Building className="h-4 w-4" />
                  <span>{selectedChallenge.company}</span>
                </div>
              )}
            </div>
            <p className="text-slate-600">
              Challenge {getCurrentChallengeIndex() + 1} of {filteredChallenges.length} • Time Limit: {selectedChallenge.timeLimit} minutes • {selectedChallenge.category}
            </p>
          </div>
          
          <div className="text-right">
            <div className={`text-2xl font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-slate-600">Time Remaining</div>
            {!isTimerActive && timeLeft > 0 && (
              <button
                onClick={startTimer}
                className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Start Timer
              </button>
            )}
          </div>
        </div>
        
        {/* Challenge Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPreviousChallenge}
              disabled={!canGoPrevious()}
              className="flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            
            <button
              onClick={loadNextChallenge}
              disabled={!canGoNext()}
              className="flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <button
              onClick={resetChallenge}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
          
          <button
            onClick={() => setSelectedChallenge(null)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ← Back to Problems
          </button>
        </div>
      </div>

      {/* Codytech/HackerRank Style Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Description Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Problem Description</h2>
          
          <div className="prose prose-slate max-w-none mb-6">
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {selectedChallenge.description}
            </div>
          </div>

          {/* Examples */}
          {selectedChallenge.examples && selectedChallenge.examples.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">Examples:</h3>
              {selectedChallenge.examples.map((example, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <h4 className="font-medium text-slate-700 mb-1">Input:</h4>
                      <code className="text-sm bg-white p-2 rounded border block font-mono">
                        {example.input}
                      </code>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-700 mb-1">Output:</h4>
                      <code className="text-sm bg-white p-2 rounded border block font-mono">
                        {example.output}
                      </code>
                    </div>
                    {example.explanation && (
                      <div>
                        <h4 className="font-medium text-slate-700 mb-1">Explanation:</h4>
                        <p className="text-sm text-slate-600">{example.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Test Cases */}
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-slate-900">Sample Test Cases:</h3>
            {selectedChallenge.testCases
              .filter(tc => !tc.isHidden)
              .map((testCase, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <h4 className="font-medium text-slate-700 mb-1">Input:</h4>
                      <code className="text-sm bg-white p-2 rounded border block font-mono">
                        {testCase.input}
                      </code>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-700 mb-1">Expected Output:</h4>
                      <code className="text-sm bg-white p-2 rounded border block font-mono">
                        {testCase.expectedOutput}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Execution Results */}
          {executionResult && (
            <div className="execution-results p-4 rounded-lg border mb-6">
              <div className="flex items-center space-x-2 mb-3">
                {getStatusIcon(executionResult.status)}
                <span className="font-semibold capitalize">
                  {executionResult.status.replace('_', ' ')}
                </span>
                {executionResult.isCustomInput && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    Custom Input
                  </span>
                )}
              </div>
              
              {executionResult.results && (
                <div className="space-y-2 mb-3">
                  <p className="font-medium text-slate-900">
                    Test Results: {executionResult.passed}/{executionResult.total} passed
                  </p>
                  {executionResult.results.map((result: any, index: number) => (
                    <div key={index} className={`p-2 rounded text-sm ${
                      result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>Test Case {index + 1}</span>
                        <span>{result.passed ? '✓ Passed' : '✗ Failed'}</span>
                      </div>
                      {!result.passed && !executionResult.isCustomInput && (
                        <div className="mt-1 text-xs">
                          Expected: {result.expectedOutput} | Got: {result.actualOutput}
                        </div>
                      )}
                      {executionResult.isCustomInput && (
                        <div className="mt-1 text-xs">
                          Output: {result.actualOutput}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {executionResult.totalExecutionTime !== undefined && (
                <div className="flex space-x-4 text-sm text-slate-600">
                  <span>⚡ Time: {executionResult.totalExecutionTime.toFixed(2)}ms</span>
                  {executionResult.maxMemory && <span>💾 Memory: {executionResult.maxMemory}KB</span>}
                </div>
              )}
            </div>
          )}

          {/* Submission Success */}
          {showSubmitSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">✅ Code submitted successfully!</span>
              </div>
              <button
                onClick={loadNextChallenge}
                disabled={!canGoNext()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <span>Go to Next Challenge</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* AI Analysis */}
          {aiAnalysis && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">🤖 AI Code Analysis</h3>
              <div className="text-sm text-blue-800 whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            </div>
          )}
        </div>

        {/* Code Editor Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Code Editor</h2>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>

          {/* Custom Input Section */}
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-medium text-slate-900 mb-2">Custom Input (Optional)</h3>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter custom input to test your code..."
              className="w-full h-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty to use default test cases. Use this to test edge cases or custom scenarios.
            </p>
          </div>
          
          <Editor
            height="400px"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              tabSize: 2,
              bracketPairColorization: { enabled: true },
              formatOnPaste: true,
              formatOnType: true
            }}
          />

          {/* Terminal Output */}
          <div className="h-48 bg-slate-900 text-green-400 p-4 font-mono text-sm overflow-y-auto border-t border-slate-200">
            <div className="flex items-center mb-2">
              <Terminal className="h-4 w-4 mr-2 text-slate-400" />
              <span className="text-slate-300">Terminal Output</span>
              <button
                onClick={() => setTerminalOutput('')}
                className="ml-auto text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            </div>
            <div className="whitespace-pre-wrap">
              {terminalOutput || 'Ready to execute code...\n'}
            </div>
          </div>

          {/* Run & Submit Buttons */}
          <div className="p-4 border-t border-slate-200 flex space-x-3">
            <button
              onClick={runCode}
              disabled={isRunning || isSubmitting}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isRunning ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>{customInput.trim() ? 'Run Custom' : 'Run Code'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Solution</span>
                </>
              )}
            </button>
          </div>

          {/* Recent Submissions */}
          {submissions.length > 0 && (
            <div className="p-4 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Recent Submissions</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {submissions.slice(-5).reverse().map((submission, index) => (
                  <div key={submission.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(submission.status)}
                      <span className="text-sm font-medium">
                        {submission.language} • {submission.score?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {submission.executionTime?.toFixed(2)}ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};