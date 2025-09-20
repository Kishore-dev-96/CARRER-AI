import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Mic, MicOff, Play, RotateCcw, Trophy, Clock, Volume2 } from 'lucide-react';
import { VoiceRecognition, TextToSpeech } from '../utils/speechRecognition';
import { generateVoiceAnalysis } from '../utils/gemini';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';

const JAM_TOPICS = [
  "The impact of social media on modern communication",
  "Should remote work become the new normal?",
  "The role of artificial intelligence in education",
  "Climate change: Individual vs. corporate responsibility",
  "The future of electric vehicles",
  "Online learning vs. traditional classroom education",
  "The importance of mental health awareness",
  "Should cryptocurrency replace traditional currency?",
  "The influence of technology on human relationships",
  "Space exploration: Worth the investment?",
  "The gig economy: Opportunity or exploitation?",
  "Should social media platforms be regulated?",
  "The impact of streaming services on traditional media",
  "Renewable energy: The path to sustainability",
  "The role of youth in shaping the future",
  "Work-life balance in the digital age",
  "The ethics of genetic engineering",
  "Universal basic income: Solution or problem?",
  "The future of transportation",
  "Digital privacy in the modern world"
];

export const JAMSession = () => {
  const { user } = useUser();
  const [topic, setTopic] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState<{
    fluencyScore: number;
    grammarScore: number;
    vocabularyScore: number;
    overallScore: number;
    feedback: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [tts] = useState(new TextToSpeech());
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [micError, setMicError] = useState('');

  useEffect(() => {
    initializeVoiceRecognition();
    getRandomTopic();
    loadSessionHistory();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            finishSession(true); // Auto-submit
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const initializeVoiceRecognition = () => {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setMicError('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
        return;
      }

      const recognition = new VoiceRecognition({
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setFinalTranscript(prev => {
              const newTranscript = prev + ' ' + text;
              const words = newTranscript.trim().split(' ').filter(word => word.length > 0);
              setWordCount(words.length);
              return newTranscript;
            });
            setTranscript('');
          } else {
            setTranscript(text);
            // Update word count with interim results
            const currentText = finalTranscript + ' ' + text;
            const words = currentText.trim().split(' ').filter(word => word.length > 0);
            setWordCount(words.length);
          }
        },
        onError: (error) => {
          console.error('Voice recognition error:', error);
          if (error.includes('not-allowed')) {
            setMicError('Please enable microphone access in your browser settings.');
          } else if (error.includes('network')) {
            setMicError('Network error. Please check your internet connection.');
          } else {
            setMicError('Voice recognition error. Please try again.');
          }
          setIsRecording(false);
        },
        onStart: () => {
          setIsRecording(true);
          setMicError('');
        },
        onEnd: () => {
          setIsRecording(false);
        }
      });

      setVoiceRecognition(recognition);
    } catch (error) {
      console.error('Failed to initialize voice recognition:', error);
      setMicError('Failed to initialize voice recognition. Please refresh and try again.');
    }
  };

  const loadSessionHistory = () => {
    if (user?.id) {
      // Load recent JAM sessions from database
      setSessionHistory([]);
    }
  };

  const getRandomTopic = () => {
    const randomTopic = JAM_TOPICS[Math.floor(Math.random() * JAM_TOPICS.length)];
    setTopic(randomTopic);
  };

  const startSession = () => {
    setIsActive(true);
    setFinalTranscript('');
    setTranscript('');
    setFeedback(null);
    setAutoSubmitted(false);
    setWordCount(0);
    setMicError('');
    
    // Announce topic
    tts.speak(`Your JAM topic is: ${topic}. You have one minute starting now!`);
    
    // Start recording after announcement
    setTimeout(() => {
      if (voiceRecognition) {
        voiceRecognition.start();
      }
    }, 4000);
  };

  const stopRecording = () => {
    if (voiceRecognition && isRecording) {
      voiceRecognition.stop();
    }
  };

  const finishSession = async (autoSubmit = false) => {
    setIsActive(false);
    setAutoSubmitted(autoSubmit);
    
    if (voiceRecognition && isRecording) {
      voiceRecognition.stop();
    }

    const fullTranscript = (finalTranscript + ' ' + transcript).trim();

    if (!fullTranscript) {
      setMicError('No speech detected. Please try again.');
      resetSession();
      return;
    }

    setIsProcessing(true);

    try {
      // Use enhanced voice analysis for accurate scoring
      const analysis = await generateVoiceAnalysis(fullTranscript, topic, 'JAM');
      
      const scores = {
        fluencyScore: analysis.fluencyScore,
        grammarScore: analysis.grammarScore,
        vocabularyScore: analysis.vocabularyScore,
        overallScore: analysis.overallScore,
        feedback: analysis.feedback
      };

      setFeedback(scores);

      // Save to database
      if (user?.id) {
        const session = {
          id: uuidv4(),
          userId: user.id,
          topic,
          transcript: fullTranscript,
          wordCount,
          duration: 60 - timeLeft,
          fluencyScore: scores.fluencyScore,
          grammarScore: scores.grammarScore,
          vocabularyScore: scores.vocabularyScore,
          overallScore: scores.overallScore,
          feedback: scores.feedback,
          autoSubmitted: autoSubmit
        };

        dbOperations.saveJAMSession(session);

        // Update user progress
        const progress = dbOperations.getUserProgress(user.id);
        const newAverage = progress?.jamAverageScore 
          ? (progress.jamAverageScore + scores.overallScore) / 2 
          : scores.overallScore;
        
        dbOperations.updateUserProgress(user.id, {
          jamAverageScore: newAverage,
          jamSessionsCompleted: (progress?.jamSessionsCompleted || 0) + 1
        });
        
        console.log('JAM session saved successfully');
      }
    } catch (error) {
      console.error('Error processing JAM session:', error);
      // Provide fallback scoring
      const fallbackScore = Math.min(8, Math.max(3, wordCount / 25));
      setFeedback({
        fluencyScore: fallbackScore,
        grammarScore: fallbackScore,
        vocabularyScore: fallbackScore,
        overallScore: fallbackScore,
        feedback: `Good effort! Your response contained ${wordCount} words. Keep practicing to improve your communication skills.`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSession = () => {
    setIsActive(false);
    setIsRecording(false);
    setTimeLeft(60);
    setTranscript('');
    setFinalTranscript('');
    setFeedback(null);
    setAutoSubmitted(false);
    setWordCount(0);
    setMicError('');
    getRandomTopic();
  };

  const formatTime = (seconds: number) => {
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWordCountColor = (count: number) => {
    if (count >= 150) return 'text-green-600';
    if (count >= 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          JAM Session (Just A Minute)
        </h1>
        <p className="text-lg text-slate-600">
          Speak on the given topic for exactly one minute. Improve your fluency, vocabulary, and confidence.
        </p>
      </div>

      {!feedback ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Topic and Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Topic</h2>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                <p className="text-lg font-medium text-slate-800">{topic}</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className={`text-6xl font-bold mb-2 ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-slate-600">Time Remaining</p>
              
              {/* Word Count */}
              <div className="mt-4">
                <div className={`text-2xl font-bold ${getWordCountColor(wordCount)}`}>
                  {wordCount} words
                </div>
                <p className="text-sm text-slate-500">Target: 200+ words</p>
              </div>
            </div>

            {micError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{micError}</p>
              </div>
            )}

            <div className="flex flex-col items-center space-y-4">
              {!isActive ? (
                <>
                  <button
                    onClick={startSession}
                    disabled={!!micError}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors shadow-lg hover:shadow-xl ${
                      micError 
                        ? 'bg-slate-400 cursor-not-allowed text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <Play className="h-8 w-8 ml-1" />
                  </button>
                  <p className="text-sm text-slate-600">
                    {micError ? 'Microphone not available' : 'Click to start your JAM session'}
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={isRecording ? stopRecording : () => voiceRecognition?.start()}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                  </button>
                  <p className="text-sm text-slate-600">
                    {isRecording ? 'Recording... Click to pause' : 'Click to resume recording'}
                  </p>
                </>
              )}

              <button
                onClick={getRandomTopic}
                disabled={isActive}
                className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                <span>New Topic</span>
              </button>
            </div>
          </div>

          {/* Live Transcript */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Volume2 className="h-5 w-5 mr-2" />
              Live Transcript
            </h3>
            
            <div className="min-h-[400px] p-4 bg-slate-50 rounded-lg border overflow-y-auto">
              <div className="text-slate-700 leading-relaxed">
                {finalTranscript && (
                  <span className="text-slate-900">{finalTranscript}</span>
                )}
                {transcript && (
                  <span className="text-slate-500 italic"> {transcript}</span>
                )}
                {!finalTranscript && !transcript && (
                  <p className="text-slate-400 italic text-center mt-20">
                    Your speech will appear here in real-time as you speak...
                  </p>
                )}
              </div>
            </div>

            {/* Real-time Stats */}
            {(finalTranscript || transcript) && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{wordCount}</div>
                  <div className="text-sm text-blue-800">Words</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {Math.round((wordCount / Math.max(60 - timeLeft, 1)) * 60)}
                  </div>
                  <div className="text-sm text-green-800">WPM</div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-slate-600">Analyzing your performance...</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results */
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-yellow-600 mr-2" />
              <h2 className="text-2xl font-bold text-slate-900">
                JAM Session Complete! {autoSubmitted && '(Auto-submitted)'}
              </h2>
            </div>
            
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(feedback.overallScore)}`}>
              {feedback.overallScore.toFixed(1)}/10
            </div>
            <p className="text-lg text-slate-600">Overall Performance</p>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>Words spoken: <span className="font-bold">{wordCount}</span></div>
              <div>Duration: <span className="font-bold">{60 - timeLeft}s</span></div>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(feedback.fluencyScore)}`}>
                {feedback.fluencyScore.toFixed(1)}
              </div>
              <p className="text-slate-600">Fluency</p>
              <p className="text-xs text-slate-500 mt-1">Flow & Pace</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(feedback.grammarScore)}`}>
                {feedback.grammarScore.toFixed(1)}
              </div>
              <p className="text-slate-600">Grammar</p>
              <p className="text-xs text-slate-500 mt-1">Structure & Correctness</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(feedback.vocabularyScore)}`}>
                {feedback.vocabularyScore.toFixed(1)}
              </div>
              <p className="text-slate-600">Vocabulary</p>
              <p className="text-xs text-slate-500 mt-1">Word Choice & Variety</p>
            </div>
          </div>

          {/* Topic and Transcript */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Topic</h3>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg mb-6">{topic}</p>
            
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Speech</h3>
            <div className="text-slate-700 bg-blue-50 p-4 rounded-lg leading-relaxed">
              {finalTranscript}
            </div>
          </div>

          {/* AI Feedback */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">AI Feedback</h3>
            <div className="text-slate-700 bg-green-50 p-4 rounded-lg">
              {feedback.feedback.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={resetSession}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Another Topic
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">💡 JAM Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <ul className="space-y-1">
            <li>• Speak continuously for the full minute</li>
            <li>• Stay on topic throughout your speech</li>
            <li>• Use varied vocabulary and sentence structures</li>
            <li>• Aim for 200+ words per minute</li>
          </ul>
          <ul className="space-y-1">
            <li>• Maintain a steady pace and clear pronunciation</li>
            <li>• Avoid repetition and filler words (um, uh)</li>
            <li>• Practice regularly to build confidence</li>
            <li>• Think of examples and stories to support your points</li>
          </ul>
        </div>
      </div>
    </div>
  );
};