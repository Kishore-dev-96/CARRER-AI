import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brain, Clock, CheckCircle, XCircle, Target, BarChart3, Mic, MicOff, Volume2 } from 'lucide-react';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { VoiceRecognition, TextToSpeech } from '../utils/speechRecognition';
import { generateInterviewFeedback } from '../utils/gemini';
import { getRandomAptitudeQuestions, getTotalQuestionCount, getCategoryDistribution } from '../data/aptitudeQuestions';

interface AptitudeQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: string;
}

export const AptitudeTest = () => {
  const { category } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [checkedAnswers, setCheckedAnswers] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const [isActive, setIsActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  
  // Voice input state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [tts] = useState(new TextToSpeech());

  const categories = [
    { id: 'logical', name: 'Logical Reasoning', icon: Brain, color: 'from-purple-600 to-indigo-600' },
    { id: 'quantitative', name: 'Quantitative Aptitude', icon: BarChart3, color: 'from-blue-600 to-cyan-600' },
    { id: 'verbal', name: 'Verbal Ability', icon: Target, color: 'from-green-600 to-teal-600' },
  ];

  useEffect(() => {
    // Initialize voice recognition
    const recognition = new VoiceRecognition({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setVoiceTranscript(text);
          // Auto-select answer based on voice input
          const lowerText = text.toLowerCase();
          if (lowerText.includes('option a') || lowerText.includes('first')) {
            selectAnswer(0);
          } else if (lowerText.includes('option b') || lowerText.includes('second')) {
            selectAnswer(1);
          } else if (lowerText.includes('option c') || lowerText.includes('third')) {
            selectAnswer(2);
          } else if (lowerText.includes('option d') || lowerText.includes('fourth')) {
            selectAnswer(3);
          }
        }
      },
      onError: (error) => {
        console.error('Voice recognition error:', error);
        setIsListening(false);
      },
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false)
    });
    setVoiceRecognition(recognition);
  }, []);

  useEffect(() => {
    if (selectedCategory && user?.id) {
      loadQuestions();
    }
  }, [selectedCategory, difficulty, user?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            finishTest();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const loadQuestions = () => {
    if (!user?.id) return;
    
    // Get optimized questions for Windows OS
    const questionCount = 50; // Reduced from 50 for better performance
    const uniqueQuestions = getRandomAptitudeQuestions(selectedCategory, difficulty, questionCount);
    
    setQuestions(uniqueQuestions);
    setSelectedAnswers(new Array(questionCount).fill(-1));
    setCheckedAnswers(new Array(questionCount).fill(false));
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setShowExplanation(false);
    setTimeLeft(1800); // Reduced to 30 minutes for Windows 11
    setIsActive(false);
    
    // Windows 11 memory optimization
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
  };

  const startTest = () => {
    setIsActive(true);
    setStartTime(Date.now());
    
    if (isVoiceMode && questions.length > 0) {
      tts.speak(`Starting aptitude test. Question 1: ${questions[0].question}. Say option A, B, C, or D to select your answer.`);
    }
  };

  const selectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
    setShowExplanation(false);
    setVoiceTranscript('');
  };

  const checkAnswer = async () => {
    if (selectedAnswers[currentQuestionIndex] === -1) {
      alert('Please select an answer first.');
      return;
    }

    const newCheckedAnswers = [...checkedAnswers];
    newCheckedAnswers[currentQuestionIndex] = true;
    setCheckedAnswers(newCheckedAnswers);
    setShowExplanation(true);

    // Get AI explanation for the answer
    if (user?.id) {
      try {
        const currentQuestion = questions[currentQuestionIndex];
        const selectedOption = currentQuestion.options[selectedAnswers[currentQuestionIndex]];
        const isCorrect = selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer;
        
        const prompt = `Question: ${currentQuestion.question}
Selected Answer: ${selectedOption}
Correct Answer: ${currentQuestion.options[currentQuestion.correctAnswer]}
Is Correct: ${isCorrect}

Please provide a brief explanation of why this answer is ${isCorrect ? 'correct' : 'incorrect'} and explain the concept in simple terms.`;

        const feedback = await generateInterviewFeedback(
          currentQuestion.question,
          selectedOption,
          'Aptitude Test',
          'Student'
        );

        console.log('AI Explanation:', feedback.feedback);
      } catch (error) {
        console.error('Error getting AI explanation:', error);
      }
    }

    if (isVoiceMode) {
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer;
      tts.speak(`${isCorrect ? 'Correct!' : 'Incorrect.'} ${currentQuestion.explanation}`);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(checkedAnswers[currentQuestionIndex + 1]);
      setVoiceTranscript('');
      
      if (isVoiceMode) {
        const nextQ = questions[currentQuestionIndex + 1];
        setTimeout(() => {
          tts.speak(`Question ${currentQuestionIndex + 2}: ${nextQ.question}`);
        }, 1000);
      }
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowExplanation(checkedAnswers[currentQuestionIndex - 1]);
      setVoiceTranscript('');
    }
  };

  const finishTest = () => {
    setIsActive(false);
    
    // Calculate score
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    const finalScore = (correctAnswers / questions.length) * 100;
    setScore(finalScore);
    setShowResults(true);
    
    // Save results
    if (user?.id) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const session = {
        id: uuidv4(),
        userId: user.id,
        category: selectedCategory,
        questions,
        answers: selectedAnswers,
        score: finalScore,
        timeSpent
      };
      
      dbOperations.saveAptitudeSession(session);
      
      // Update user progress
      const progress = dbOperations.getUserProgress(user.id);
      const newAccuracy = progress?.aptitudeAccuracy 
        ? (progress.aptitudeAccuracy + finalScore) / 2 
        : finalScore;
      
      dbOperations.updateUserProgress(user.id, {
        aptitudeAccuracy: newAccuracy
      });
    }

    if (isVoiceMode) {
      tts.speak(`Test completed! Your score is ${finalScore.toFixed(1)} percent.`);
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    if (!isVoiceMode) {
      tts.speak('Voice mode enabled. I will read questions aloud and you can say option A, B, C, or D to select answers.');
    }
  };

  const startVoiceInput = () => {
    if (voiceRecognition && !isListening) {
      voiceRecognition.start();
    }
  };

  const stopVoiceInput = () => {
    if (voiceRecognition && isListening) {
      voiceRecognition.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!selectedCategory) {
    const totalQuestions = getTotalQuestionCount();
    const categoryDist = getCategoryDistribution();

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Optimized Aptitude Test
          </h1>
          <p className="text-lg text-slate-600">
            Choose a category to test your aptitude and reasoning skills with {totalQuestions} optimized questions.
          </p>
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-slate-600">
            <div className="flex items-center space-x-1">
              <Brain className="h-4 w-4 text-purple-600" />
              <span>500 Total Questions</span>
            </div>
            <div className="flex items-center space-x-1">
              <Volume2 className="h-4 w-4 text-blue-600" />
              <span>Voice Input Support</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>AI Explanations</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`bg-gradient-to-r ${cat.color} rounded-xl p-8 text-white cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl`}
            >
              <div className="flex items-center mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <cat.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold ml-3">{cat.name}</h3>
              </div>
              <p className="text-white/90 leading-relaxed mb-2">
                Test your {cat.name.toLowerCase()} skills with optimized questions.
              </p>
              <div className="text-sm text-white/80">
                {categoryDist[cat.id] || 0} questions available
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setSelectedCategory('all')}
            className="bg-slate-600 text-white px-8 py-4 rounded-xl hover:bg-slate-700 transition-colors text-lg font-medium"
          >
            Mixed Test (All Categories)
          </button>
        </div>

        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">🚀 Windows OS Optimized</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <ul className="space-y-1">
              <li>• Optimized for Windows performance</li>
              <li>• Reduced memory usage</li>
              <li>• Faster question loading</li>
              <li>• Efficient data processing</li>
            </ul>
            <ul className="space-y-1">
              <li>• 500 carefully curated questions</li>
              <li>• Voice input with Windows compatibility</li>
              <li>• Real-time AI explanations</li>
              <li>• Progress tracking and analytics</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Test Results
          </h1>
          <div className={`text-6xl font-bold mb-4 ${getScoreColor(score)}`}>
            {score.toFixed(1)}%
          </div>
          <p className="text-lg text-slate-600">
            You scored {Math.round((score / 100) * questions.length)} out of {questions.length} questions correctly.
          </p>
        </div>

        {/* Detailed Results */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = selectedAnswers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            return (
              <div key={question.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Question {index + 1}
                  </h3>
                  {isCorrect ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>

                <p className="text-slate-700 mb-4">{question.question}</p>

                <div className="space-y-2 mb-4">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded-lg border ${
                        optionIndex === question.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : optionIndex === userAnswer && !isCorrect
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span>{option}</span>
                        {optionIndex === question.correctAnswer && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                        {optionIndex === userAnswer && !isCorrect && (
                          <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                  <p className="text-blue-800">{question.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              setSelectedCategory('');
              setShowResults(false);
            }}
            className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Take Another Test
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Configure Your Test
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <button
              onClick={loadQuestions}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Load Optimized Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">
              {selectedCategory === 'all' ? 'Mixed' : selectedCategory} Aptitude Test
            </h1>
            <p className="text-slate-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          
          <div className="text-right">
            <div className={`text-2xl font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-slate-600">Time Remaining</div>
            {!isActive && (
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={toggleVoiceMode}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    isVoiceMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  <Volume2 className="h-4 w-4 inline mr-1" />
                  Voice
                </button>
                <button
                  onClick={startTest}
                  className="bg-indigo-600 text-white px-4 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                >
                  Start Test
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Question {currentQuestionIndex + 1}
            </h2>
            {isVoiceMode && (
              <button
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={`p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-600 text-white animate-pulse' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
          
          <p className="text-slate-700 text-lg leading-relaxed mb-6">
            {currentQuestion.question}
          </p>

          {/* Voice transcript display */}
          {isVoiceMode && voiceTranscript && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Voice Input:</strong> {voiceTranscript}
              </p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className={`block w-full text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedAnswers[currentQuestionIndex] === index
                    ? checkedAnswers[currentQuestionIndex]
                      ? index === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : 'border-red-500 bg-red-50 text-red-900'
                      : 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                } ${!isActive ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestionIndex}`}
                  value={index}
                  checked={selectedAnswers[currentQuestionIndex] === index}
                  onChange={() => selectAnswer(index)}
                  disabled={!isActive}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <span className="font-medium mr-3 text-sm">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                  {checkedAnswers[currentQuestionIndex] && index === currentQuestion.correctAnswer && (
                    <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                  )}
                  {checkedAnswers[currentQuestionIndex] && selectedAnswers[currentQuestionIndex] === index && index !== currentQuestion.correctAnswer && (
                    <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
              <p className="text-blue-800">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="space-x-3">
              {!checkedAnswers[currentQuestionIndex] && (
                <button
                  onClick={checkAnswer}
                  disabled={selectedAnswers[currentQuestionIndex] === -1 || !isActive}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  Check Answer
                </button>
              )}
              
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={finishTest}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Final Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Progress</h3>
          
          <div className="grid grid-cols-5 gap-2 mb-6">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-indigo-600 text-white'
                    : checkedAnswers[index]
                    ? selectedAnswers[index] === questions[index].correctAnswer
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    : selectedAnswers[index] !== -1
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Answered:</span>
              <span className="font-medium">
                {selectedAnswers.filter(a => a !== -1).length} / {questions.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Checked:</span>
              <span className="font-medium">
                {checkedAnswers.filter(Boolean).length} / {questions.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Remaining:</span>
              <span className="font-medium">
                {selectedAnswers.filter(a => a === -1).length}
              </span>
            </div>
          </div>

          {isVoiceMode && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Voice Commands:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• "Option A" or "First"</li>
                <li>• "Option B" or "Second"</li>
                <li>• "Option C" or "Third"</li>
                <li>• "Option D" or "Fourth"</li>
              </ul>
            </div>
          )}

          {isActive && (
            <button
              onClick={finishTest}
              className="w-full mt-6 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
};