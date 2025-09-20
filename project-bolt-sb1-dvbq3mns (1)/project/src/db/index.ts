import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';

let SQL: any = null;
let db: any = null;

export const initializeDatabase = async () => {
  try {
    if (!SQL) {
      SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });
    }

    if (!db) {
      const savedDb = localStorage.getItem('interview_platform_db');
      if (savedDb) {
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        db = new SQL.Database(uint8Array);
      } else {
        db = new SQL.Database();
      }

      // Create enhanced tables with comprehensive activity tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login TEXT DEFAULT CURRENT_TIMESTAMP,
          total_login_count INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS user_progress (
          user_id TEXT PRIMARY KEY,
          interviews_completed INTEGER DEFAULT 0,
          coding_challenges_solved INTEGER DEFAULT 0,
          average_typing_speed REAL DEFAULT 0,
          best_typing_speed REAL DEFAULT 0,
          aptitude_accuracy REAL DEFAULT 0,
          aptitude_tests_taken INTEGER DEFAULT 0,
          jam_average_score REAL DEFAULT 0,
          jam_sessions_completed INTEGER DEFAULT 0,
          ppt_average_score REAL DEFAULT 0,
          ppt_sessions_completed INTEGER DEFAULT 0,
          daily_challenge_streak INTEGER DEFAULT 0,
          total_practice_time INTEGER DEFAULT 0,
          skill_level TEXT DEFAULT 'Beginner',
          last_active_date TEXT DEFAULT CURRENT_DATE,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS user_activities (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          activity_type TEXT NOT NULL,
          activity_name TEXT NOT NULL,
          score REAL DEFAULT 0,
          duration INTEGER DEFAULT 0,
          details TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS skill_assessments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          skill_name TEXT NOT NULL,
          current_level REAL DEFAULT 0,
          previous_level REAL DEFAULT 0,
          improvement_rate REAL DEFAULT 0,
          assessment_date TEXT DEFAULT CURRENT_TIMESTAMP,
          recommendations TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS performance_metrics (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          metric_type TEXT NOT NULL,
          metric_value REAL NOT NULL,
          benchmark_value REAL DEFAULT 0,
          percentile REAL DEFAULT 0,
          recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS coding_submissions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          challenge_id TEXT NOT NULL,
          challenge_title TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          code TEXT NOT NULL,
          language TEXT NOT NULL,
          status TEXT NOT NULL,
          score REAL DEFAULT 0,
          execution_time REAL DEFAULT 0,
          memory INTEGER DEFAULT 0,
          test_cases_passed INTEGER DEFAULT 0,
          total_test_cases INTEGER DEFAULT 0,
          ai_feedback TEXT,
          ai_score REAL DEFAULT 0,
          submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS typing_tests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          text TEXT NOT NULL,
          wpm REAL NOT NULL,
          raw_wpm REAL DEFAULT 0,
          accuracy REAL NOT NULL,
          errors INTEGER NOT NULL,
          correct_chars INTEGER DEFAULT 0,
          incorrect_chars INTEGER DEFAULT 0,
          duration INTEGER NOT NULL,
          time_limit INTEGER DEFAULT 60,
          completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS aptitude_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          category TEXT NOT NULL,
          questions TEXT NOT NULL,
          answers TEXT NOT NULL,
          score REAL NOT NULL,
          time_spent INTEGER NOT NULL,
          questions_attempted INTEGER DEFAULT 0,
          correct_answers INTEGER DEFAULT 0,
          completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS jam_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          transcript TEXT NOT NULL,
          word_count INTEGER DEFAULT 0,
          duration INTEGER NOT NULL,
          fluency_score REAL NOT NULL,
          grammar_score REAL NOT NULL,
          vocabulary_score REAL NOT NULL,
          overall_score REAL NOT NULL,
          feedback TEXT NOT NULL,
          auto_submitted BOOLEAN DEFAULT FALSE,
          completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS ppt_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          slides TEXT,
          transcript TEXT NOT NULL,
          word_count INTEGER DEFAULT 0,
          duration INTEGER NOT NULL,
          presentation_score REAL NOT NULL,
          content_score REAL NOT NULL,
          delivery_score REAL NOT NULL,
          overall_score REAL NOT NULL,
          feedback TEXT NOT NULL,
          auto_submitted BOOLEAN DEFAULT FALSE,
          completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS interview_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          job_role TEXT NOT NULL,
          questions TEXT NOT NULL,
          current_question_index INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          overall_score REAL DEFAULT 0,
          started_at TEXT DEFAULT CURRENT_TIMESTAMP,
          completed_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS interview_answers (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          question_text TEXT NOT NULL,
          transcript TEXT NOT NULL,
          word_count INTEGER DEFAULT 0,
          duration INTEGER NOT NULL,
          ai_score REAL NOT NULL,
          ai_feedback TEXT NOT NULL,
          auto_submitted BOOLEAN DEFAULT FALSE,
          answered_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
        );

        CREATE TABLE IF NOT EXISTS mock_interview_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          resume_content TEXT,
          aptitude_score REAL DEFAULT 0,
          typing_score REAL DEFAULT 0,
          coding_score REAL DEFAULT 0,
          voice_score REAL DEFAULT 0,
          total_score REAL DEFAULT 0,
          passed BOOLEAN DEFAULT FALSE,
          started_at TEXT DEFAULT CURRENT_TIMESTAMP,
          completed_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS ai_chat_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_message TEXT NOT NULL,
          ai_response TEXT NOT NULL,
          message_type TEXT DEFAULT 'general',
          satisfaction_rating INTEGER DEFAULT 0,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS daily_challenges (
          id TEXT PRIMARY KEY,
          date TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL,
          challenge_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          difficulty TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_achievements (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          achievement_type TEXT NOT NULL,
          achievement_name TEXT NOT NULL,
          description TEXT NOT NULL,
          earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Insert sample data
      await insertSampleData();
      saveDatabase();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

const insertSampleData = async () => {
  // Insert today's daily challenge
  const today = new Date().toISOString().split('T')[0];
  db.run(`INSERT OR IGNORE INTO daily_challenges 
    (id, date, type, challenge_id, title, description, difficulty) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), today, 'coding', 'faang_001', 'Two Sum Challenge', 
     'Daily coding challenge: Solve the classic Two Sum problem', 'easy']
  );
};

const saveDatabase = () => {
  if (db) {
    const data = db.export();
    localStorage.setItem('interview_platform_db', JSON.stringify(Array.from(data)));
  }
};

export const dbOperations = {
  // Enhanced user operations
  createUser: (user: { id: string; email: string; firstName?: string; lastName?: string }) => {
    // Check if user exists
    const existingUser = db.exec(`SELECT id FROM users WHERE id = ?`, [user.id]);
    
    if (existingUser.length === 0 || existingUser[0].values.length === 0) {
      // Create new user
      db.run(`INSERT INTO users (id, email, first_name, last_name, total_login_count) VALUES (?, ?, ?, ?, ?)`,
        [user.id, user.email, user.firstName || null, user.lastName || null, 1]);
      
      // Initialize user progress
      db.run(`INSERT INTO user_progress (user_id) VALUES (?)`, [user.id]);
      
      // Log activity
      dbOperations.logActivity(user.id, 'account', 'User Registration', 0, 0, 'New user account created');
    } else {
      // Update login count and last login
      db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP, total_login_count = total_login_count + 1 WHERE id = ?`, [user.id]);
      
      // Log activity
      dbOperations.logActivity(user.id, 'account', 'User Login', 0, 0, 'User logged in');
    }
    
    saveDatabase();
  },

  // Activity logging
  logActivity: (userId: string, activityType: string, activityName: string, score: number = 0, duration: number = 0, details: string = '') => {
    db.run(`INSERT INTO user_activities 
      (id, user_id, activity_type, activity_name, score, duration, details) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, activityType, activityName, score, duration, details]);
    saveDatabase();
  },

  // Get recent activities
  getRecentActivities: (userId: string, limit: number = 10) => {
    const results = db.exec(`
      SELECT activity_type, activity_name, score, duration, details, created_at 
      FROM user_activities 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [userId, limit]);
    
    if (results.length === 0) return [];
    
    const columns = results[0].columns;
    const values = results[0].values;
    
    return values.map((row: any[]) => {
      const activity: any = {};
      columns.forEach((col, index) => {
        const camelCol = col.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
        activity[camelCol] = row[index];
      });
      return activity;
    });
  },

  // Enhanced coding operations
  saveCodingSubmission: (submission: {
    id: string;
    userId: string;
    challengeId: string;
    challengeTitle: string;
    difficulty: string;
    code: string;
    language: string;
    status: string;
    score?: number;
    executionTime?: number;
    memory?: number;
    testCasesPassed?: number;
    totalTestCases?: number;
    aiFeedback?: string;
    aiScore?: number;
  }) => {
    db.run(`INSERT INTO coding_submissions 
      (id, user_id, challenge_id, challenge_title, difficulty, code, language, status, score, execution_time, memory, test_cases_passed, total_test_cases, ai_feedback, ai_score) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [submission.id, submission.userId, submission.challengeId, submission.challengeTitle, submission.difficulty,
       submission.code, submission.language, submission.status, submission.score || 0, 
       submission.executionTime || 0, submission.memory || 0, submission.testCasesPassed || 0,
       submission.totalTestCases || 0, submission.aiFeedback || null, submission.aiScore || 0]);
    
    // Log activity
    dbOperations.logActivity(
      submission.userId, 
      'coding', 
      `${submission.challengeTitle} (${submission.difficulty})`,
      submission.score || 0,
      0,
      `Language: ${submission.language}, Status: ${submission.status}`
    );
    
    saveDatabase();
  },

  // Enhanced typing test operations
  saveTypingTest: (test: {
    id: string;
    userId: string;
    text: string;
    wpm: number;
    rawWpm?: number;
    accuracy: number;
    errors: number;
    correctChars?: number;
    incorrectChars?: number;
    duration: number;
    timeLimit?: number;
  }) => {
    db.run(`INSERT INTO typing_tests 
      (id, user_id, text, wpm, raw_wpm, accuracy, errors, correct_chars, incorrect_chars, duration, time_limit) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [test.id, test.userId, test.text, test.wpm, test.rawWpm || 0, test.accuracy, 
       test.errors, test.correctChars || 0, test.incorrectChars || 0, test.duration, test.timeLimit || 60]);
    
    // Log activity
    dbOperations.logActivity(
      test.userId, 
      'typing', 
      'Typing Speed Test',
      test.wpm,
      test.duration,
      `WPM: ${test.wpm}, Accuracy: ${test.accuracy}%`
    );
    
    saveDatabase();
  },

  // Enhanced aptitude operations
  saveAptitudeSession: (session: {
    id: string;
    userId: string;
    category: string;
    questions: any[];
    answers: number[];
    score: number;
    timeSpent: number;
  }) => {
    const questionsAttempted = session.answers.filter(a => a !== -1).length;
    const correctAnswers = session.questions.reduce((count, question, index) => {
      return count + (session.answers[index] === question.correctAnswer ? 1 : 0);
    }, 0);

    db.run(`INSERT INTO aptitude_sessions 
      (id, user_id, category, questions, answers, score, time_spent, questions_attempted, correct_answers) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.userId, session.category, JSON.stringify(session.questions), 
       JSON.stringify(session.answers), session.score, session.timeSpent, questionsAttempted, correctAnswers]);
    
    // Log activity
    dbOperations.logActivity(
      session.userId, 
      'aptitude', 
      `${session.category} Aptitude Test`,
      session.score,
      session.timeSpent,
      `Questions: ${questionsAttempted}/${session.questions.length}, Correct: ${correctAnswers}`
    );
    
    saveDatabase();
  },

  // Enhanced JAM operations
  saveJAMSession: (session: {
    id: string;
    userId: string;
    topic: string;
    transcript: string;
    wordCount?: number;
    duration: number;
    fluencyScore: number;
    grammarScore: number;
    vocabularyScore: number;
    overallScore: number;
    feedback: string;
    autoSubmitted?: boolean;
  }) => {
    db.run(`INSERT INTO jam_sessions 
      (id, user_id, topic, transcript, word_count, duration, fluency_score, grammar_score, vocabulary_score, overall_score, feedback, auto_submitted) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.userId, session.topic, session.transcript, session.wordCount || 0, session.duration,
       session.fluencyScore, session.grammarScore, session.vocabularyScore, session.overallScore, 
       session.feedback, session.autoSubmitted || false]);
    
    // Log activity
    dbOperations.logActivity(
      session.userId, 
      'speaking', 
      'JAM Session',
      session.overallScore,
      session.duration,
      `Topic: ${session.topic}, Words: ${session.wordCount || 0}`
    );
    
    saveDatabase();
  },

  // Enhanced PPT operations
  savePPTSession: (session: {
    id: string;
    userId: string;
    topic: string;
    slides?: string[];
    transcript: string;
    wordCount?: number;
    duration: number;
    presentationScore: number;
    contentScore: number;
    deliveryScore: number;
    overallScore: number;
    feedback: string;
    autoSubmitted?: boolean;
  }) => {
    db.run(`INSERT INTO ppt_sessions 
      (id, user_id, topic, slides, transcript, word_count, duration, presentation_score, content_score, delivery_score, overall_score, feedback, auto_submitted) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.userId, session.topic, JSON.stringify(session.slides || []), session.transcript, 
       session.wordCount || 0, session.duration, session.presentationScore, session.contentScore, 
       session.deliveryScore, session.overallScore, session.feedback, session.autoSubmitted || false]);
    
    // Log activity
    dbOperations.logActivity(
      session.userId, 
      'presentation', 
      'PPT Session',
      session.overallScore,
      session.duration,
      `Topic: ${session.topic}, Words: ${session.wordCount || 0}`
    );
    
    saveDatabase();
  },

  // Enhanced interview operations
  createInterviewSession: (session: {
    id: string;
    userId: string;
    jobRole: string;
    questions: any[];
  }) => {
    db.run(`INSERT INTO interview_sessions 
      (id, user_id, job_role, questions) 
      VALUES (?, ?, ?, ?)`,
      [session.id, session.userId, session.jobRole, JSON.stringify(session.questions)]);
    
    // Log activity
    dbOperations.logActivity(
      session.userId, 
      'interview', 
      `Voice Interview - ${session.jobRole}`,
      0,
      0,
      `Started interview for ${session.jobRole} position`
    );
    
    saveDatabase();
  },

  saveInterviewAnswer: (answer: {
    id: string;
    sessionId: string;
    questionId: string;
    questionText: string;
    transcript: string;
    wordCount?: number;
    duration: number;
    aiScore: number;
    aiFeedback: string;
    autoSubmitted?: boolean;
  }) => {
    db.run(`INSERT INTO interview_answers 
      (id, session_id, question_id, question_text, transcript, word_count, duration, ai_score, ai_feedback, auto_submitted) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [answer.id, answer.sessionId, answer.questionId, answer.questionText, answer.transcript, answer.wordCount || 0,
       answer.duration, answer.aiScore, answer.aiFeedback, answer.autoSubmitted || false]);
    saveDatabase();
  },

  completeInterviewSession: (sessionId: string, overallScore: number) => {
    db.run(`UPDATE interview_sessions 
      SET status = 'completed', overall_score = ?, completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?`, [overallScore, sessionId]);
    saveDatabase();
  },

  getAllUserInterviews: (userId: string) => {
    const results = db.exec(`
      SELECT ia.*, iss.started_at, iss.job_role, iss.overall_score as session_score
      FROM interview_answers ia 
      JOIN interview_sessions iss ON ia.session_id = iss.id 
      WHERE iss.user_id = ? 
      ORDER BY ia.answered_at DESC
    `, [userId]);
    
    if (results.length === 0) return [];
    
    const columns = results[0].columns;
    const values = results[0].values;
    
    return values.map((row: any[]) => {
      const interview: any = {};
      columns.forEach((col, index) => {
        const camelCol = col.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
        interview[camelCol] = row[index];
      });
      return interview;
    });
  },

  // Mock interview operations
  createMockInterviewSession: (session: {
    id: string;
    userId: string;
    resumeContent?: string;
  }) => {
    db.run(`INSERT INTO mock_interview_sessions 
      (id, user_id, resume_content) 
      VALUES (?, ?, ?)`,
      [session.id, session.userId, session.resumeContent || null]);
    
    // Log activity
    dbOperations.logActivity(
      session.userId, 
      'mock_interview', 
      'Complete Mock Interview',
      0,
      0,
      'Started 4-stage mock interview'
    );
    
    saveDatabase();
  },

  saveMockInterviewResults: (results: {
    id: string;
    userId: string;
    aptitudeScore: number;
    typingScore: number;
    codingScore: number;
    voiceScore: number;
    totalScore: number;
  }) => {
    const passed = results.totalScore >= 270; // 90% of 300
    db.run(`UPDATE mock_interview_sessions 
      SET aptitude_score = ?, typing_score = ?, coding_score = ?, voice_score = ?, total_score = ?, passed = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [results.aptitudeScore, results.typingScore, results.codingScore, results.voiceScore, 
       results.totalScore, passed, results.id]);
    
    // Log activity
    dbOperations.logActivity(
      results.userId, 
      'mock_interview', 
      'Mock Interview Completed',
      results.totalScore,
      0,
      `Total Score: ${results.totalScore}/300, Status: ${passed ? 'PASSED' : 'FAILED'}`
    );
    
    saveDatabase();
  },

  // AI Chat operations with enhanced tracking
  saveAIChatHistory: (chat: {
    id: string;
    userId: string;
    userMessage: string;
    aiResponse: string;
    messageType?: string;
  }) => {
    db.run(`INSERT INTO ai_chat_history 
      (id, user_id, user_message, ai_response, message_type) 
      VALUES (?, ?, ?, ?, ?)`,
      [chat.id, chat.userId, chat.userMessage, chat.aiResponse, chat.messageType || 'general']);
    
    // Log activity
    dbOperations.logActivity(
      chat.userId, 
      'ai_chat', 
      'AI Coach Interaction',
      0,
      0,
      `Question type: ${chat.messageType || 'general'}`
    );
    
    saveDatabase();
  },

  // Performance metrics
  savePerformanceMetric: (metric: {
    userId: string;
    metricType: string;
    metricValue: number;
    benchmarkValue?: number;
    percentile?: number;
  }) => {
    db.run(`INSERT INTO performance_metrics 
      (id, user_id, metric_type, metric_value, benchmark_value, percentile) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), metric.userId, metric.metricType, metric.metricValue, 
       metric.benchmarkValue || 0, metric.percentile || 0]);
    saveDatabase();
  },

  // Skill assessment
  updateSkillAssessment: (assessment: {
    userId: string;
    skillName: string;
    currentLevel: number;
    previousLevel?: number;
    recommendations?: string;
  }) => {
    const improvementRate = assessment.previousLevel 
      ? ((assessment.currentLevel - assessment.previousLevel) / assessment.previousLevel) * 100 
      : 0;

    db.run(`INSERT INTO skill_assessments 
      (id, user_id, skill_name, current_level, previous_level, improvement_rate, recommendations) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), assessment.userId, assessment.skillName, assessment.currentLevel, 
       assessment.previousLevel || 0, improvementRate, assessment.recommendations || '']);
    saveDatabase();
  },

  // Daily challenge operations
  getDailyChallenge: (date: string) => {
    const results = db.exec('SELECT * FROM daily_challenges WHERE date = ?', [date]);
    if (results.length === 0) return null;
    
    const columns = results[0].columns;
    const values = results[0].values;
    
    if (values.length === 0) return null;
    
    const challenge: any = {};
    columns.forEach((col, index) => {
      const camelCol = col.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
      challenge[camelCol] = values[0][index];
    });
    return challenge;
  },

  // Enhanced user progress operations
  getUserProgress: (userId: string) => {
    const results = db.exec('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    if (results.length === 0) return null;
    
    const columns = results[0].columns;
    const values = results[0].values;
    
    if (values.length === 0) return null;
    
    const progress: any = {};
    columns.forEach((col, index) => {
      const camelCol = col.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
      progress[camelCol] = values[0][index];
    });
    return progress;
  },

  updateUserProgress: (userId: string, updates: Partial<{
    interviewsCompleted: number;
    codingChallengesSolved: number;
    averageTypingSpeed: number;
    bestTypingSpeed: number;
    aptitudeAccuracy: number;
    aptitudeTestsTaken: number;
    jamAverageScore: number;
    jamSessionsCompleted: number;
    pptAverageScore: number;
    pptSessionsCompleted: number;
    dailyChallengeStreak: number;
    totalPracticeTime: number;
    skillLevel: string;
  }>) => {
    const fields = Object.keys(updates).map(key => 
      key.replace(/([A-Z])/g, '_$1').toLowerCase() + ' = ?'
    ).join(', ');
    
    const values = Object.values(updates);
    values.push(userId);
    
    db.run(`UPDATE user_progress SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, values);
    saveDatabase();
  },

  // Get comprehensive dashboard data
  getDashboardData: (userId: string) => {
    const progress = dbOperations.getUserProgress(userId);
    const recentActivities = dbOperations.getRecentActivities(userId, 10);
    
    // Get performance trends
    const performanceResults = db.exec(`
      SELECT metric_type, AVG(metric_value) as avg_value, COUNT(*) as count
      FROM performance_metrics 
      WHERE user_id = ? AND recorded_at >= date('now', '-30 days')
      GROUP BY metric_type
    `, [userId]);
    
    let performanceTrends: any = {};
    if (performanceResults.length > 0) {
      const columns = performanceResults[0].columns;
      const values = performanceResults[0].values;
      
      values.forEach((row: any[]) => {
        performanceTrends[row[0]] = {
          average: row[1],
          count: row[2]
        };
      });
    }

    // Get skill levels
    const skillResults = db.exec(`
      SELECT skill_name, current_level, improvement_rate
      FROM skill_assessments 
      WHERE user_id = ? 
      ORDER BY assessment_date DESC
    `, [userId]);
    
    let skillLevels: any[] = [];
    if (skillResults.length > 0) {
      const columns = skillResults[0].columns;
      const values = skillResults[0].values;
      
      skillLevels = values.map((row: any[]) => ({
        skillName: row[0],
        currentLevel: row[1],
        improvementRate: row[2]
      }));
    }

    return {
      progress,
      recentActivities,
      performanceTrends,
      skillLevels
    };
  },

  // Achievement system
  addAchievement: (userId: string, achievementType: string, achievementName: string, description: string) => {
    db.run(`INSERT INTO user_achievements 
      (id, user_id, achievement_type, achievement_name, description) 
      VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), userId, achievementType, achievementName, description]);
    
    // Log activity
    dbOperations.logActivity(
      userId, 
      'achievement', 
      achievementName,
      0,
      0,
      description
    );
    
    saveDatabase();
  },

  getUserAchievements: (userId: string) => {
    const results = db.exec(`
      SELECT achievement_type, achievement_name, description, earned_at
      FROM user_achievements 
      WHERE user_id = ? 
      ORDER BY earned_at DESC
    `, [userId]);
    
    if (results.length === 0) return [];
    
    const columns = results[0].columns;
    const values = results[0].values;
    
    return values.map((row: any[]) => {
      const achievement: any = {};
      columns.forEach((col, index) => {
        const camelCol = col.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
        achievement[camelCol] = row[index];
      });
      return achievement;
    });
  },

  // Question history tracking for non-repeating content
  markQuestionUsed: (userId: string, questionId: string, questionType: string) => {
    db.run(`INSERT OR IGNORE INTO user_question_history (id, user_id, question_id, question_type) VALUES (?, ?, ?, ?)`,
      [uuidv4(), userId, questionId, questionType]);
    saveDatabase();
  },

  getUsedQuestions: (userId: string, questionType: string): string[] => {
    const results = db.exec('SELECT question_id FROM user_question_history WHERE user_id = ? AND question_type = ?', 
      [userId, questionType]);
    
    if (results.length === 0) return [];
    
    return results[0].values.map((row: any[]) => row[0]);
  }
};

export { db };