import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Keyboard, RotateCcw, Play, Pause, Trophy, TrendingUp, Target, Clock } from 'lucide-react';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { getRandomTypingText, getAllTypingTexts } from '../data/typingTexts';

export const TypingTest = () => {
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [text, setText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeLimit, setTimeLimit] = useState(60);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [rawWpm, setRawWpm] = useState(0);
  const [netWpm, setNetWpm] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    resetTest();
    loadTestHistory();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && startTime && !endTime) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimeElapsed(elapsed);
        setTimeLeft(Math.max(0, timeLimit - elapsed));
        calculateMetrics(elapsed);
        
        // Auto-finish when time limit reached
        if (elapsed >= timeLimit) {
          finishTest();
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isActive, startTime, endTime, timeLimit, userInput]);

  useEffect(() => {
    // Auto-finish when text is complete
    if (userInput.length > 0 && userInput.length === text.length) {
      finishTest();
    }
  }, [userInput, text]);

  const loadTestHistory = () => {
    if (user?.id) {
      // Load recent typing test results from database
      setTestHistory([]);
    }
  };

  const resetTest = () => {
    const randomText = getRandomTypingText();
    setText(randomText);
    setUserInput('');
    setStartTime(null);
    setEndTime(null);
    setIsActive(false);
    setCurrentIndex(0);
    setErrors(0);
    setWpm(0);
    setRawWpm(0);
    setNetWpm(0);
    setAccuracy(100);
    setTimeElapsed(0);
    setTimeLeft(timeLimit);
    setShowResults(false);
    setCorrectChars(0);
    setIncorrectChars(0);
    inputRef.current?.focus();
  };

  const startTest = () => {
    if (!isActive) {
      setStartTime(Date.now());
      setIsActive(true);
      inputRef.current?.focus();
    }
  };

  const pauseTest = () => {
    setIsActive(false);
  };

  const finishTest = () => {
    if (!startTime) return;
    
    const endTime = Date.now();
    setEndTime(endTime);
    setIsActive(false);
    
    const duration = Math.min((endTime - startTime) / 1000, timeLimit);
    const finalMetrics = calculateMetrics(duration);
    
    setShowResults(true);
    
    // Save test result
    if (user?.id) {
      const testResult = {
        id: uuidv4(),
        userId: user.id,
        text,
        wpm: finalMetrics.netWpm,
        rawWpm: finalMetrics.rawWpm,
        accuracy: finalMetrics.accuracy,
        errors,
        correctChars,
        incorrectChars,
        duration: Math.round(duration),
        timeLimit,
        completedAt: new Date().toISOString()
      };
      
      dbOperations.saveTypingTest(testResult);
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)]);
      
      // Update user progress
      const progress = dbOperations.getUserProgress(user.id);
      const newAverage = progress?.averageTypingSpeed 
        ? (progress.averageTypingSpeed + finalMetrics.netWpm) / 2 
        : finalMetrics.netWpm;
      
      const newBest = Math.max(progress?.bestTypingSpeed || 0, finalMetrics.netWpm);
      
      dbOperations.updateUserProgress(user.id, {
        averageTypingSpeed: newAverage,
        bestTypingSpeed: newBest
      });
      
      console.log('📊 Typing test progress updated:', {
        average: newAverage,
        best: newBest,
        current: finalMetrics.netWpm
      });
      
      console.log('📊 Typing test progress updated:', {
        average: newAverage,
        best: newBest,
        current: finalMetrics.netWpm
      });
    }
  };

  const calculateMetrics = (duration: number) => {
    if (duration === 0) return { rawWpm: 0, netWpm: 0, accuracy: 100 };
    
    const minutes = duration / 60;
    const totalCharsTyped = userInput.length;
    const rawWpmCalc = Math.round((totalCharsTyped / 5) / minutes);
    
    // Calculate correct and incorrect characters
    let correct = 0;
    let incorrect = 0;
    
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === text[i]) {
        correct++;
      } else {
        incorrect++;
      }
    }
    
    setCorrectChars(correct);
    setIncorrectChars(incorrect);
    
    const accuracyCalc = userInput.length > 0 ? Math.round((correct / userInput.length) * 100) : 100;
    const netWpmCalc = Math.max(0, Math.round(rawWpmCalc - (incorrect / minutes)));
    
    setRawWpm(rawWpmCalc);
    setNetWpm(netWpmCalc);
    setWpm(netWpmCalc);
    setAccuracy(accuracyCalc);
    setErrors(incorrect);
    
    return { rawWpm: rawWpmCalc, netWpm: netWpmCalc, accuracy: accuracyCalc };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Prevent typing beyond text length
    if (value.length > text.length) return;
    
    if (!isActive && value.length > 0) {
      startTest();
    }
    
    setUserInput(value);
    setCurrentIndex(value.length);
  };

  const getCharacterClass = (index: number) => {
    if (index < userInput.length) {
      return userInput[index] === text[index] 
        ? 'bg-green-200 text-green-800 typing-char' 
        : 'bg-red-200 text-red-800 typing-char';
    } else if (index === currentIndex) {
      return 'bg-blue-200 text-blue-800 animate-pulse typing-char';
    }
    return 'text-slate-600';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWPMColor = (wpm: number) => {
    if (wpm >= 70) return 'text-purple-600';
    if (wpm >= 60) return 'text-blue-600';
    if (wpm >= 40) return 'text-green-600';
    if (wpm >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 98) return 'text-green-600';
    if (accuracy >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLevel = (wpm: number, accuracy: number) => {
    if (wpm >= 70 && accuracy >= 98) return { level: 'Expert', color: 'text-purple-600' };
    if (wpm >= 60 && accuracy >= 95) return { level: 'Advanced', color: 'text-blue-600' };
    if (wpm >= 40 && accuracy >= 90) return { level: 'Intermediate', color: 'text-green-600' };
    if (wpm >= 25 && accuracy >= 85) return { level: 'Beginner', color: 'text-yellow-600' };
    return { level: 'Learning', color: 'text-red-600' };
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Enhanced Typing Speed Test
        </h1>
        <p className="text-lg text-slate-600">
          Master your typing skills with 6-line paragraphs, real-time analytics, and comprehensive performance tracking.
        </p>
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-slate-600">
          <div className="flex items-center space-x-1">
            <Target className="h-4 w-4 text-green-600" />
            <span>Real-time WPM</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Accuracy Tracking</span>
          </div>
          <div className="flex items-center space-x-1">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <span>Performance Analytics</span>
          </div>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700">Test Duration:</label>
            <select
              value={timeLimit}
              onChange={(e) => {
                setTimeLimit(Number(e.target.value));
                setTimeLeft(Number(e.target.value));
              }}
              disabled={isActive}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700">Text Length:</label>
            <span className="text-sm text-slate-600">{text.split(' ').length} words</span>
          </div>
        </div>
      </div>

      {/* Live Stats Display */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <div className={`text-2xl font-bold ${getWPMColor(netWpm)}`}>{netWpm}</div>
          <div className="text-xs text-slate-600">Net WPM</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-700">{rawWpm}</div>
          <div className="text-xs text-slate-600">Raw WPM</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <div className={`text-2xl font-bold ${getAccuracyColor(accuracy)}`}>{accuracy}%</div>
          <div className="text-xs text-slate-600">Accuracy</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{correctChars}</div>
          <div className="text-xs text-slate-600">Correct</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{incorrectChars}</div>
          <div className="text-xs text-slate-600">Errors</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs text-slate-600">Remaining</div>
        </div>
      </div>

      {/* Typing Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
        {/* Text Display - FIXED: Proper vertical scrolling */}
        <div className="typing-box mb-6 p-6 bg-slate-50 rounded-lg font-mono text-lg leading-relaxed max-h-[200px] overflow-y-auto overflow-x-hidden" style={{ scrollBehavior: 'smooth', wordWrap: 'break-word' }}>
          {text.split('').map((char, index) => (
            <span
              key={index}
              className={`${getCharacterClass(index)} ${char === ' ' ? 'mr-1' : ''}`}
              style={{ display: 'inline-block', minWidth: char === ' ' ? '0.5em' : 'auto' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>

        {/* Progress Indicators */}
        <div className="mb-4 space-y-2">
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-300 progress-bar"
              style={{ width: `${(userInput.length / text.length) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{userInput.length} / {text.length} characters</span>
            <span>{Math.round((userInput.length / text.length) * 100)}% complete</span>
          </div>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={handleInputChange}
          disabled={endTime !== null}
          placeholder="Click here and start typing..."
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-lg disabled:bg-slate-100 form-input"
        />

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4 mt-6">
          <button
            onClick={resetTest}
            className="btn-secondary flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>New Text</span>
          </button>
          
          {!endTime && (
            <button
              onClick={isActive ? pauseTest : startTest}
              className="btn-primary flex items-center space-x-2"
            >
              {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isActive ? 'Pause' : 'Start'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 mb-6 text-center border border-green-200">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-yellow-600 mr-2" />
            <h2 className="text-2xl font-bold text-slate-900">Test Complete!</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className={`text-4xl font-bold ${getWPMColor(netWpm)}`}>{netWpm} WPM</div>
              <div className="text-slate-600">Net Speed</div>
              <div className="text-sm text-slate-500">({rawWpm} raw)</div>
            </div>
            <div>
              <div className={`text-4xl font-bold ${getAccuracyColor(accuracy)}`}>{accuracy}%</div>
              <div className="text-slate-600">Accuracy</div>
              <div className="text-sm text-slate-500">({correctChars}/{userInput.length})</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600">{incorrectChars}</div>
              <div className="text-slate-600">Errors</div>
              <div className="text-sm text-slate-500">Mistakes made</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900">{formatTime(timeElapsed)}</div>
              <div className="text-slate-600">Time Taken</div>
              <div className="text-sm text-slate-500">of {formatTime(timeLimit)}</div>
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="bg-white rounded-lg p-6 mb-4">
            <h3 className="font-semibold text-slate-900 mb-4">Performance Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-center mb-2">
                  <span className={`text-2xl font-bold ${getPerformanceLevel(netWpm, accuracy).color}`}>
                    {getPerformanceLevel(netWpm, accuracy).level}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  {netWpm >= 70 && accuracy >= 98 && (
                    <p className="text-purple-600 font-medium">🏆 Outstanding! You're in the top 1% of typists!</p>
                  )}
                  {netWpm >= 60 && netWpm < 70 && accuracy >= 95 && (
                    <p className="text-blue-600 font-medium">🎯 Excellent! You type faster than 90% of people!</p>
                  )}
                  {netWpm >= 40 && netWpm < 60 && accuracy >= 90 && (
                    <p className="text-green-600 font-medium">👍 Good job! You're above average. Keep practicing!</p>
                  )}
                  {netWpm >= 25 && netWpm < 40 && (
                    <p className="text-yellow-600 font-medium">📈 You're improving! Focus on accuracy first, then speed.</p>
                  )}
                  {netWpm < 25 && (
                    <p className="text-red-600 font-medium">💪 Keep practicing! Try to type without looking at the keyboard.</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Recommendations:</h4>
                <ul className="text-sm text-slate-600 space-y-1 text-left">
                  {accuracy < 95 && <li>• Focus on accuracy - slow down and type correctly</li>}
                  {netWpm < 40 && <li>• Practice touch typing without looking at keys</li>}
                  {incorrectChars > 5 && <li>• Take your time with difficult letter combinations</li>}
                  {netWpm >= 60 && <li>• Try longer tests to build endurance</li>}
                  <li>• Practice 15-30 minutes daily for consistent improvement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900">Recent Results</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testHistory.slice(0, 6).map((test, index) => (
              <div key={test.id} className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">
                    {new Date(test.completedAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-slate-500">{test.duration}s</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className={`font-bold ${getWPMColor(test.wpm)}`}>{test.wpm}</div>
                    <div className="text-xs text-slate-600">WPM</div>
                  </div>
                  <div>
                    <div className={`font-bold ${getAccuracyColor(test.accuracy)}`}>{test.accuracy}%</div>
                    <div className="text-xs text-slate-600">Acc</div>
                  </div>
                  <div>
                    <div className="font-bold text-red-600">{test.errors}</div>
                    <div className="text-xs text-slate-600">Err</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <Keyboard className="h-5 w-5 mr-2" />
          Typing Mastery Guide
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Speed Benchmarks:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <span className="text-red-600">10-25 WPM:</span> Beginner</li>
              <li>• <span className="text-yellow-600">25-40 WPM:</span> Average</li>
              <li>• <span className="text-green-600">40-60 WPM:</span> Good</li>
              <li>• <span className="text-blue-600">60-70 WPM:</span> Excellent</li>
              <li>• <span className="text-purple-600">70+ WPM:</span> Expert</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Technique Tips:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Keep fingers on home row (ASDF JKL;)</li>
              <li>• Use all ten fingers</li>
              <li>• Don't look at the keyboard</li>
              <li>• Maintain good posture</li>
              <li>• Type in rhythm, not bursts</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Practice Strategy:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Focus on accuracy before speed</li>
              <li>• Practice 15-30 minutes daily</li>
              <li>• Use proper finger placement</li>
              <li>• Take breaks to avoid fatigue</li>
              <li>• Practice difficult letter combinations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};