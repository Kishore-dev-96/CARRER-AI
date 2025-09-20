import { SignedIn, useUser } from '@clerk/clerk-react';
import { BarChart3, Brain, Clock, TrendingUp, Plus, Code, Keyboard, MessageSquare, Presentation, Target, Trophy, Calendar, Bot, Activity, Award, Zap, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dbOperations } from '../db';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface UserStats {
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
}

interface Activity {
  activityType: string;
  activityName: string;
  score: number;
  duration: number;
  details: string;
  createdAt: string;
}

export const Dashboard = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<UserStats>({
    interviewsCompleted: 0,
    codingChallengesSolved: 0,
    averageTypingSpeed: 0,
    bestTypingSpeed: 0,
    aptitudeAccuracy: 0,
    aptitudeTestsTaken: 0,
    jamAverageScore: 0,
    jamSessionsCompleted: 0,
    pptAverageScore: 0,
    pptSessionsCompleted: 0,
    dailyChallengeStreak: 0,
    totalPracticeTime: 0,
    skillLevel: 'Beginner'
  });
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [performanceTrends, setPerformanceTrends] = useState<any>({});
  const [skillLevels, setSkillLevels] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      // Windows 11 performance optimization
      const startTime = performance.now();
      console.log('🚀 Loading dashboard data optimized for Windows 11 ASUS VivoBook 14...');

      try {
        // Create/update user
        dbOperations.createUser({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
        });

        // Get comprehensive dashboard data
        const dashboardData = dbOperations.getDashboardData(user.id);
        
        if (dashboardData.progress) {
          setStats({
            interviewsCompleted: dashboardData.progress.interviewsCompleted || 0,
            codingChallengesSolved: dashboardData.progress.codingChallengesSolved || 0,
            averageTypingSpeed: dashboardData.progress.averageTypingSpeed || 0,
            bestTypingSpeed: dashboardData.progress.bestTypingSpeed || 0,
            aptitudeAccuracy: dashboardData.progress.aptitudeAccuracy || 0,
            aptitudeTestsTaken: dashboardData.progress.aptitudeTestsTaken || 0,
            jamAverageScore: dashboardData.progress.jamAverageScore || 0,
            jamSessionsCompleted: dashboardData.progress.jamSessionsCompleted || 0,
            pptAverageScore: dashboardData.progress.pptAverageScore || 0,
            pptSessionsCompleted: dashboardData.progress.pptSessionsCompleted || 0,
            dailyChallengeStreak: dashboardData.progress.dailyChallengeStreak || 0,
            totalPracticeTime: dashboardData.progress.totalPracticeTime || 0,
            skillLevel: dashboardData.progress.skillLevel || 'Beginner'
          });
          
          console.log('📊 Dashboard stats updated:', {
            interviews: dashboardData.progress.interviewsCompleted,
            coding: dashboardData.progress.codingChallengesSolved,
            typing: dashboardData.progress.averageTypingSpeed,
            jam: dashboardData.progress.jamSessionsCompleted,
            ppt: dashboardData.progress.pptSessionsCompleted
          });
          
          console.log('📊 Dashboard stats updated:', {
            interviews: dashboardData.progress.interviewsCompleted,
            coding: dashboardData.progress.codingChallengesSolved,
            typing: dashboardData.progress.averageTypingSpeed,
            jam: dashboardData.progress.jamSessionsCompleted,
            ppt: dashboardData.progress.pptSessionsCompleted
          });
        }

        setRecentActivities(dashboardData.recentActivities || []);
        setPerformanceTrends(dashboardData.performanceTrends || {});
        setSkillLevels(dashboardData.skillLevels || []);

        // Get achievements
        const userAchievements = dbOperations.getUserAchievements(user.id);
        setAchievements(userAchievements);

        // Get today's daily challenge
        const today = new Date().toISOString().split('T')[0];
        const challenge = dbOperations.getDailyChallenge(today);
        setDailyChallenge(challenge);

        // Check for new achievements
        checkForNewAchievements(user.id, dashboardData.progress);

        // Windows 11 performance logging
        const loadTime = performance.now() - startTime;
        console.log(`✅ Dashboard loaded in ${loadTime.toFixed(2)}ms on Windows 11 ASUS VivoBook 14`);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Optimized debounce for ASUS VivoBook 14
    const timeoutId = setTimeout(fetchData, 50);
    return () => clearTimeout(timeoutId);
  }, [user?.id]);

  const checkForNewAchievements = (userId: string, progress: any) => {
    if (!progress) return;

    // Check for various achievements
    if (progress.codingChallengesSolved >= 10 && !achievements.some(a => a.achievementName === 'Coding Enthusiast')) {
      dbOperations.addAchievement(userId, 'coding', 'Coding Enthusiast', 'Solved 10 coding challenges');
    }

    if (progress.averageTypingSpeed >= 60 && !achievements.some(a => a.achievementName === 'Speed Demon')) {
      dbOperations.addAchievement(userId, 'typing', 'Speed Demon', 'Achieved 60+ WPM typing speed');
    }

    if (progress.interviewsCompleted >= 5 && !achievements.some(a => a.achievementName === 'Interview Pro')) {
      dbOperations.addAchievement(userId, 'interview', 'Interview Pro', 'Completed 5 voice interviews');
    }

    if (progress.dailyChallengeStreak >= 7 && !achievements.some(a => a.achievementName === 'Week Warrior')) {
      dbOperations.addAchievement(userId, 'streak', 'Week Warrior', '7-day practice streak');
    }
    
    if (progress.jamSessionsCompleted >= 5 && !achievements.some(a => a.achievementName === 'Speaking Star')) {
      dbOperations.addAchievement(userId, 'speaking', 'Speaking Star', 'Completed 5 JAM sessions');
    }
    
    if (progress.pptSessionsCompleted >= 3 && !achievements.some(a => a.achievementName === 'Presentation Pro')) {
      dbOperations.addAchievement(userId, 'presentation', 'Presentation Pro', 'Completed 3 PPT sessions');
    }
  };

  const skillsData = [
    { skill: 'Interviews', score: Math.min(stats.interviewsCompleted * 10, 100) },
    { skill: 'Coding', score: Math.min(stats.codingChallengesSolved * 5, 100) },
    { skill: 'Typing', score: Math.min(stats.averageTypingSpeed * 1.5, 100) },
    { skill: 'Aptitude', score: stats.aptitudeAccuracy },
    { skill: 'Speaking', score: (stats.jamAverageScore + stats.pptAverageScore) / 2 },
  ];

  const performanceData = [
    { name: 'Interviews', score: Math.min(stats.interviewsCompleted * 10, 100), count: stats.interviewsCompleted },
    { name: 'Coding', score: Math.min(stats.codingChallengesSolved * 5, 100), count: stats.codingChallengesSolved },
    { name: 'Typing', score: Math.min(stats.averageTypingSpeed * 1.5, 100), count: Math.round(stats.averageTypingSpeed) },
    { name: 'Aptitude', score: stats.aptitudeAccuracy, count: stats.aptitudeTestsTaken },
    { name: 'Speaking', score: (stats.jamAverageScore + stats.pptAverageScore) / 2, count: stats.jamSessionsCompleted + stats.pptSessionsCompleted },
  ];

  const activityTypeColors: { [key: string]: string } = {
    'coding': '#10b981',
    'typing': '#f59e0b',
    'aptitude': '#8b5cf6',
    'speaking': '#ec4899',
    'presentation': '#3b82f6',
    'interview': '#06b6d4',
    'mock_interview': '#ef4444',
    'ai_chat': '#6366f1',
    'account': '#64748b',
    'achievement': '#fbbf24'
  };

  const quickActions = [
    {
      title: 'Mock Interview',
      description: 'Complete 4-stage interview: Aptitude → Typing → Coding → Voice',
      icon: Trophy,
      href: '/mock-interview',
      color: 'from-yellow-600 to-orange-600',
      stats: `${stats.interviewsCompleted} completed`,
    },
    {
      title: 'Voice Interview',
      description: 'AI-powered voice interview with real-time feedback',
      icon: Brain,
      href: '/interview/voice',
      color: 'from-blue-600 to-purple-600',
      stats: 'HR-style questions',
    },
    {
      title: 'Code Challenge',
      description: 'Solve coding problems with live compiler',
      icon: Code,
      href: '/coding',
      color: 'from-green-600 to-teal-600',
      stats: `${stats.codingChallengesSolved} solved`,
    },
    {
      title: 'Typing Speed',
      description: 'Improve your typing speed and accuracy',
      icon: Keyboard,
      href: '/typing',
      color: 'from-orange-600 to-red-600',
      stats: `${stats.averageTypingSpeed} WPM`,
    },
    {
      title: 'JAM Session',
      description: 'Just A Minute speaking practice',
      icon: MessageSquare,
      href: '/jam',
      color: 'from-pink-600 to-rose-600',
      stats: `${stats.jamSessionsCompleted} sessions`,
    },
    {
      title: 'PPT Practice',
      description: 'Presentation skills with AI feedback',
      icon: Presentation,
      href: '/ppt',
      color: 'from-indigo-600 to-blue-600',
      stats: `${stats.pptSessionsCompleted} presentations`,
    },
    {
      title: 'Aptitude Test',
      description: 'Logical, quantitative, and verbal reasoning',
      icon: Target,
      href: '/aptitude',
      color: 'from-purple-600 to-pink-600',
      stats: `${stats.aptitudeAccuracy.toFixed(1)}% accuracy`,
    },
    {
      title: 'AI Coach',
      description: 'Get help with coding, aptitude, and interview prep',
      icon: Bot,
      href: '/ai-coach',
      color: 'from-cyan-600 to-blue-600',
      stats: 'ChatGPT-like help',
    },
  ];

  const getActivityIcon = (type: string) => {
    const icons: { [key: string]: any } = {
      'coding': Code,
      'typing': Keyboard,
      'aptitude': Target,
      'speaking': MessageSquare,
      'presentation': Presentation,
      'interview': Brain,
      'mock_interview': Trophy,
      'ai_chat': Bot,
      'account': Activity,
      'achievement': Award
    };
    return icons[type] || Activity;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getSkillLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      'Beginner': 'text-red-600 bg-red-100',
      'Intermediate': 'text-yellow-600 bg-yellow-100',
      'Advanced': 'text-blue-600 bg-blue-100',
      'Expert': 'text-green-600 bg-green-100',
      'Master': 'text-purple-600 bg-purple-100'
    };
    return colors[level] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <SignedIn>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome back, {user?.firstName || 'User'}! 🚀
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Your AI-powered career preparation platform. Track your progress, practice skills, 
            and get personalized feedback with real-time analytics.
          </p>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(stats.skillLevel)}`}>
              {stats.skillLevel} Level
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-600">{formatDuration(stats.totalPracticeTime)} practiced</span>
          </div>
        </div>

        {/* Daily Challenge Banner */}
        {dailyChallenge && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-white hover-scale">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Daily Challenge</h3>
                  <p className="text-yellow-100">{dailyChallenge.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.dailyChallengeStreak}</div>
                  <div className="text-sm text-yellow-100">Day Streak</div>
                </div>
                <Link
                  to={`/${dailyChallenge.type}/${dailyChallenge.challengeId}`}
                  className="bg-white text-orange-600 px-6 py-2 rounded-lg font-medium hover:bg-yellow-50 transition-colors"
                >
                  Start Challenge
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="card-enhanced">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Interviews</p>
                <p className="text-2xl font-bold text-slate-900">{stats.interviewsCompleted}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </div>

          <div className="card-enhanced">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Code className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Coding</p>
                <p className="text-2xl font-bold text-slate-900">{stats.codingChallengesSolved}</p>
                <p className="text-xs text-slate-500">Problems Solved</p>
              </div>
            </div>
          </div>

          <div className="card-enhanced">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Keyboard className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Typing</p>
                <p className="text-2xl font-bold text-slate-900">{stats.averageTypingSpeed}</p>
                <p className="text-xs text-slate-500">Avg WPM (Best: {stats.bestTypingSpeed})</p>
              </div>
            </div>
          </div>

          <div className="card-enhanced">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Aptitude</p>
                <p className="text-2xl font-bold text-slate-900">{stats.aptitudeAccuracy.toFixed(1)}%</p>
                <p className="text-xs text-slate-500">{stats.aptitudeTestsTaken} Tests Taken</p>
              </div>
            </div>
          </div>

          <div className="card-enhanced">
            <div className="flex items-center">
              <div className="p-3 bg-pink-100 rounded-lg">
                <Zap className="h-6 w-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Streak</p>
                <p className="text-2xl font-bold text-slate-900">{stats.dailyChallengeStreak}</p>
                <p className="text-xs text-slate-500">Days Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skills Overview */}
          <div className="card-enhanced">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Skills Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={skillsData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Breakdown */}
          <div className="card-enhanced">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value}${name === 'score' ? '%' : ''}`, 
                      name === 'score' ? 'Score' : 'Count'
                    ]}
                  />
                  <Bar dataKey="score" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card-enhanced">
            <div className="flex items-center mb-4">
              <Activity className="h-5 w-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => {
                  const IconComponent = getActivityIcon(activity.activityType);
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: activityTypeColors[activity.activityType] + '20' }}
                      >
                        <IconComponent 
                          className="h-4 w-4" 
                          style={{ color: activityTypeColors[activity.activityType] }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {activity.activityName}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          {activity.score > 0 && (
                            <span>Score: {activity.score.toFixed(1)}</span>
                          )}
                          {activity.duration > 0 && (
                            <span>Duration: {formatDuration(activity.duration)}</span>
                          )}
                          <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">No recent activity</p>
                  <p className="text-sm text-slate-400">Start practicing to see your progress here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="card-enhanced">
            <div className="flex items-center mb-4">
              <Award className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-slate-900">Recent Achievements</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.slice(0, 6).map((achievement, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{achievement.achievementName}</p>
                    <p className="text-sm text-slate-600">{achievement.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-6">Practice Areas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className={`group bg-gradient-to-r ${action.color} rounded-xl p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl card`}
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <action.icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-bold ml-3">{action.title}</h4>
                </div>
                <p className="text-white/90 leading-relaxed mb-3">{action.description}</p>
                <div className="text-sm text-white/80 font-medium">{action.stats}</div>
                <div className="mt-4 flex items-center text-white/80 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">Start Practice</span>
                  <Plus className="h-4 w-4 ml-2" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Coach Recommendations */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 ml-3">AI Coach Recommendations</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Focus Areas</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                {stats.averageTypingSpeed < 40 && (
                  <li>• Improve typing speed - aim for 40+ WPM with our enhanced typing test</li>
                )}
                {stats.codingChallengesSolved < 10 && (
                  <li>• Practice more coding challenges - we have 200+ real MNC questions</li>
                )}
                {stats.interviewsCompleted < 3 && (
                  <li>• Complete more mock interviews with live voice transcription</li>
                )}
                {stats.aptitudeAccuracy < 70 && (
                  <li>• Work on aptitude test accuracy with detailed explanations</li>
                )}
                {stats.jamAverageScore < 70 && (
                  <li>• Practice JAM sessions for better fluency with auto-submit feature</li>
                )}
                {stats.averageTypingSpeed >= 40 && stats.codingChallengesSolved >= 10 && stats.interviewsCompleted >= 3 && (
                  <li>• Great progress! Try the complete mock interview for comprehensive assessment</li>
                )}
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Performance Insights</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Total practice time: {formatDuration(stats.totalPracticeTime)}</li>
                <li>• Current skill level: {stats.skillLevel}</li>
                <li>• Best typing speed: {stats.bestTypingSpeed} WPM</li>
                <li>• Speaking sessions: {stats.jamSessionsCompleted + stats.pptSessionsCompleted}</li>
                <li>• Daily streak: {stats.dailyChallengeStreak} days</li>
                <li>• Overall progress: Excellent trajectory! 📈</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SignedIn>
  );
};