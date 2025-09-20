import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Play, Pause, SkipForward, CheckCircle, 
  Upload, FileText, Volume2, VolumeX, Trophy, Clock, AlertCircle, Loader, User, Bot
} from 'lucide-react';
import { VoiceRecognition, TextToSpeech } from '../utils/speechRecognition';
import { generateInterviewFeedback, generateInterviewQuestions } from '../utils/gemini';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface Question {
  id: string;
  text: string;
  category: string;
  expectedDuration: number;
}

interface InterviewAnswer {
  questionId: string;
  questionText: string;
  transcript: string;
  wordCount: number;
  duration: number;
  feedback: string;
  score: number;
  autoSubmitted: boolean;
}

export const VoiceInterview = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Core state
  const [step, setStep] = useState<'setup' | 'interview' | 'feedback'>('setup');
  const [jobRole, setJobRole] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeContent, setResumeContent] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [tts] = useState(new TextToSpeech());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  // Session state
  const [sessionId] = useState(uuidv4());
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(300);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Error handling
  const [microphoneError, setMicrophoneError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    initializeVoiceInterview();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQuestionActive && questionTimeLeft > 0) {
      interval = setInterval(() => {
        setQuestionTimeLeft(time => {
          if (time <= 1) {
            submitAnswer(true); // Auto-submit
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isQuestionActive, questionTimeLeft]);

  const initializeVoiceInterview = async () => {
    try {
      setIsInitializing(true);
      setMicrophoneError('');
      
      console.log('🚀 Initializing Voice Interview...');
      
      // Check browser support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setMicrophoneError('Speech recognition not supported. Please use Chrome, Edge, or Safari browser.');
        return;
      }
      
      // Initialize voice recognition
      const recognition = new VoiceRecognition({
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setFinalTranscript(prev => {
              const newTranscript = prev + ' ' + text;
              console.log('📝 Final transcript updated:', newTranscript.length, 'characters');
              return newTranscript;
            });
            setTranscript('');
          } else {
            setTranscript(text);
          }
        },
        onError: (error) => {
          console.error('Voice recognition error:', error);
          if (error.includes('not-allowed')) {
            setMicrophoneError('Please enable microphone access in your browser settings.');
          } else if (error.includes('network')) {
            setMicrophoneError('Network error. Please check your internet connection.');
          } else {
            setMicrophoneError('Voice recognition error. Please try again.');
          }
          setIsListening(false);
        },
        onStart: () => {
          console.log('🎤 Voice recording started');
          setIsListening(true);
          setMicrophoneError('');
          setQuestionStartTime(Date.now());
        },
        onEnd: () => {
          console.log('🛑 Voice recording ended');
          setIsListening(false);
        }
      });

      setVoiceRecognition(recognition);
      
      // Test microphone access
      await testMicrophoneAccess();
      
      console.log('✅ Voice Interview initialized successfully');
      
    } catch (error) {
      console.error('Voice interview initialization error:', error);
      setMicrophoneError('Failed to initialize voice recognition. Please refresh and try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const testMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      setMicrophoneError('✅ Microphone access granted. Ready for interview.');
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Microphone test error:', error);
      setHasPermission(false);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setMicrophoneError('Please enable microphone access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          setMicrophoneError('No microphone found. Please connect a microphone and try again.');
        } else {
          setMicrophoneError('Microphone test failed. Please check your microphone settings.');
        }
      }
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setResumeContent(content);
      console.log('📄 Resume uploaded and parsed');
    };
    reader.readAsText(file);
  };

  const startInterview = async () => {
    if (!jobRole.trim()) {
      setMicrophoneError('Please enter a job role');
      return;
    }

    if (!hasPermission) {
      setMicrophoneError('Please allow microphone access to start the voice interview.');
      return;
    }

    setIsProcessing(true);
    setMicrophoneError('');
    
    try {
      console.log('🚀 Starting interview for:', jobRole);
      
      // Generate interview questions
      let interviewQuestions: string[] = [];
      
      if (resumeContent) {
        // Resume-based questions
        const jobDescription = `Interview for ${jobRole} position. Resume content: ${resumeContent.substring(0, 500)}`;
        interviewQuestions = await generateInterviewQuestions(
          jobRole,
          jobDescription,
          'Mid-level',
          5
        );
      } else {
        // Generic HR questions
        interviewQuestions = await generateInterviewQuestions(
          jobRole,
          `Professional HR interview for ${jobRole} position focusing on behavioral and situational questions.`,
          'Mid-level',
          5
        );
      }

      const formattedQuestions: Question[] = interviewQuestions.map((q, index) => ({
        id: uuidv4(),
        text: q,
        category: index === 0 ? 'introduction' : index < 3 ? 'technical' : 'behavioral',
        expectedDuration: 300
      }));

      setQuestions(formattedQuestions);
      
      // Create interview session in database
      if (user?.id) {
        dbOperations.createInterviewSession({
          id: sessionId,
          userId: user.id,
          jobRole,
          questions: formattedQuestions
        });
      }

      setStep('interview');
      setIsQuestionActive(true);
      setQuestionTimeLeft(300);
      
      // Start with first question
      if (voiceEnabled && formattedQuestions.length > 0) {
        setTimeout(() => {
          tts.speak(`Welcome to your interview for ${jobRole}. Let's begin with the first question: ${formattedQuestions[0].text}`);
        }, 1000);
      }
      
      console.log('✅ Interview started successfully with', formattedQuestions.length, 'questions');
    } catch (error) {
      console.error('Error starting interview:', error);
      setMicrophoneError('Failed to generate interview questions. Please check your internet connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    if (voiceRecognition && !isListening && hasPermission) {
      setMicrophoneError('');
      setFinalTranscript('');
      setTranscript('');
      voiceRecognition.start();
    } else if (!hasPermission) {
      setMicrophoneError('Please enable microphone access in your browser settings.');
    }
  };

  const stopListening = () => {
    if (voiceRecognition && isListening) {
      voiceRecognition.stop();
    }
  };

  const submitAnswer = async (autoSubmit = false) => {
    const fullTranscript = (finalTranscript + ' ' + transcript).trim();
    
    if (!fullTranscript && !autoSubmit) {
      setMicrophoneError('Please provide an answer before submitting.');
      return;
    }

    setIsProcessing(true);
    setIsQuestionActive(false);
    
    if (voiceRecognition && isListening) {
      voiceRecognition.stop();
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const duration = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      console.log('📊 Analyzing answer for question:', currentQuestionIndex + 1);
      
      // Get AI feedback
      const aiFeedback = await generateInterviewFeedback(
        currentQuestion.text,
        fullTranscript,
        jobRole,
        'HR Interview'
      );

      const answer: InterviewAnswer = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        transcript: fullTranscript,
        wordCount: fullTranscript.split(' ').filter(word => word.length > 0).length,
        duration,
        feedback: aiFeedback.feedback,
        score: aiFeedback.rating,
        autoSubmitted: autoSubmit
      };

      setAnswers(prev => [...prev, answer]);

      // Save to database
      if (user?.id) {
        dbOperations.saveInterviewAnswer({
          id: uuidv4(),
          sessionId,
          questionId: currentQuestion.id,
          questionText: currentQuestion.text,
          transcript: fullTranscript,
          wordCount: answer.wordCount,
          duration,
          aiScore: aiFeedback.rating,
          aiFeedback: aiFeedback.feedback,
          autoSubmitted: autoSubmit
        });
      }

      console.log('✅ Answer saved successfully');

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setFinalTranscript('');
        setTranscript('');
        setQuestionTimeLeft(300);
        setIsQuestionActive(true);
        
        // Generate dynamic follow-up question
        const nextQuestion = questions[currentQuestionIndex + 1];
        if (voiceEnabled) {
          setTimeout(() => {
            const followUpIntro = currentQuestionIndex === 0 
              ? "Thank you for that introduction. Now, let's explore further. "
              : `Interesting perspective. Building on what you just shared, `;
            
            tts.speak(`${followUpIntro}${nextQuestion.text}`);
          }, 2000);
        }
      } else {
        // Interview completed
        finishInterview();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setMicrophoneError('Failed to process answer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const finishInterview = () => {
    setStep('feedback');
    
    // Calculate overall score
    const overallScore = answers.length > 0 
      ? answers.reduce((sum, answer) => sum + answer.score, 0) / answers.length 
      : 0;
    
    // Update database
    if (user?.id) {
      dbOperations.completeInterviewSession(sessionId, overallScore);
      
      // Update user progress
      const progress = dbOperations.getUserProgress(user.id);
      dbOperations.updateUserProgress(user.id, {
        interviewsCompleted: (progress?.interviewsCompleted || 0) + 1
      });
      
      console.log('✅ Interview completed and saved to dashboard');
    }
    
    if (voiceEnabled) {
      tts.speak(`Interview completed! Your overall performance score is ${overallScore.toFixed(1)} out of 10. Thank you for participating.`);
    }
  };

  const skipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setFinalTranscript('');
      setTranscript('');
      setQuestionTimeLeft(300);
      setIsQuestionActive(true);
      
      if (voiceEnabled) {
        const nextQuestion = questions[currentQuestionIndex + 1];
        setTimeout(() => {
          tts.speak(`Let's move to the next question: ${nextQuestion.text}`);
        }, 1000);
      }
    } else {
      finishInterview();
    }
  };

  const repeatQuestion = () => {
    if (voiceEnabled && questions[currentQuestionIndex]) {
      tts.speak(questions[currentQuestionIndex].text);
    }
  };

  const calculateOverallScore = () => {
    if (answers.length === 0) return 0;
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    return (totalScore / answers.length).toFixed(1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Setup Step
  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            AI Voice Interview Setup
          </h1>
          <p className="text-lg text-slate-600">
            Experience a real HR interview with AI-powered questions and live voice transcription.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          {microphoneError && (
            <div className={`p-4 rounded-lg border ${
              microphoneError.includes('✅') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p>{microphoneError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Role / Position *
            </label>
            <input
              type="text"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g., Frontend Developer, Product Manager, Data Scientist"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Microphone Test Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-blue-900">🎤 Microphone Test</h3>
                <p className="text-sm text-blue-800">Verify your microphone works before starting</p>
              </div>
              <button
                onClick={testMicrophoneAccess}
                disabled={isInitializing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex items-center space-x-2"
              >
                {isInitializing ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span>Test Microphone</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Resume (Optional - for personalized questions)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
              />
              {resumeFile ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium text-slate-900">{resumeFile.name}</span>
                  <span className="text-xs text-green-600">✓ Uploaded</span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 mb-2">Upload your resume for personalized questions</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {voiceEnabled ? <Volume2 className="h-5 w-5 text-slate-600" /> : <VolumeX className="h-5 w-5 text-slate-400" />}
              <span className="text-sm font-medium text-slate-700">AI Voice Questions</span>
            </div>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                voiceEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Interview Format:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 5 HR-style questions (behavioral + role-specific)</li>
              <li>• AI asks questions with voice synthesis</li>
              <li>• Your responses are transcribed in real-time</li>
              <li>• 5 minutes per question with auto-submit</li>
              <li>• Detailed AI feedback after each answer</li>
              <li>• Complete performance evaluation at the end</li>
            </ul>
          </div>

          <button
            onClick={startInterview}
            disabled={isProcessing || !jobRole.trim() || !hasPermission}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
          >
            {isProcessing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Generating Questions...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>Start Voice Interview</span>
              </>
            )}
          </button>
          
          {(!hasPermission || microphoneError.includes('Please')) && (
            <p className="text-sm text-red-600 text-center mt-2">
              {microphoneError || 'Please allow microphone access to start the voice interview.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Interview Step
  if (step === 'interview') {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const currentWordCount = (finalTranscript + ' ' + transcript).trim().split(' ').filter(word => word.length > 0).length;

    return (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{jobRole} Interview</h1>
              <p className="text-slate-600">AI-Powered Voice Interview with Real-Time Transcription</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Question</p>
              <p className="text-xl font-bold text-indigo-600">
                {currentQuestionIndex + 1} / {questions.length}
              </p>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Interview Question</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={repeatQuestion}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Repeat question"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
                <div className={`text-lg font-bold ${questionTimeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                  {formatTime(questionTimeLeft)}
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 mb-6 border border-indigo-200">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-slate-800 text-lg leading-relaxed font-medium">{currentQuestion?.text}</p>
              </div>
            </div>

            {microphoneError && !microphoneError.includes('✅') && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{microphoneError}</p>
              </div>
            )}

            {/* Voice Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing || !hasPermission}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    !hasPermission
                      ? 'bg-slate-400 cursor-not-allowed text-white'
                      : isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </button>
              </div>
              
              <p className="text-center text-sm text-slate-600">
                {!hasPermission
                  ? 'Please enable microphone access' 
                  : isListening 
                  ? 'Listening... Click to stop' 
                  : 'Click to start speaking'
                }
              </p>
              
              {!hasPermission && (
                <div className="text-center">
                  <button
                    onClick={testMicrophoneAccess}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Test Microphone Again
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => submitAnswer(false)}
                  disabled={!finalTranscript.trim() || isProcessing || !hasPermission}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={skipQuestion}
                  disabled={isProcessing}
                  className="px-4 py-3 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center space-x-2"
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Skip</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Transcript Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Your Response (Live Transcript)
            </h2>
            
            {/* Live Transcript Box */}
            <div className="min-h-[300px] p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4 overflow-y-auto">
              <div className="text-slate-700 leading-relaxed">
                {finalTranscript && (
                  <span className="text-slate-900">{finalTranscript}</span>
                )}
                {transcript && (
                  <span className="text-slate-500 italic"> {transcript}</span>
                )}
                {!finalTranscript && !transcript && (
                  <p className="text-slate-400 italic text-center mt-20">
                    Your spoken response will appear here in real-time as you speak...
                    <br />
                    <span className="text-sm">Click the microphone button to start recording</span>
                  </p>
                )}
              </div>
            </div>

            {/* Real-time Stats */}
            {(finalTranscript || transcript) && (
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{currentWordCount}</div>
                  <div className="text-sm text-blue-800">Words Spoken</div>
                  <div className="text-xs text-blue-600">Target: 300-500</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {formatTime(Math.floor((Date.now() - questionStartTime) / 1000))}
                  </div>
                  <div className="text-sm text-green-800">Speaking Time</div>
                  <div className="text-xs text-green-600">Max: 5:00</div>
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            <div className="space-y-3">
              <h3 className="font-medium text-slate-900">Interview Progress</h3>
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-3 rounded-lg border text-sm ${
                    index === currentQuestionIndex
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : index < currentQuestionIndex
                      ? 'border-green-300 bg-green-50 text-green-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Q{index + 1}: {question.category}
                    </span>
                    {index < currentQuestionIndex && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {index === currentQuestionIndex && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {answers.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-slate-900 mb-2">Current Performance</h3>
                <div className="text-2xl font-bold text-indigo-600">
                  {calculateOverallScore()}/10
                </div>
                <p className="text-sm text-slate-600">Average Score ({answers.length} questions completed)</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Feedback Step
  if (step === 'feedback') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-12 w-12 text-yellow-600 mr-3" />
            <h1 className="text-3xl font-bold text-slate-900">Interview Complete!</h1>
          </div>
          <p className="text-lg text-slate-600">
            Here's your comprehensive performance analysis and feedback.
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6 text-center">
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(parseFloat(calculateOverallScore()))}`}>
            {calculateOverallScore()}/10
          </div>
          <p className="text-xl text-slate-600">Overall Interview Performance</p>
          <div className="mt-4 text-sm text-slate-500">
            Based on {answers.length} questions • AI-Powered Analysis with Real-Time Transcription
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="space-y-6">
          {answers.map((answer, index) => (
            <div key={answer.questionId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Question {index + 1}
                  {answer.autoSubmitted && <span className="text-sm text-orange-600 ml-2">(Auto-submitted)</span>}
                </h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-slate-600 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {Math.floor(answer.duration / 60)}:{(answer.duration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-sm text-slate-600">
                    {answer.wordCount} words
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    answer.score >= 8 ? 'bg-green-100 text-green-800' :
                    answer.score >= 6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {answer.score.toFixed(1)}/10
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Question:</h4>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {answer.questionText}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Your Answer:</h4>
                  <div className="text-slate-700 bg-blue-50 p-3 rounded-lg">
                    <p className="mb-2">{answer.transcript}</p>
                    <div className="text-xs text-blue-600">
                      Words: {answer.wordCount} • 
                      Duration: {Math.floor(answer.duration / 60)}:{(answer.duration % 60).toString().padStart(2, '0')} •
                      WPM: {Math.round((answer.wordCount / answer.duration) * 60)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 mb-2">AI Feedback:</h4>
                  <div className="text-slate-700 bg-green-50 p-3 rounded-lg">
                    {answer.feedback.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-2 last:mb-0">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            View Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Start New Interview
          </button>
        </div>
      </div>
    );
  }

  return null;
};