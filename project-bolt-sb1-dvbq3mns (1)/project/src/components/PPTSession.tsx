import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Mic, MicOff, Play, Upload, FileText, Trophy, Clock, Volume2 } from 'lucide-react';
import { VoiceRecognition, TextToSpeech } from '../utils/speechRecognition';
import { generateVoiceAnalysis } from '../utils/gemini';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';

const PPT_TOPICS = [
  "The Future of Artificial Intelligence in Business",
  "Sustainable Business Practices for Modern Companies",
  "Digital Transformation in Healthcare Systems",
  "The Impact of Remote Work on Team Productivity",
  "Cybersecurity Challenges in the Digital Age",
  "Innovation Strategies in Renewable Energy",
  "The Role of Data Analytics in Strategic Decision Making",
  "Building Resilient Global Supply Chains",
  "Enhancing Customer Experience in the Digital Era",
  "Leadership Strategies During Times of Change",
  "The Evolution and Future of E-commerce",
  "Mental Health and Wellness in Modern Workplaces",
  "Blockchain Technology and Its Business Applications",
  "The Future of Education Technology and Learning",
  "Diversity and Inclusion in Modern Organizations"
];

export const PPTSession = () => {
  const { user } = useUser();
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [slides, setSlides] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState<{
    presentationScore: number;
    contentScore: number;
    deliveryScore: number;
    overallScore: number;
    feedback: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [tts] = useState(new TextToSpeech());
  const [step, setStep] = useState<'setup' | 'presentation' | 'results'>('setup');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [micError, setMicError] = useState('');

  useEffect(() => {
    initializeVoiceRecognition();
    getRandomTopic();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            finishPresentation(true); // Auto-submit
            return 0;
          }
          // Enable submit after 2 minutes (120 seconds)
          if (time <= 180 && !canSubmit) {
            setCanSubmit(true);
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, canSubmit]);

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

  const getRandomTopic = () => {
    const randomTopic = PPT_TOPICS[Math.floor(Math.random() * PPT_TOPICS.length)];
    setTopic(randomTopic);
  };

  const handleSlidesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const slideContents = Array.from(files).map((file, index) => 
      `Slide ${index + 1}: ${file.name}`
    );
    setSlides(slideContents);
  };

  const startPresentation = () => {
    const finalTopic = customTopic.trim() || topic;
    setTopic(finalTopic);
    setStep('presentation');
    setIsActive(true);
    setFinalTranscript('');
    setTranscript('');
    setFeedback(null);
    setAutoSubmitted(false);
    setWordCount(0);
    setCanSubmit(false);
    setMicError('');
    
    // Announce start
    tts.speak(`Begin your presentation on: ${finalTopic}. You have 5 minutes. You can submit after 2 minutes.`);
    
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

  const finishPresentation = async (autoSubmit = false) => {
    setIsActive(false);
    setAutoSubmitted(autoSubmit);
    
    if (voiceRecognition && isRecording) {
      voiceRecognition.stop();
    }

    const fullTranscript = (finalTranscript + ' ' + transcript).trim();

    if (!fullTranscript) {
      setMicError('No speech detected. Please try again.');
      setStep('setup');
      return;
    }

    setIsProcessing(true);

    try {
      // Use enhanced voice analysis for accurate scoring
      const analysis = await generateVoiceAnalysis(fullTranscript, topic, 'PPT');
      
      const scores = {
        presentationScore: analysis.fluencyScore,
        contentScore: analysis.vocabularyScore,
        deliveryScore: analysis.clarityScore,
        overallScore: analysis.overallScore,
        feedback: analysis.feedback
      };

      setFeedback(scores);
      setStep('results');

      // Save to database
      if (user?.id) {
        const session = {
          id: uuidv4(),
          userId: user.id,
          topic,
          slides,
          transcript: fullTranscript,
          wordCount,
          duration: 300 - timeLeft,
          presentationScore: scores.presentationScore,
          contentScore: scores.contentScore,
          deliveryScore: scores.deliveryScore,
          overallScore: scores.overallScore,
          feedback: scores.feedback,
          autoSubmitted: autoSubmit
        };

        dbOperations.savePPTSession(session);

        // Update user progress
        const progress = dbOperations.getUserProgress(user.id);
        const newAverage = progress?.pptAverageScore 
          ? (progress.pptAverageScore + scores.overallScore) / 2 
          : scores.overallScore;
        
        dbOperations.updateUserProgress(user.id, {
          pptAverageScore: newAverage,
          pptSessionsCompleted: (progress?.pptSessionsCompleted || 0) + 1
        });
        
        console.log('PPT session saved successfully');
      }
    } catch (error) {
      console.error('Error processing presentation:', error);
      // Provide fallback scoring
      const fallbackScore = Math.min(8, Math.max(3, wordCount / 50));
      setFeedback({
        presentationScore: fallbackScore,
        contentScore: fallbackScore,
        deliveryScore: fallbackScore,
        overallScore: fallbackScore,
        feedback: `Good presentation! Your response contained ${wordCount} words. Keep practicing to improve your presentation skills.`
      });
      setStep('results');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSession = () => {
    setStep('setup');
    setIsActive(false);
    setIsRecording(false);
    setTimeLeft(300);
    setTranscript('');
    setFinalTranscript('');
    setFeedback(null);
    setCustomTopic('');
    setSlides([]);
    setAutoSubmitted(false);
    setWordCount(0);
    setCanSubmit(false);
    setMicError('');
    getRandomTopic();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWordCountColor = (count: number) => {
    if (count >= 300) return 'text-green-600';
    if (count >= 200) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (step === 'setup') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            PPT Presentation Practice
          </h1>
          <p className="text-lg text-slate-600">
            Practice your presentation skills with AI-powered feedback on content and delivery.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          {micError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{micError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Presentation Topic
            </label>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="font-medium text-slate-900 mb-2">Suggested Topic:</p>
                <p className="text-slate-700">{topic}</p>
              </div>
              
              <div className="text-center text-sm text-slate-500">OR</div>
              
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Enter your own topic..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload Slides (Optional)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.jpg,.png"
                onChange={handleSlidesUpload}
                className="hidden"
                id="slides-upload"
              />
              <label htmlFor="slides-upload" className="cursor-pointer">
                {slides.length > 0 ? (
                  <div className="flex items-center justify-center space-x-2">
                    <FileText className="h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium text-slate-900">
                      {slides.length} slide(s) uploaded
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600 mb-2">Upload your presentation slides</p>
                    <p className="text-sm text-slate-500">PDF, PPT, PPTX, or images</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Presentation Guidelines:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You have 2-5 minutes for your presentation</li>
              <li>• Speak clearly and maintain good pace</li>
              <li>• Structure your content with introduction, body, and conclusion</li>
              <li>• Use examples and data to support your points</li>
              <li>• Submit button will be enabled after 2 minutes</li>
              <li>• Auto-submit will occur after 5 minutes</li>
              <li>• Target: 300-800 words for comprehensive coverage</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={getRandomTopic}
              className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors"
            >
              New Topic
            </button>
            <button
              onClick={startPresentation}
              className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Start Presentation</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'presentation') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Presentation Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Presenting</h2>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 mb-6">
                <p className="text-lg font-medium text-slate-800">{topic}</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className={`text-6xl font-bold mb-2 ${timeLeft <= 60 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-slate-600">Time Remaining</p>
              
              {/* Word Count */}
              <div className="mt-4">
                <div className={`text-2xl font-bold ${getWordCountColor(wordCount)}`}>
                  {wordCount} words
                </div>
                <p className="text-sm text-slate-500">Target: 300-800 words</p>
              </div>
            </div>

            {micError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{micError}</p>
              </div>
            )}

            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={isRecording ? stopRecording : () => voiceRecognition?.start()}
                disabled={!!micError}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  micError
                    ? 'bg-slate-400 cursor-not-allowed text-white'
                    : isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
              <p className="text-sm text-slate-600">
                {micError 
                  ? 'Microphone not available'
                  : isRecording 
                  ? 'Recording... Click to pause' 
                  : 'Click to resume recording'
                }
              </p>

              <button
                onClick={() => finishPresentation(false)}
                disabled={!canSubmit || !!micError}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  canSubmit && !micError
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {canSubmit ? 'Submit Presentation' : `Submit in ${formatTime(timeLeft - 180)}`}
              </button>
            </div>

            {slides.length > 0 && (
              <div className="mt-8">
                <h3 className="font-medium text-slate-900 mb-3">Your Slides:</h3>
                <div className="space-y-2">
                  {slides.map((slide, index) => (
                    <div key={index} className="p-2 bg-slate-50 rounded text-sm text-slate-600">
                      {slide}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    Your presentation will appear here in real-time as you speak...
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
                    {Math.round((wordCount / Math.max(300 - timeLeft, 1)) * 60)}
                  </div>
                  <div className="text-sm text-green-800">WPM</div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-slate-600">Analyzing your presentation...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results' && feedback) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Overall Score */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-yellow-600 mr-2" />
            <h2 className="text-2xl font-bold text-slate-900">
              Presentation Complete! {autoSubmitted && '(Auto-submitted)'}
            </h2>
          </div>
          
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(feedback.overallScore)}`}>
            {feedback.overallScore.toFixed(1)}/10
          </div>
          <p className="text-lg text-slate-600">Overall Performance</p>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div>Words spoken: <span className="font-bold">{wordCount}</span></div>
            <div>Duration: <span className="font-bold">{formatTime(300 - timeLeft)}</span></div>
          </div>
        </div>

        {/* Detailed Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(feedback.presentationScore)}`}>
              {feedback.presentationScore.toFixed(1)}
            </div>
            <p className="text-slate-600">Presentation Skills</p>
            <p className="text-xs text-slate-500 mt-1">Structure & Flow</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(feedback.contentScore)}`}>
              {feedback.contentScore.toFixed(1)}
            </div>
            <p className="text-slate-600">Content Quality</p>
            <p className="text-xs text-slate-500 mt-1">Relevance & Depth</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(feedback.deliveryScore)}`}>
              {feedback.deliveryScore.toFixed(1)}
            </div>
            <p className="text-slate-600">Delivery</p>
            <p className="text-xs text-slate-500 mt-1">Clarity & Pace</p>
          </div>
        </div>

        {/* Topic and Transcript */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Topic</h3>
          <p className="text-slate-700 bg-slate-50 p-3 rounded-lg mb-6">{topic}</p>
          
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Presentation</h3>
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
            New Presentation
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};