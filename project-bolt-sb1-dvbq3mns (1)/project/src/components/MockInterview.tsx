import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Clock, CheckCircle, Upload, FileText, 
  Mic, MicOff, SkipForward, Trophy, Target,
  Brain, Code, Keyboard, MessageSquare
} from 'lucide-react';
import { VoiceRecognition, TextToSpeech } from '../utils/speechRecognition';
import { WhisperService } from '../utils/whisper';
import { Judge0Service } from '../utils/judge0';
import { generateInterviewFeedback, generateInterviewQuestions, generateVoiceAnalysis } from '../utils/gemini';
import { YouTubeService } from '../utils/youtube';
import { ResumeParser } from '../utils/resumeParser';
import { getRandomAptitudeQuestions } from '../data/aptitudeQuestions';
import { getRandomCodingQuestions } from '../data/codingQuestions';
import { getRandomTypingText } from '../data/typingTexts';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface MockInterviewSession {
  id: string;
  userId: string;
  aptitudeScore: number;
  typingScore: number;
  codingScore: number;
  voiceScore: number;
  totalScore: number;
  completedAt?: string;
}

type InterviewStep = 'setup' | 'aptitude' | 'typing' | 'coding' | 'voice' | 'results';

export const MockInterview = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  // Session state
  const [currentStep, setCurrentStep] = useState<InterviewStep>('setup');
  const [sessionId] = useState(uuidv4());
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeContent, setResumeContent] = useState('');
  const [parsedResume, setParsedResume] = useState<any>(null);
  
  // Aptitude test state
  const [aptitudeQuestions, setAptitudeQuestions] = useState<any[]>([]);
  const [currentAptitudeIndex, setCurrentAptitudeIndex] = useState(0);
  const [aptitudeAnswers, setAptitudeAnswers] = useState<number[]>([]);
  const [aptitudeTimeLeft, setAptitudeTimeLeft] = useState(3600); // 1 hour
  const [aptitudeScore, setAptitudeScore] = useState(0);
  
  // Typing test state
  const [typingText, setTypingText] = useState('');
  const [typingInput, setTypingInput] = useState('');
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const [typingTimeLeft, setTypingTimeLeft] = useState(60); // 60 seconds
  const [typingWPM, setTypingWPM] = useState(0);
  const [typingAccuracy, setTypingAccuracy] = useState(100);
  const [typingScore, setTypingScore] = useState(0);
  const [typingActive, setTypingActive] = useState(false);
  
  // Coding test state
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [currentCodingIndex, setCurrentCodingIndex] = useState(0);
  const [codingCode, setCodingCode] = useState('');
  const [codingLanguage, setCodingLanguage] = useState('javascript');
  const [codingResults, setCodingResults] = useState<any[]>([]);
  const [codingScore, setCodingScore] = useState(0);
  
  // Voice interview state
  const [voiceQuestions, setVoiceQuestions] = useState<string[]>([]);
  const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [finalVoiceTranscript, setFinalVoiceTranscript] = useState('');
  const [voiceAnswers, setVoiceAnswers] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceScore, setVoiceScore] = useState(0);
  const [voiceQuestionStartTime, setVoiceQuestionStartTime] = useState<number>(0);
  const [voiceTimeLeft, setVoiceTimeLeft] = useState(300); // 5 minutes per question
  
  // Voice recognition
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [tts] = useState(new TextToSpeech());
  
  // Final results
  const [finalResults, setFinalResults] = useState<any>(null);
  const [youtubeRecommendations, setYoutubeRecommendations] = useState<any[]>([]);

  useEffect(() => {
    // Initialize voice recognition
    const recognition = new VoiceRecognition({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setFinalVoiceTranscript(prev => prev + ' ' + text);
          setVoiceTranscript('');
        } else {
          setVoiceTranscript(text);
        }
      },
      onError: (error) => {
        console.error('Voice recognition error:', error);
        setIsRecording(false);
      },
      onStart: () => {
        setIsRecording(true);
        setVoiceQuestionStartTime(Date.now());
      },
      onEnd: () => setIsRecording(false)
    });
    setVoiceRecognition(recognition);
  }, []);

  // Timer effects
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 'aptitude' && aptitudeTimeLeft > 0) {
      interval = setInterval(() => {
        setAptitudeTimeLeft(time => {
          if (time <= 1) {
            finishAptitudeTest();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, aptitudeTimeLeft]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (typingActive && typingTimeLeft > 0) {
      interval = setInterval(() => {
        setTypingTimeLeft(time => {
          if (time <= 1) {
            finishTypingTest();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [typingActive, typingTimeLeft]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 'voice' && voiceTimeLeft > 0 && isRecording) {
      interval = setInterval(() => {
        setVoiceTimeLeft(time => {
          if (time <= 1) {
            submitVoiceAnswer(true); // Auto-submit
            return 300; // Reset for next question
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, voiceTimeLeft, isRecording]);

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setResumeContent(content);
      
      try {
        const parsed = await ResumeParser.parseResumeText(content);
        setParsedResume(parsed);
      } catch (error) {
        console.error('Resume parsing error:', error);
      }
    };
    reader.readAsText(file);
  };

  const startMockInterview = async () => {
    if (!user?.id) return;
    
    // Create interview session
    dbOperations.createMockInterviewSession({
      id: sessionId,
      userId: user.id,
      resumeContent: resumeContent || null
    });
    
    // Load aptitude questions (50 questions)
    const questions = getRandomAptitudeQuestions(undefined, undefined, 50);
    setAptitudeQuestions(questions);
    setAptitudeAnswers(new Array(50).fill(-1));
    
    setCurrentStep('aptitude');
  };

  const selectAptitudeAnswer = (answerIndex: number) => {
    const newAnswers = [...aptitudeAnswers];
    newAnswers[currentAptitudeIndex] = answerIndex;
    setAptitudeAnswers(newAnswers);
  };

  const nextAptitudeQuestion = () => {
    if (currentAptitudeIndex < aptitudeQuestions.length - 1) {
      setCurrentAptitudeIndex(currentAptitudeIndex + 1);
    } else {
      finishAptitudeTest();
    }
  };

  const finishAptitudeTest = () => {
    let correct = 0;
    aptitudeQuestions.forEach((question, index) => {
      if (aptitudeAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    
    const score = (correct / aptitudeQuestions.length) * 100; // Max 100 points
    setAptitudeScore(score);
    
    // Move to typing test
    const text = getRandomTypingText();
    setTypingText(text);
    setCurrentStep('typing');
  };

  const startTypingTest = () => {
    setTypingStartTime(Date.now());
    setTypingActive(true);
  };

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (!typingStartTime) {
      startTypingTest();
    }
    
    setTypingInput(value);
    
    // Calculate WPM and accuracy in real-time
    if (typingStartTime) {
      const timeElapsed = (Date.now() - typingStartTime) / 1000 / 60; // minutes
      const wordsTyped = value.trim().split(' ').length;
      const wpm = Math.round(wordsTyped / timeElapsed);
      setTypingWPM(wpm);
      
      // Calculate accuracy
      let correct = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === typingText[i]) correct++;
      }
      const accuracy = value.length > 0 ? Math.round((correct / value.length) * 100) : 100;
      setTypingAccuracy(accuracy);
    }
  };

  const finishTypingTest = () => {
    setTypingActive(false);
    
    // Calculate typing score (max 20 points)
    const score = Math.min(20, (typingWPM * typingAccuracy) / 100 * 0.5);
    setTypingScore(score);
    
    // Load coding questions (2 questions)
    const questions = getRandomCodingQuestions('easy', undefined, undefined, 2);
    setCodingQuestions(questions);
    if (questions.length > 0) {
      setCodingCode(questions[0].starterCode[codingLanguage]);
    }
    
    setCurrentStep('coding');
  };

  const runCodingTest = async () => {
    if (!codingQuestions[currentCodingIndex]) return;
    
    try {
      const result = await Judge0Service.runTestCases(
        codingCode,
        codingLanguage,
        codingQuestions[currentCodingIndex].testCases
      );
      
      const newResults = [...codingResults];
      newResults[currentCodingIndex] = result;
      setCodingResults(newResults);
    } catch (error) {
      console.error('Coding test error:', error);
    }
  };

  const nextCodingQuestion = () => {
    if (currentCodingIndex < codingQuestions.length - 1) {
      setCurrentCodingIndex(currentCodingIndex + 1);
      setCodingCode(codingQuestions[currentCodingIndex + 1].starterCode[codingLanguage]);
    } else {
      finishCodingTest();
    }
  };

  const finishCodingTest = async () => {
    // Calculate coding score (max 100 points)
    let totalScore = 0;
    codingResults.forEach(result => {
      if (result) {
        totalScore += (result.passed / result.total) * 50; // 50 points per question
      }
    });
    setCodingScore(totalScore);
    
    // Generate voice interview questions
    let questions: string[] = [];
    
    if (parsedResume) {
      questions = await ResumeParser.generateResumeBasedQuestions(
        parsedResume,
        'Software Developer',
        8
      );
    } else {
      questions = await generateInterviewQuestions(
        'General Interview',
        'Standard interview questions',
        'Mid-level',
        8
      );
    }
    
    setVoiceQuestions(questions);
    setVoiceAnswers(new Array(8).fill(''));
    setCurrentStep('voice');
    
    // Start first question
    if (questions.length > 0) {
      tts.speak(`Let's begin the voice interview. ${questions[0]}`);
    }
  };

  const startVoiceRecording = () => {
    if (voiceRecognition) {
      setFinalVoiceTranscript('');
      setVoiceTranscript('');
      setVoiceTimeLeft(300); // Reset timer
      voiceRecognition.start();
    }
  };

  const stopVoiceRecording = () => {
    if (voiceRecognition) {
      voiceRecognition.stop();
    }
  };

  const submitVoiceAnswer = async (autoSubmit = false) => {
    const fullTranscript = (finalVoiceTranscript + ' ' + voiceTranscript).trim();
    
    if (!fullTranscript && !autoSubmit) {
      alert('Please provide an answer before submitting.');
      return;
    }

    const newAnswers = [...voiceAnswers];
    newAnswers[currentVoiceIndex] = fullTranscript;
    setVoiceAnswers(newAnswers);
    
    if (currentVoiceIndex < voiceQuestions.length - 1) {
      setCurrentVoiceIndex(currentVoiceIndex + 1);
      setFinalVoiceTranscript('');
      setVoiceTranscript('');
      setVoiceTimeLeft(300);
      
      // Ask next question
      const nextQuestion = voiceQuestions[currentVoiceIndex + 1];
      tts.speak(nextQuestion);
    } else {
      finishVoiceInterview();
    }
  };

  const finishVoiceInterview = async () => {
    // Calculate voice score using AI (max 80 points)
    let totalScore = 0;
    
    for (let i = 0; i < voiceQuestions.length; i++) {
      if (voiceAnswers[i]) {
        try {
          const analysis = await generateVoiceAnalysis(
            voiceAnswers[i],
            voiceQuestions[i],
            'Interview'
          );
          totalScore += analysis.overallScore;
        } catch (error) {
          console.error('Voice scoring error:', error);
        }
      }
    }
    
    const avgScore = totalScore / voiceQuestions.length;
    setVoiceScore(avgScore * 8); // Convert to 80 point scale
    
    // Generate final results
    await generateFinalResults();
  };

  const generateFinalResults = async () => {
    const totalScore = aptitudeScore + typingScore + codingScore + voiceScore;
    const passed = totalScore >= 270; // 90% of 300
    
    // Get YouTube recommendations for weak areas
    const recommendations = [];
    
    if (aptitudeScore < 70) {
      const videos = await YouTubeService.searchVideos('aptitude test preparation', 3);
      recommendations.push(...videos);
    }
    
    if (codingScore < 70) {
      const videos = await YouTubeService.searchVideos('coding interview preparation', 3);
      recommendations.push(...videos);
    }
    
    if (voiceScore < 56) { // 70% of 80
      const videos = await YouTubeService.searchVideos('interview communication skills', 3);
      recommendations.push(...videos);
    }
    
    setYoutubeRecommendations(recommendations);
    
    // Save final results
    const results = {
      aptitudeScore,
      typingScore,
      codingScore,
      voiceScore,
      totalScore,
      passed
    };
    
    setFinalResults(results);
    
    // Save to database
    if (user?.id) {
      dbOperations.saveMockInterviewResults({
        id: sessionId,
        userId: user.id,
        aptitudeScore,
        typingScore,
        codingScore,
        voiceScore,
        totalScore
      });
      
      // Update user progress
      const progress = dbOperations.getUserProgress(user.id);
      dbOperations.updateUserProgress(user.id, {
        interviewsCompleted: (progress?.interviewsCompleted || 0) + 1
      });
    }
    
    setCurrentStep('results');
    
    // Show confetti if passed
    if (passed) {
      // Trigger confetti animation
      setTimeout(() => {
        alert('🎉 Congratulations! You are eligible for real interviews!');
      }, 1000);
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

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (currentStep === 'setup') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Complete Mock Interview
          </h1>
          <p className="text-lg text-slate-600">
            A comprehensive 4-stage interview simulation: Aptitude → Typing → Coding → Voice Interview
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-900">Aptitude</h3>
              <p className="text-sm text-slate-600">50 questions</p>
              <p className="text-xs text-purple-600">100 points</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Keyboard className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-900">Typing</h3>
              <p className="text-sm text-slate-600">60 seconds</p>
              <p className="text-xs text-orange-600">20 points</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Code className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-900">Coding</h3>
              <p className="text-sm text-slate-600">2 problems</p>
              <p className="text-xs text-green-600">100 points</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-900">Voice</h3>
              <p className="text-sm text-slate-600">8 questions</p>
              <p className="text-xs text-blue-600">80 points</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload Resume (Optional - for personalized questions)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                {resumeFile ? (
                  <div className="flex items-center justify-center space-x-2">
                    <FileText className="h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium text-slate-900">{resumeFile.name}</span>
                    {parsedResume && (
                      <div className="ml-4 text-xs text-green-600">
                        ✓ Parsed: {parsedResume.skills?.length || 0} skills found
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600">Upload your resume for personalized questions</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">Important Instructions:</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Complete all 4 stages in sequence (no skipping allowed)</li>
              <li>• Aptitude test: 1 hour time limit (50 questions = 100 points)</li>
              <li>• Typing test: 60 seconds (WPM + accuracy = 20 points)</li>
              <li>• Coding test: 2 programming problems (100 points total)</li>
              <li>• Voice interview: 8 questions with AI analysis (80 points)</li>
              <li>• <strong>Total: 300 points | Pass: 270+ points (90%)</strong></li>
            </ul>
          </div>

          <button
            onClick={startMockInterview}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2 text-lg font-medium"
          >
            <Play className="h-5 w-5" />
            <span>Start Mock Interview</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'aptitude') {
    const currentQuestion = aptitudeQuestions[currentAptitudeIndex];
    const progress = ((currentAptitudeIndex + 1) / aptitudeQuestions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Aptitude Test</h1>
              <p className="text-slate-600">Question {currentAptitudeIndex + 1} of {aptitudeQuestions.length}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${aptitudeTimeLeft < 300 ? 'text-red-600' : 'text-slate-900'}`}>
                {formatTime(aptitudeTimeLeft)}
              </div>
              <div className="text-sm text-slate-600">Time Remaining</div>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {currentQuestion?.question}
          </h2>
          
          <div className="space-y-3 mb-8">
            {currentQuestion?.options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => selectAptitudeAnswer(index)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  aptitudeAnswers[currentAptitudeIndex] === index
                    ? 'border-purple-500 bg-purple-50 text-purple-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <span className="font-medium mr-3 text-sm">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentAptitudeIndex(Math.max(0, currentAptitudeIndex - 1))}
              disabled={currentAptitudeIndex === 0}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <button
              onClick={nextAptitudeQuestion}
              disabled={aptitudeAnswers[currentAptitudeIndex] === -1}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {currentAptitudeIndex === aptitudeQuestions.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'typing') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Typing Speed Test</h1>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{typingWPM}</div>
              <div className="text-sm text-slate-600">WPM</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{typingAccuracy}%</div>
              <div className="text-sm text-slate-600">Accuracy</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{typingInput.length}</div>
              <div className="text-sm text-slate-600">Characters</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{formatTime(typingTimeLeft)}</div>
              <div className="text-sm text-slate-600">Time Left</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="typing-box mb-6 p-6 bg-slate-50 rounded-lg font-mono text-lg leading-relaxed">
            {typingText.split('').map((char, index) => {
              let className = 'text-slate-600';
              if (index < typingInput.length) {
                className = typingInput[index] === char 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-red-200 text-red-800';
              } else if (index === typingInput.length) {
                className = 'bg-blue-200 text-blue-800 animate-pulse';
              }
              
              return (
                <span key={index} className={className}>
                  {char}
                </span>
              );
            })}
          </div>

          <input
            type="text"
            value={typingInput}
            onChange={handleTypingInput}
            placeholder="Start typing here..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-lg"
            autoFocus
            disabled={!typingActive && typingTimeLeft === 0}
          />

          <div className="mt-6 text-center">
            {!typingActive && typingTimeLeft > 0 && (
              <button
                onClick={startTypingTest}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
              >
                Start Typing Test
              </button>
            )}
            
            {typingActive && (
              <button
                onClick={finishTypingTest}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
              >
                Finish Early
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'coding') {
    const currentQuestion = codingQuestions[currentCodingIndex];
    const currentResult = codingResults[currentCodingIndex];

    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{currentQuestion?.title}</h1>
              <p className="text-slate-600">Problem {currentCodingIndex + 1} of {codingQuestions.length}</p>
            </div>
            <div className="text-sm text-slate-600">
              Difficulty: <span className="font-medium capitalize">{currentQuestion?.difficulty}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Problem Description</h2>
            <div className="prose prose-slate max-w-none mb-6">
              <div className="whitespace-pre-wrap text-slate-700">
                {currentQuestion?.description}
              </div>
            </div>

            {/* Test Cases */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-slate-900">Example Test Cases:</h3>
              {currentQuestion?.testCases
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

            {currentResult && (
              <div className="p-4 rounded-lg border">
                <h3 className="font-semibold mb-2">Test Results:</h3>
                <p className="text-lg mb-2">
                  Passed: {currentResult.passed} / {currentResult.total}
                </p>
                <div className="space-y-2">
                  {currentResult.results.map((result: any, index: number) => (
                    <div key={index} className={`p-2 rounded text-sm ${
                      result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      Test {index + 1}: {result.passed ? '✓ Passed' : '✗ Failed'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Code Editor</h2>
              <select
                value={codingLanguage}
                onChange={(e) => setCodingLanguage(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded text-sm"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>
            </div>

            <textarea
              value={codingCode}
              onChange={(e) => setCodingCode(e.target.value)}
              className="w-full h-64 p-4 border border-slate-300 rounded-lg font-mono text-sm"
              placeholder="Write your code here..."
            />

            <div className="flex space-x-3 mt-4">
              <button
                onClick={runCodingTest}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700"
              >
                Run Tests
              </button>
              <button
                onClick={nextCodingQuestion}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
              >
                {currentCodingIndex === codingQuestions.length - 1 ? 'Continue to Voice' : 'Next Problem'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'voice') {
    const currentQuestion = voiceQuestions[currentVoiceIndex];
    const progress = ((currentVoiceIndex + 1) / voiceQuestions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Voice Interview</h1>
              <p className="text-slate-600">Question {currentVoiceIndex + 1} of {voiceQuestions.length}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${voiceTimeLeft < 60 ? 'text-red-600' : 'text-slate-900'}`}>
                {formatTime(voiceTimeLeft)}
              </div>
              <div className="text-sm text-slate-600">Time Remaining</div>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Interview Question:</h2>
              <p className="text-slate-800 text-lg">{currentQuestion}</p>
            </div>

            <div className="text-center mb-6">
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse recording-indicator'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
              <p className="text-sm text-slate-600 mt-2">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => submitVoiceAnswer(false)}
                disabled={!finalVoiceTranscript.trim()}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {currentVoiceIndex === voiceQuestions.length - 1 ? 'Finish Interview' : 'Next Question'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Live Transcript</h3>
            
            <div className="transcript-box">
              <div className="transcript-text">
                {finalVoiceTranscript && (
                  <span className="text-slate-900">{finalVoiceTranscript}</span>
                )}
                {voiceTranscript && (
                  <span className="transcript-interim"> {voiceTranscript}</span>
                )}
                {!finalVoiceTranscript && !voiceTranscript && (
                  <p className="text-slate-400 italic text-center mt-20">
                    Your spoken response will appear here in real-time...
                  </p>
                )}
              </div>
            </div>

            {(finalVoiceTranscript || voiceTranscript) && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {(finalVoiceTranscript + ' ' + voiceTranscript).trim().split(' ').filter(word => word.length > 0).length}
                  </div>
                  <div className="text-sm text-blue-800">Words</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {formatTime(Math.floor((Date.now() - voiceQuestionStartTime) / 1000))}
                  </div>
                  <div className="text-sm text-green-800">Speaking Time</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'results' && finalResults) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-yellow-600 mr-2" />
            <h1 className="text-3xl font-bold text-slate-900">Mock Interview Complete!</h1>
          </div>
          
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(finalResults.totalScore, 300)}`}>
            {finalResults.totalScore.toFixed(1)}/300
          </div>
          <p className="text-lg text-slate-600">Overall Performance</p>
          
          {finalResults.passed && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                🎉 Congratulations! You are eligible for real interviews!
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getScoreColor(aptitudeScore, 100)}`}>
              {aptitudeScore.toFixed(1)}/100
            </div>
            <p className="text-slate-600">Aptitude</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <Keyboard className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getScoreColor(typingScore, 20)}`}>
              {typingScore.toFixed(1)}/20
            </div>
            <p className="text-slate-600">Typing</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <Code className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getScoreColor(codingScore, 100)}`}>
              {codingScore.toFixed(1)}/100
            </div>
            <p className="text-slate-600">Coding</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getScoreColor(voiceScore, 80)}`}>
              {voiceScore.toFixed(1)}/80
            </div>
            <p className="text-slate-600">Voice</p>
          </div>
        </div>

        {youtubeRecommendations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recommended Learning Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {youtubeRecommendations.map((video, index) => (
                <a
                  key={index}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                  <h3 className="font-medium text-slate-900 text-sm line-clamp-2">
                    {video.title}
                  </h3>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700"
          >
            Take Another Interview
          </button>
        </div>
      </div>
    );
  }

  return null;
};