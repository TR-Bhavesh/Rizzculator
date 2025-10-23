// src/components/UserProfile.jsx - User profile with stats and history
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Award, Calendar, Activity, Target, Zap, Mail, MapPin, Crown } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateLevel } from '../utils/achievements';
import AchievementBadge from './AchievementBadge';


const UserProfile = ({ user, currentUser, onClose, onMessage }) => {
  const [scoreHistory, setScoreHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, achievements, history

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Load score history
      const historyQuery = query(
        collection(db, 'scoreHistory'),
        where('userId', '==', user.uid || user.id),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const historySnapshot = await getDocs(historyQuery);
      const history = [];
      historySnapshot.forEach(doc => {
        history.push({ id: doc.id, ...doc.data() });
      });
      setScoreHistory(history.reverse());

      // Calculate stats
      const userStats = {
        totalScans: history.length,
        highestScore: Math.max(...history.map(h => h.score), user.rizzScore || 0),
        averageScore: history.length > 0 
          ? history.reduce((sum, h) => sum + h.score, 0) / history.length 
          : user.rizzScore || 0,
        upvotesReceived: user.upvotes || 0,
        rank: user.rank || 'Unranked',
        joinedDate: user.createdAt?.toDate() || new Date(),
        loginStreak: user.loginStreak || 1,
        achievements: user.achievements || [],
        xp: user.xp || 0
      };
      setStats(userStats);
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  const levelInfo = calculateLevel(stats?.xp || 0);
  const isOwnProfile = user.uid === currentUser?.uid || user.id === currentUser?.uid;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg overflow-y-auto">
      <div className="bg-gradient-to-br from-purple-900/90 via-pink-900/90 to-blue-900/90 backdrop-blur-2xl rounded-3xl max-w-4xl w-full border-2 border-white/20 shadow-2xl my-8">
        {/* Header */}
        <div className="relative p-8 pb-20">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-t-3xl"></div>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-lg transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">
            {/* Profile Picture & Level */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-4xl ring-4 ring-white/20">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-xs font-black px-3 py-1 rounded-full border-2 border-white/20 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  LV {levelInfo.level}
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-3xl font-black text-white mb-2 flex items-center justify-center sm:justify-start gap-2">
                  {user.username}
                  {stats?.rank && (
                    <span className="text-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full">
                      {stats.rank}
                    </span>
                  )}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-gray-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {user.country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {stats?.joinedDate?.toLocaleDateString()}
                  </span>
                  {stats?.loginStreak > 1 && (
                    <span className="flex items-center gap-1 bg-orange-500/20 px-2 py-1 rounded-full">
                      🔥 {stats.loginStreak} day streak
                    </span>
                  )}
                </div>

                {/* XP Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Level {levelInfo.level}</span>
                    <span>{levelInfo.xpProgress} / {levelInfo.xpNeeded} XP</span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-orange-600 transition-all duration-500"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {!isOwnProfile && (
                <button
                  onClick={() => onMessage(user)}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Message
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-8 -mt-12 mb-6 relative z-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Rizz Score"
              value={user.rizzScore?.toFixed(2) || '0.00'}
              color="from-pink-500 to-rose-600"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Highest"
              value={stats?.highestScore?.toFixed(0) || '0'}
              color="from-green-500 to-emerald-600"
            />
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label="Total Scans"
              value={stats?.totalScans || 0}
              color="from-blue-500 to-cyan-600"
            />
            <StatCard
              icon={<Award className="w-5 h-5" />}
              label="Upvotes"
              value={stats?.upvotesReceived || 0}
              color="from-purple-500 to-indigo-600"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 mb-6">
          <div className="flex gap-2 border-b border-white/10">
            {['overview', 'achievements', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 py-2 font-semibold text-sm transition-all
                  ${activeTab === tab
                    ? 'text-white border-b-2 border-pink-500'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-8 pb-8 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Score Chart Placeholder */}
              {scoreHistory.length > 0 && (
                <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">Score History</h3>
                  <div className="h-48 flex items-end justify-around gap-2">
                    {scoreHistory.map((entry, i) => {
                      const maxScore = Math.max(...scoreHistory.map(e => e.score));
                      const height = (entry.score / maxScore) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-gradient-to-t from-pink-500 to-purple-600 rounded-t-lg transition-all hover:opacity-80"
                            style={{ height: `${height}%`, minHeight: '20px' }}
                          ></div>
                          <span className="text-xs text-gray-500">{entry.score?.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {scoreHistory.slice(-5).reverse().map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-semibold">{entry.type || 'Analysis'}</p>
                        <p className="text-xs text-gray-400">
                          {entry.timestamp?.toDate?.()?.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-pink-400">{entry.score?.toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Show user's achievements - you'll integrate with the achievements system */}
              <div className="col-span-full text-center py-12 text-gray-400">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold">Achievements Coming Soon!</p>
                <p className="text-sm mt-2">Keep improving your rizz to unlock badges</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {scoreHistory.length > 0 ? (
                scoreHistory.map((entry, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1">
                          {entry.type || 'Rizz Analysis'}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {entry.timestamp?.toDate?.()?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                          {entry.score?.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">{entry.rank}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No history yet</p>
                  <p className="text-sm mt-2">Start analyzing to build your history!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => {
  return (
    <div className={`bg-gradient-to-br ${color} bg-opacity-20 backdrop-blur-lg rounded-2xl p-4 border border-white/20 transform transition-all hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-white/80">{icon}</div>
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-white/70 font-semibold">{label}</div>
    </div>
  );
};

export default UserProfile;