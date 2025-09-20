import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { dbOperations } from '../db';
import { Calendar, Star, Search, Filter, TrendingUp, TrendingDown } from 'lucide-react';

interface Interview {
  id: number;
  jobRole: string;
  experience: string;
  question: string;
  userAnswer: string;
  feedback: string;
  rating: number;
  createdAt: string;
}

export default function InterviewHistory() {
  const { user } = useUser();
  const [interviewHistory, setInterviewHistory] = useState<Interview[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (user) {
      loadInterviewHistory();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortHistory();
  }, [interviewHistory, searchTerm, selectedRole, selectedLevel, sortBy, sortOrder]);

  const loadInterviewHistory = async () => {
    try {
      const userId = user?.id || '';
      const history = dbOperations.getAllUserInterviews(userId);
      setInterviewHistory(history);
    } catch (error) {
      console.error('Error loading interview history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortHistory = () => {
    let filtered = [...interviewHistory];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(interview =>
        interview.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.userAnswer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.jobRole.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (selectedRole) {
      filtered = filtered.filter(interview => interview.jobRole === selectedRole);
    }

    // Apply level filter
    if (selectedLevel) {
      filtered = filtered.filter(interview => interview.experience === selectedLevel);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'rating') {
        comparison = a.rating - b.rating;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredHistory(filtered);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-100';
    if (rating >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getUniqueRoles = () => {
    return [...new Set(interviewHistory.map(interview => interview.jobRole))];
  };

  const getUniqueLevels = () => {
    return [...new Set(interviewHistory.map(interview => interview.experience))];
  };

  const calculateAverageRating = () => {
    if (filteredHistory.length === 0) return 0;
    const sum = filteredHistory.reduce((acc, interview) => acc + interview.rating, 0);
    return (sum / filteredHistory.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview History</h1>
            <p className="text-gray-600 mt-1">
              {filteredHistory.length} interviews • Average rating: {calculateAverageRating()}/10
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{interviewHistory.length}</div>
            <div className="text-sm text-gray-500">Total Interviews</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search interviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Roles</option>
            {getUniqueRoles().map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Levels</option>
            {getUniqueLevels().map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          {/* Sort */}
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'rating')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="date">Sort by Date</option>
              <option value="rating">Sort by Rating</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'desc' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Interview List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
          <p className="text-gray-600">
            {interviewHistory.length === 0 
              ? "You haven't completed any interviews yet. Start your first interview to see your history here."
              : "No interviews match your current filters. Try adjusting your search criteria."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((interview) => (
            <div key={interview.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{interview.jobRole}</h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {interview.experience}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRatingColor(interview.rating)}`}>
                        {interview.rating.toFixed(1)}/10
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(interview.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{interview.question}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Your Answer:</h4>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{interview.userAnswer}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">AI Feedback:</h4>
                    <div className="text-gray-700 bg-green-50 p-3 rounded-lg">
                      {interview.feedback.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}