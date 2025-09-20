import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Send, Bot, User, Loader, Code, FileText, MessageSquare, HelpCircle, Lightbulb, BookOpen, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { generateInterviewFeedback } from '../utils/gemini';
import { dbOperations } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageType?: string;
  rating?: number;
}

export const AICoach = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your **AI Coach** - your personal tutor and career preparation assistant! 🚀

I can help you with:

**📚 Academic & Learning:**
• **Coding Problems** - Algorithms, data structures, debugging, best practices
• **Aptitude Questions** - Logical reasoning, quantitative, verbal ability
• **Interview Preparation** - Technical, behavioral, HR questions
• **Resume Review** - Writing tips, ATS optimization, formatting

**💼 Career Guidance:**
• **Job Search Strategy** - Industry insights, company research
• **Skill Development** - Learning paths, technology trends
• **Communication Skills** - Presentation, public speaking, confidence

**🔧 Technical Help:**
• **Programming Languages** - Python, JavaScript, Java, C++, and more
• **Web Development** - Frontend, backend, full-stack guidance
• **Database Design** - SQL, NoSQL, optimization
• **System Design** - Architecture, scalability, best practices

**📖 General Knowledge:**
• **Mathematics & Science** - Concepts, problem-solving
• **Business & Finance** - Fundamentals, analysis
• **Current Affairs** - Technology trends, industry news

Just ask me anything! I'll explain concepts in **simple, easy-to-understand language** with examples and step-by-step guidance. 

What would you like to learn about today? 🤔`,
      timestamp: new Date(),
      messageType: 'welcome'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    {
      icon: Code,
      title: 'Coding Help',
      prompt: 'I need help with coding. Can you explain algorithms and data structures with simple examples?',
      color: 'from-green-500 to-emerald-500',
      category: 'coding'
    },
    {
      icon: FileText,
      title: 'Resume Review',
      prompt: 'Can you help me improve my resume? I want to make it more attractive to employers and ATS-friendly.',
      color: 'from-blue-500 to-cyan-500',
      category: 'resume'
    },
    {
      icon: MessageSquare,
      title: 'Interview Prep',
      prompt: 'Help me prepare for technical and behavioral interview questions. What should I focus on?',
      color: 'from-purple-500 to-violet-500',
      category: 'interview'
    },
    {
      icon: HelpCircle,
      title: 'Aptitude Help',
      prompt: 'I need help with aptitude test concepts. Can you explain logical reasoning and quantitative problems?',
      color: 'from-orange-500 to-red-500',
      category: 'aptitude'
    },
    {
      icon: Lightbulb,
      title: 'Career Advice',
      prompt: 'I need career guidance and advice on professional development. What skills should I focus on?',
      color: 'from-yellow-500 to-orange-500',
      category: 'career'
    },
    {
      icon: BookOpen,
      title: 'Study Plan',
      prompt: 'Can you create a personalized study plan for my interview preparation and skill development?',
      color: 'from-indigo-500 to-purple-500',
      category: 'study'
    }
  ];

  const detectMessageType = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('code') || lowerMessage.includes('programming') || lowerMessage.includes('algorithm')) {
      return 'coding';
    } else if (lowerMessage.includes('resume') || lowerMessage.includes('cv')) {
      return 'resume';
    } else if (lowerMessage.includes('interview') || lowerMessage.includes('behavioral')) {
      return 'interview';
    } else if (lowerMessage.includes('aptitude') || lowerMessage.includes('logical') || lowerMessage.includes('quantitative')) {
      return 'aptitude';
    } else if (lowerMessage.includes('career') || lowerMessage.includes('job') || lowerMessage.includes('professional')) {
      return 'career';
    } else if (lowerMessage.includes('study') || lowerMessage.includes('learn') || lowerMessage.includes('plan')) {
      return 'study';
    }
    
    return 'general';
  };

  const handleSendMessage = async (messageText?: string) => {
    const messageContent = messageText || input.trim();
    if (!messageContent || isLoading) return;

    const messageType = detectMessageType(messageContent);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      messageType
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Enhanced AI Coach prompt for comprehensive assistance
      const coachPrompt = `You are an expert AI Career Coach, Tutor, and Interview Preparation Assistant. You have deep knowledge in:

**Technical Skills:**
- Programming & Software Development (all languages, frameworks, algorithms, data structures)
- Web Development (Frontend, Backend, Full-stack, DevOps)
- Database Design & Management (SQL, NoSQL, optimization)
- System Design & Architecture (scalability, microservices, cloud)

**Career Development:**
- Interview Preparation (technical, behavioral, HR, system design)
- Resume Writing & Career Guidance (ATS optimization, industry best practices)
- Job Search Strategy (networking, company research, salary negotiation)
- Professional Communication (presentation skills, confidence building)

**Academic Support:**
- Aptitude Tests (logical reasoning, quantitative, verbal, analytical)
- Mathematics & Science (concepts, problem-solving, applications)
- Business & Finance (fundamentals, analysis, strategy)
- General Knowledge & Current Affairs

**Teaching Style:**
- Use **simple, easy-to-understand language**
- Provide **step-by-step explanations** with examples
- Use **real-world analogies** to explain complex concepts
- Format responses with **clear structure** using headings and bullet points
- Be **encouraging and supportive** while being practical
- Give **actionable advice** that users can implement immediately

User's question (Category: ${messageType}): "${messageContent}"

Please provide a comprehensive, helpful, and well-structured response. Use markdown formatting with:
- **Bold text** for important concepts
- Bullet points for lists
- Numbered steps for processes
- Code blocks for technical examples
- Clear headings for different sections

Make your response engaging, practical, and easy to follow. If the question is unclear, ask clarifying questions to better help the user.`;

      let responseText = '';
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Windows 11 optimized Gemini API call
          console.log('🤖 Calling Gemini API on Windows 11...');
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          // Windows 11 memory check before API call
          if (typeof window !== 'undefined') {
            const memoryInfo = (performance as any).memory;
            if (memoryInfo && memoryInfo.usedJSHeapSize > 50000000) {
              console.log('🧹 Optimizing memory for Windows 11 before API call...');
              if (window.gc) window.gc();
            }
          }

          const result = await model.generateContent(coachPrompt);
          const aiResponse = await result.response;
          responseText = aiResponse.text();
          
          if (responseText && responseText.trim().length > 0) {
            console.log('✅ Gemini API response received on Windows 11');
            break; // Success, exit retry loop
          }
        } catch (error) {
          console.error(`❌ Gemini attempt ${retryCount + 1} failed on Windows 11:`, error);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            // Enhanced fallback response based on message type
            responseText = generateFallbackResponse(messageContent, messageType);
          } else {
            // Windows 11 optimized retry delay
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        messageType
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save chat history to database
      if (user?.id) {
        dbOperations.saveAIChatHistory({
          id: uuidv4(),
          userId: user.id,
          userMessage: messageContent,
          aiResponse: responseText,
          messageType
        });
      }
    } catch (error) {
      console.error('AI Coach error:', error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: generateFallbackResponse(messageContent, messageType),
        timestamp: new Date(),
        messageType: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (question: string, type: string): string => {
    const responses = {
      coding: `**🔧 Coding Help Available!**

I'm here to help with your coding question: "${question}"

**Common Coding Topics I Can Help With:**
• **Algorithms & Data Structures** - Arrays, linked lists, trees, graphs, sorting, searching
• **Programming Languages** - Python, JavaScript, Java, C++, C#, and more
• **Web Development** - HTML, CSS, JavaScript, React, Node.js, databases
• **Problem Solving** - Breaking down complex problems, debugging techniques
• **Best Practices** - Clean code, design patterns, testing

**How to Get Better Help:**
1. **Be specific** - What programming language are you using?
2. **Share your code** - I can help debug and optimize
3. **Explain the problem** - What are you trying to achieve?
4. **Mention errors** - Any error messages you're seeing?

Please rephrase your question with more details, and I'll provide step-by-step guidance! 💻`,

      resume: `**📄 Resume Review & Career Guidance**

I'd love to help improve your resume: "${question}"

**Key Resume Areas I Can Help With:**
• **ATS Optimization** - Keywords, formatting, structure
• **Content Writing** - Professional summaries, experience descriptions
• **Skills Section** - Technical and soft skills presentation
• **Achievement Highlighting** - Quantifying your impact
• **Industry-Specific Tips** - Tailoring for your target role

**For Better Assistance:**
1. **Share your target role** - What position are you applying for?
2. **Current experience level** - Entry, mid-level, or senior?
3. **Industry focus** - Tech, finance, healthcare, etc.
4. **Specific concerns** - What part of your resume needs work?

Feel free to share specific sections or ask about resume best practices! 🚀`,

      interview: `**🎯 Interview Preparation Support**

I'm ready to help with your interview prep: "${question}"

**Interview Areas I Cover:**
• **Technical Interviews** - Coding challenges, system design, algorithms
• **Behavioral Questions** - STAR method, leadership examples, teamwork
• **HR Interviews** - Company research, salary negotiation, culture fit
• **Mock Interviews** - Practice questions and feedback
• **Communication Skills** - Confidence building, clear articulation

**To Provide Better Help:**
1. **Interview type** - Technical, behavioral, or general HR?
2. **Job role** - What position are you interviewing for?
3. **Company size** - Startup, mid-size, or large corporation?
4. **Experience level** - How many years of experience do you have?

Let me know what specific aspect you'd like to focus on! 💼`,

      aptitude: `**🧠 Aptitude Test Mastery**

I can definitely help with aptitude concepts: "${question}"

**Aptitude Areas I Cover:**
• **Logical Reasoning** - Patterns, sequences, analogies, syllogisms
• **Quantitative Aptitude** - Arithmetic, algebra, geometry, data interpretation
• **Verbal Ability** - Reading comprehension, grammar, vocabulary
• **Analytical Reasoning** - Problem-solving, critical thinking

**Study Approach:**
1. **Identify weak areas** - Which topics need more practice?
2. **Learn concepts first** - Understand the fundamentals
3. **Practice regularly** - Solve problems daily
4. **Time management** - Practice with time limits
5. **Review mistakes** - Learn from incorrect answers

**Quick Tips:**
• Start with easier problems and gradually increase difficulty
• Use elimination techniques for multiple choice questions
• Practice mental math for faster calculations

What specific aptitude topic would you like to focus on? 📊`,

      career: `**💼 Career Development Guidance**

I'm here to help with your career journey: "${question}"

**Career Areas I Can Guide You On:**
• **Skill Development** - Technical and soft skills roadmap
• **Industry Trends** - What's hot in your field
• **Job Search Strategy** - Where and how to find opportunities
• **Professional Networking** - Building meaningful connections
• **Salary Negotiation** - Getting what you're worth
• **Work-Life Balance** - Managing career and personal life

**For Personalized Advice:**
1. **Current role/field** - What do you do now?
2. **Career goals** - Where do you want to be in 2-5 years?
3. **Skills inventory** - What are your strengths?
4. **Challenges** - What obstacles are you facing?

**Quick Career Tips:**
• Continuously learn new skills relevant to your field
• Build a strong professional network
• Keep your resume and LinkedIn updated
• Set clear, measurable career goals

What specific career aspect would you like to discuss? 🎯`,

      general: `**🤝 I'm Here to Help!**

Thanks for your question: "${question}"

**I Can Help You With:**
• **📚 Learning & Education** - Any subject, concept explanation
• **💻 Technology** - Programming, web development, software
• **📈 Career Development** - Job search, skills, professional growth
• **🧮 Problem Solving** - Math, logic, analytical thinking
• **📝 Writing & Communication** - Essays, presentations, professional writing
• **🔍 Research & Analysis** - Finding information, data interpretation

**How to Get the Best Help:**
1. **Be specific** - The more details, the better I can help
2. **Ask follow-up questions** - Don't hesitate to dig deeper
3. **Share context** - What's your background or goal?
4. **Request examples** - I can provide practical demonstrations

**My Teaching Style:**
• Simple, clear explanations
• Step-by-step guidance
• Real-world examples
• Practical, actionable advice

Please feel free to rephrase your question or ask about anything specific! I'm here to make learning easy and enjoyable. 😊`
    };

    return responses[type as keyof typeof responses] || responses.general;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (prompt: string, category: string) => {
    handleSendMessage(prompt);
  };

  const rateMessage = (messageId: string, rating: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, rating } : msg
    ));
  };

  const formatMessage = (content: string) => {
    // Enhanced formatting for better readability
    const lines = content.split('\n');
    const formattedLines: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.length > 4) {
        // Bold headings
        formattedLines.push(
          <h4 key={index} className="font-bold text-slate-900 mt-4 mb-2 text-lg">
            {trimmedLine.slice(2, -2)}
          </h4>
        );
      } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        // Bullet points
        formattedLines.push(
          <li key={index} className="ml-4 mb-1 text-slate-700">
            {trimmedLine.substring(1).trim()}
          </li>
        );
      } else if (trimmedLine.match(/^\d+\./)) {
        // Numbered lists
        formattedLines.push(
          <li key={index} className="ml-4 mb-1 list-decimal text-slate-700">
            {trimmedLine.replace(/^\d+\.\s*/, '')}
          </li>
        );
      } else if (trimmedLine.startsWith('#')) {
        // Headers
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const text = trimmedLine.replace(/^#+\s*/, '');
        const HeaderTag = `h${Math.min(level + 2, 6)}` as keyof JSX.IntrinsicElements;
        formattedLines.push(
          <HeaderTag key={index} className="font-bold text-slate-900 mt-3 mb-2">
            {text}
          </HeaderTag>
        );
      } else if (trimmedLine === '') {
        // Empty lines
        formattedLines.push(<br key={index} />);
      } else {
        // Regular paragraphs with inline formatting
        const formattedText = trimmedLine
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
        
        formattedLines.push(
          <p key={index} className="mb-2 text-slate-700 leading-relaxed" 
             dangerouslySetInnerHTML={{ __html: formattedText }} />
        );
      }
    });
    
    return formattedLines;
  };

  return (
    <div className="max-w-5xl mx-auto h-[700px] flex flex-col">
      <div className="bg-white rounded-t-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Coach</h2>
            <p className="text-sm text-slate-600">Your personal tutor for coding, career prep, and universal knowledge</p>
          </div>
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.prompt, action.category)}
                className={`p-3 rounded-lg bg-gradient-to-r ${action.color} text-white hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg`}
              >
                <action.icon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-xs font-medium">{action.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white border-x border-slate-200 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <div className="flex items-start space-x-3">
                {message.role === 'assistant' && (
                  <Bot className="h-5 w-5 mt-1 text-indigo-600 flex-shrink-0" />
                )}
                {message.role === 'user' && (
                  <User className="h-5 w-5 mt-1 text-white flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm leading-relaxed">
                    {message.role === 'assistant' ? (
                      <div className="space-y-1">
                        {formatMessage(message.content)}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className={`text-xs ${
                      message.role === 'user' ? 'text-indigo-200' : 'text-slate-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                      {message.messageType && message.messageType !== 'general' && (
                        <span className="ml-2 px-2 py-1 bg-slate-200 text-slate-600 rounded-full text-xs">
                          {message.messageType}
                        </span>
                      )}
                    </div>
                    
                    {message.role === 'assistant' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => rateMessage(message.id, 1)}
                          className={`p-1 rounded ${
                            message.rating === 1 ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:text-green-600'
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => rateMessage(message.id, -1)}
                          className={`p-1 rounded ${
                            message.rating === -1 ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600'
                          }`}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Bot className="h-5 w-5 text-indigo-600" />
                <Loader className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="text-sm text-slate-600">AI Coach is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white rounded-b-xl border border-slate-200 p-6">
        <div className="flex space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about coding, interviews, career advice, aptitude, or any topic you want to learn..."
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </div>
        
        <div className="mt-3 text-xs text-slate-500 text-center">
          AI Coach can help with <strong>coding, interviews, career advice, aptitude, resume review, and any universal knowledge</strong> - just like ChatGPT!
        </div>
      </div>
    </div>
  );
};