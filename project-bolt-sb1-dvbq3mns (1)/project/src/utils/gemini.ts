import { GoogleGenerativeAI } from '@google/generative-ai';

// Windows 11 optimized Gemini configuration
const WINDOWS_11_CONFIG = {
  maxRetries: 2, // Reduced for faster response
  timeout: 15000, // 15 seconds timeout
  batchSize: 1, // Process one request at a time
  memoryLimit: 50 * 1024 * 1024 // 50MB memory limit
};

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateInterviewFeedback = async (
  question: string,
  userAnswer: string,
  jobRole: string,
  experience: string,
  retryCount = 0
): Promise<{ feedback: string; rating: number }> => {
  try {
    // Windows 11 memory check before API call
    if (typeof window !== 'undefined') {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.usedJSHeapSize > WINDOWS_11_CONFIG.memoryLimit) {
        console.log('🧹 Memory usage high, optimizing for Windows 11...');
        if (window.gc) window.gc();
      }
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      As an expert HR interviewer and career coach, please evaluate this interview response:
      
      Job Role: ${jobRole}
      Experience Level: ${experience}
      Question: ${question}
      Candidate's Answer: ${userAnswer}
      
      Please provide:
      1. Detailed feedback on the answer quality, relevance, and areas for improvement
      2. A numerical rating from 1-10 (where 10 is excellent)
      
      Evaluation Criteria:
      - Relevance and directness to the question (25%)
      - Communication clarity and structure (25%)
      - Content depth and examples (25%)
      - Professional confidence and delivery (25%)
      
      Format your response as:
      FEEDBACK: [Your detailed feedback here - be specific, constructive, and actionable]
      RATING: [Number from 1-10]
      
      Be encouraging but honest. Provide specific suggestions for improvement.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse feedback and rating
    const feedbackMatch = text.match(/FEEDBACK:\s*(.*?)(?=RATING:|$)/s);
    const ratingMatch = text.match(/RATING:\s*(\d+(?:\.\d+)?)/);

    const feedback = feedbackMatch ? feedbackMatch[1].trim() : text;
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 5;

    return { feedback, rating };
  } catch (error) {
    console.error('Error generating feedback:', error);
    
    // Retry logic
    if (retryCount < WINDOWS_11_CONFIG.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay for Windows 11
      return generateInterviewFeedback(question, userAnswer, jobRole, experience, retryCount + 1);
    }
    
    return {
      feedback: 'I apologize, but I\'m having trouble processing your response right now. Your answer shows good effort. Please try again or rephrase your response.',
      rating: 5
    };
  }
};

export const generateInterviewQuestions = async (
  jobRole: string,
  jobDescription: string,
  experience: string,
  count: number = 5,
  retryCount = 0
): Promise<string[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      Generate ${count} professional interview questions for:
      Job Role: ${jobRole}
      Job Description: ${jobDescription}
      Experience Level: ${experience}
      
      Create questions that are:
      - Professional and realistic (like a real HR interview)
      - Mix of behavioral, situational, and role-specific questions
      - Appropriate for the experience level
      - Progressive in complexity
      - Focused on assessing both technical competency and cultural fit
      
      Return exactly ${count} questions, one per line, without numbering.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse questions from the response
    const questions = text
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 10);

    // Ensure we have enough questions
    if (questions.length < count) {
      const fallbackQuestions = [
        "Tell me about yourself and your relevant experience.",
        "What interests you about this role and our company?",
        "Describe a challenging situation you've faced and how you handled it.",
        "What are your greatest strengths and how do they apply to this position?",
        "Where do you see yourself in the next few years?"
      ];
      questions.push(...fallbackQuestions.slice(0, count - questions.length));
    }

    return questions.slice(0, count);
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Retry logic
    if (retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateInterviewQuestions(jobRole, jobDescription, experience, count, retryCount + 1);
    }
    
    return [
      "Tell me about yourself and your relevant experience.",
      "What interests you about this role?",
      "Describe a challenging situation you've faced and how you handled it.",
      "What are your greatest strengths?",
      "Where do you see yourself in the next few years?"
    ];
  }
};

export const generateVoiceAnalysis = async (
  transcript: string,
  topic: string,
  type: 'JAM' | 'PPT' | 'Interview',
  retryCount = 0
): Promise<{
  wordCount: number;
  grammarScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  clarityScore: number;
  efficiency: number;
  overallScore: number;
  feedback: string;
}> => {
  try {
    // Windows 11 memory check before API call
    if (typeof window !== 'undefined') {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.usedJSHeapSize > WINDOWS_11_CONFIG.memoryLimit) {
        console.log('🧹 Memory usage high, optimizing...');
        if (window.gc) window.gc();
      }
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Enhanced analysis prompt for better scoring
    const prompt = `
      As an expert speech and communication coach, analyze this ${type} session transcript:
      
      Topic: ${topic}
      Transcript: ${transcript}
      Word Count: ${transcript.split(' ').length}
      Session Type: ${type}
      
      Provide detailed scoring (1-10 scale) for:
      
      1. **Grammar & Language Structure** (1-10):
         - Sentence construction and correctness
         - Proper use of tenses and grammar rules
         - Absence of grammatical errors
      
      2. **Fluency & Flow** (1-10):
         - Smooth delivery without hesitations
         - Natural pace and rhythm
         - Minimal use of filler words (um, uh, like)
      
      3. **Vocabulary & Word Choice** (1-10):
         - Variety and richness of vocabulary
         - Appropriate word selection for context
         - Use of advanced or professional terms
      
      4. **Clarity & Coherence** (1-10):
         - Clear pronunciation and articulation
         - Logical flow of ideas
         - Easy to understand and follow
      
      5. **Voice Efficiency** (1-10):
         - Effective use of speaking time
         - Comprehensive coverage of topic
         - Engaging and confident delivery
      
      6. **Overall Performance** (1-10):
         - Combined assessment of all factors
         - Professional communication standard
         - Interview readiness level
      
      Provide constructive feedback focusing on:
      - **Strengths**: What they did exceptionally well
      - **Areas for Improvement**: Specific weaknesses to address
      - **Actionable Suggestions**: Concrete steps for improvement
      - **Professional Assessment**: Interview readiness evaluation
      - **Practice Recommendations**: Targeted exercises for growth
      
      Format your response as:
      WORD_COUNT: [actual word count]
      GRAMMAR: [score]
      FLUENCY: [score]
      VOCABULARY: [score]
      CLARITY: [score]
      EFFICIENCY: [score]
      OVERALL: [score]
      FEEDBACK: [comprehensive detailed feedback with specific examples and recommendations]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse scores and feedback
    const wordCountMatch = text.match(/WORD_COUNT:\s*(\d+)/i);
    const grammarMatch = text.match(/GRAMMAR:\s*(\d+(?:\.\d+)?)/i);
    const fluencyMatch = text.match(/FLUENCY:\s*(\d+(?:\.\d+)?)/i);
    const vocabularyMatch = text.match(/VOCABULARY:\s*(\d+(?:\.\d+)?)/i);
    const clarityMatch = text.match(/CLARITY:\s*(\d+(?:\.\d+)?)/i);
    const efficiencyMatch = text.match(/EFFICIENCY:\s*(\d+(?:\.\d+)?)/i);
    const overallMatch = text.match(/OVERALL:\s*(\d+(?:\.\d+)?)/i);
    const feedbackMatch = text.match(/FEEDBACK:\s*(.*)/is);

    const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : transcript.split(' ').length;
    const grammarScore = grammarMatch ? parseFloat(grammarMatch[1]) : 5;
    const fluencyScore = fluencyMatch ? parseFloat(fluencyMatch[1]) : 5;
    const vocabularyScore = vocabularyMatch ? parseFloat(vocabularyMatch[1]) : 5;
    const clarityScore = clarityMatch ? parseFloat(clarityMatch[1]) : 5;
    const efficiency = efficiencyMatch ? parseFloat(efficiencyMatch[1]) : 5;
    const overallScore = overallMatch ? parseFloat(overallMatch[1]) : (grammarScore + fluencyScore + vocabularyScore + clarityScore + efficiency) / 5;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'Good effort! Keep practicing to improve your communication skills. Focus on speaking clearly and organizing your thoughts.';

    return {
      wordCount,
      grammarScore,
      fluencyScore,
      vocabularyScore,
      clarityScore,
      efficiency,
      overallScore,
      feedback
    };
  } catch (error) {
    console.error('Error generating voice analysis:', error);
    
    // Retry logic
    if (retryCount < WINDOWS_11_CONFIG.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateVoiceAnalysis(transcript, topic, type, retryCount + 1);
    }
    
    // Fallback scoring
    const wordCount = transcript.split(' ').length;
    const baseScore = Math.min(8, Math.max(3, wordCount / 25));
    
    // Basic analysis for fallback
    const hasGoodLength = wordCount >= 50;
    const hasVariety = new Set(transcript.toLowerCase().split(' ')).size / wordCount > 0.7;
    const grammarBonus = !/\b(um|uh|like|you know)\b/gi.test(transcript) ? 1 : 0;
    
    return {
      wordCount,
      grammarScore: baseScore + grammarBonus,
      fluencyScore: hasGoodLength ? baseScore + 1 : baseScore,
      vocabularyScore: hasVariety ? baseScore + 1 : baseScore,
      clarityScore: baseScore,
      efficiency: hasGoodLength ? baseScore + 0.5 : baseScore,
      overallScore: baseScore,
      feedback: `Good effort! Your response contained ${wordCount} words. ${hasGoodLength ? 'Good length for the topic.' : 'Try to speak more comprehensively.'} ${hasVariety ? 'Nice vocabulary variety.' : 'Use more diverse vocabulary.'} Keep practicing to improve your communication skills. Focus on speaking clearly, organizing your thoughts, and reducing filler words.`
    };
  }
};