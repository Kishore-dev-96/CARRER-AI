// Enhanced Speech Recognition for Windows 11 ASUS VivoBook 14
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: SpeechGrammarList;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
    gc?: () => void;
  }
}

export class VoiceRecognition {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onTranscript: (transcript: string, isFinal: boolean) => void;
  private onError: (error: string) => void;
  private onStart: () => void;
  private onEnd: () => void;
  private retryCount = 0;
  private maxRetries = 3;
  private restartTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(callbacks: {
    onTranscript: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onStart: () => void;
    onEnd: () => void;
  }) {
    this.onTranscript = callbacks.onTranscript;
    this.onError = callbacks.onError;
    this.onStart = callbacks.onStart;
    this.onEnd = callbacks.onEnd;

    this.initializeRecognition();
  }

  private initializeRecognition() {
    try {
      // Check browser support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Windows 11 optimized settings
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        console.log('🎤 Voice recognition started successfully on Windows 11');
        this.isListening = true;
        this.retryCount = 0;
        this.onStart();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        try {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            this.onTranscript(finalTranscript, true);
          } else if (interimTranscript) {
            this.onTranscript(interimTranscript, false);
          }
        } catch (error) {
          console.error('Error processing speech result:', error);
          this.onError('Error processing speech. Please try again.');
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error on Windows 11:', event.error);
        
        if (event.error === 'no-speech' && this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`Retrying speech recognition (${this.retryCount}/${this.maxRetries})...`);
          
          this.restartTimeout = setTimeout(() => {
            if (this.recognition && !this.isListening) {
              try {
                this.recognition.start();
              } catch (error) {
                console.error('Failed to restart recognition:', error);
                this.onError('Failed to restart voice recognition. Please try again.');
              }
            }
          }, 1000);
        } else if (event.error === 'not-allowed') {
          this.onError('Microphone access denied. Please allow microphone permissions in your browser settings.');
        } else if (event.error === 'network') {
          this.onError('Network error. Please check your internet connection.');
        } else if (event.error === 'aborted') {
          console.log('Speech recognition stopped intentionally');
        } else {
          this.onError(`Voice recognition error: ${event.error}. Please refresh and try again.`);
        }
      };

      this.recognition.onend = () => {
        console.log('Voice recognition ended');
        this.isListening = false;
        this.onEnd();
      };

      this.isInitialized = true;
      console.log('✅ Voice recognition initialized successfully for Windows 11');

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      this.onError('Failed to initialize voice recognition. Please ensure you are using Chrome, Edge, or Safari browser.');
    }
  }

  start() {
    if (!this.isInitialized) {
      this.onError('Voice recognition not initialized. Please refresh the page.');
      return;
    }

    if (this.recognition && !this.isListening) {
      try {
        if (this.restartTimeout) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = null;
        }
        
        this.retryCount = 0;
        this.recognition.start();
        console.log('🎤 Starting voice recognition on Windows 11...');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        this.onError('Failed to start voice recognition. Please refresh the page and try again.');
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        if (this.restartTimeout) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = null;
        }
        
        this.recognition.stop();
        console.log('🛑 Stopping voice recognition...');
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
      }
    }
  }

  isActive() {
    return this.isListening;
  }

  cleanup() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.stop();
  }
}

export class TextToSpeech {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;
  private isInitialized = false;

  constructor() {
    this.synth = window.speechSynthesis;
    this.initializeVoices();
  }

  private initializeVoices() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      console.log(`Available voices on Windows 11: ${voices.length}`);
      
      // Prefer Windows 11 native voices
      this.voice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Microsoft') || voice.name.includes('Windows'))
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0] || null;
      
      if (this.voice) {
        console.log(`Selected Windows 11 voice: ${this.voice.name} (${this.voice.lang})`);
        this.isInitialized = true;
      }
    };

    loadVoices();

    if (!this.isInitialized) {
      this.synth.onvoiceschanged = () => {
        loadVoices();
      };
      
      setTimeout(() => {
        if (!this.isInitialized) {
          loadVoices();
        }
      }, 1000);
    }
  }

  speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onEnd?: () => void;
    onError?: (error: string) => void;
  } = {}) {
    if (!text.trim()) return;

    try {
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      if (this.voice) {
        utterance.voice = this.voice;
      }

      // Windows 11 optimized settings
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 0.8;

      utterance.onend = () => {
        console.log('Speech completed on Windows 11');
        options.onEnd?.();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        options.onError?.(`Speech error: ${event.error}`);
      };

      this.synth.speak(utterance);
      console.log(`Speaking on Windows 11: "${text.substring(0, 50)}..."`);
    } catch (error) {
      console.error('Failed to speak:', error);
      options.onError?.('Failed to speak text. Please try again.');
    }
  }

  stop() {
    try {
      this.synth.cancel();
    } catch (error) {
      console.error('Failed to stop speech:', error);
    }
  }

  isSpeaking() {
    return this.synth.speaking;
  }
}

// Enhanced voice analysis for Windows 11
export class VoiceAnalyzer {
  static analyzeTranscript(transcript: string, duration: number): {
    wordCount: number;
    grammarScore: number;
    fluencyScore: number;
    clarityScore: number;
    vocabularyScore: number;
    confidenceScore: number;
    overallScore: number;
    feedback: string;
  } {
    const words = transcript.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Grammar analysis
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);
    
    let grammarScore = 5;
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) grammarScore += 2;
    if (transcript.includes(',') || transcript.includes(';')) grammarScore += 1;
    if (!/\b(um|uh|like|you know)\b/gi.test(transcript)) grammarScore += 2;
    grammarScore = Math.min(10, grammarScore);
    
    // Fluency analysis
    let fluencyScore = Math.min(10, Math.max(1, wordCount / 20));
    const hesitations = (transcript.match(/\b(um|uh|er|ah)\b/gi) || []).length;
    fluencyScore = Math.max(1, fluencyScore - (hesitations * 0.5));
    
    // Clarity analysis
    let clarityScore = Math.min(10, Math.max(1, sentences.length * 1.5));
    if (transcript.length > 200) clarityScore += 1;
    if (transcript.includes('because') || transcript.includes('therefore')) clarityScore += 1;
    
    // Vocabulary analysis
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabularyDiversity = uniqueWords.size / Math.max(wordCount, 1);
    let vocabularyScore = Math.min(10, vocabularyDiversity * 12);
    
    // Confidence analysis (based on word choice and structure)
    let confidenceScore = 7;
    if (transcript.includes('I believe') || transcript.includes('I think')) confidenceScore += 1;
    if (transcript.includes('definitely') || transcript.includes('certainly')) confidenceScore += 1;
    if (hesitations < 3) confidenceScore += 1;
    confidenceScore = Math.min(10, confidenceScore);
    
    // Overall score
    const overallScore = (grammarScore + fluencyScore + clarityScore + vocabularyScore + confidenceScore) / 5;
    
    // Generate feedback
    const feedback = this.generateDetailedFeedback({
      wordCount,
      grammarScore,
      fluencyScore,
      clarityScore,
      vocabularyScore,
      confidenceScore,
      overallScore,
      duration
    });
    
    return {
      wordCount,
      grammarScore: Math.round(grammarScore * 10) / 10,
      fluencyScore: Math.round(fluencyScore * 10) / 10,
      clarityScore: Math.round(clarityScore * 10) / 10,
      vocabularyScore: Math.round(vocabularyScore * 10) / 10,
      confidenceScore: Math.round(confidenceScore * 10) / 10,
      overallScore: Math.round(overallScore * 10) / 10,
      feedback
    };
  }

  private static generateDetailedFeedback(analysis: any): string {
    const { wordCount, grammarScore, fluencyScore, clarityScore, vocabularyScore, confidenceScore, overallScore, duration } = analysis;
    
    let feedback = `**Interview Performance Analysis:**\n\n`;
    
    // Overall performance
    if (overallScore >= 8) {
      feedback += `🏆 **Excellent Performance!** You demonstrated strong interview skills.\n\n`;
    } else if (overallScore >= 6) {
      feedback += `👍 **Good Performance!** You're on the right track with room for improvement.\n\n`;
    } else {
      feedback += `📈 **Developing Performance.** Focus on the areas below to improve.\n\n`;
    }
    
    // Detailed analysis
    feedback += `**Detailed Breakdown:**\n`;
    feedback += `• **Word Count:** ${wordCount} words (Target: 300-500 words)\n`;
    feedback += `• **Speaking Duration:** ${Math.round(duration)}s\n`;
    feedback += `• **Speaking Rate:** ${Math.round((wordCount / duration) * 60)} words per minute\n\n`;
    
    // Specific feedback for each area
    feedback += `**Strengths:**\n`;
    if (grammarScore >= 7) feedback += `• Excellent grammar and sentence structure\n`;
    if (fluencyScore >= 7) feedback += `• Smooth and fluent delivery\n`;
    if (vocabularyScore >= 7) feedback += `• Rich and varied vocabulary usage\n`;
    if (confidenceScore >= 7) feedback += `• Confident and assertive communication\n`;
    
    feedback += `\n**Areas for Improvement:**\n`;
    if (grammarScore < 7) feedback += `• Work on grammar and sentence construction\n`;
    if (fluencyScore < 7) feedback += `• Reduce hesitations and improve flow\n`;
    if (vocabularyScore < 7) feedback += `• Use more diverse vocabulary\n`;
    if (confidenceScore < 7) feedback += `• Speak with more confidence and conviction\n`;
    if (wordCount < 200) feedback += `• Provide more comprehensive answers\n`;
    
    feedback += `\n**Next Steps:**\n`;
    feedback += `• Practice speaking for 3-5 minutes on various topics\n`;
    feedback += `• Record yourself and listen for areas of improvement\n`;
    feedback += `• Focus on clear articulation and steady pace\n`;
    feedback += `• Use specific examples to support your points\n`;
    
    return feedback;
  }
}

// Windows 11 optimized microphone testing
export class MicrophoneTest {
  static async testMicrophone(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🎤 Testing microphone on Windows 11 ASUS VivoBook 14...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Test audio levels
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      return new Promise((resolve) => {
        let testCount = 0;
        const testInterval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          
          testCount++;
          if (testCount > 10 || average > 10) {
            clearInterval(testInterval);
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
            
            if (average > 10) {
              resolve({ 
                success: true, 
                message: '✅ Microphone working perfectly! Audio levels detected.' 
              });
            } else {
              resolve({ 
                success: true, 
                message: '⚠️ Microphone connected but no audio detected. Please speak to test.' 
              });
            }
          }
        }, 100);
        
        // Timeout after 2 seconds
        setTimeout(() => {
          clearInterval(testInterval);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          resolve({ 
            success: true, 
            message: '✅ Microphone access granted. Ready for interview.' 
          });
        }, 2000);
      });
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return { 
            success: false, 
            message: '❌ Microphone access denied. Please allow microphone permissions in your browser.' 
          };
        } else if (error.name === 'NotFoundError') {
          return { 
            success: false, 
            message: '❌ No microphone found. Please connect a microphone and try again.' 
          };
        }
      }
      
      return { 
        success: false, 
        message: '❌ Microphone test failed. Please check your microphone settings.' 
      };
    }
  }
}