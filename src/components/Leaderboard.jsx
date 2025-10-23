// src/components/Leaderboard.jsx - Advanced leaderboard with filters
import React, { useState } from 'react';
import { Trophy, TrendingUp, ThumbsUp, Medal, Crown, Star, Filter, Calendar } from 'lucide-react';

const Leaderboard = ({ 
  leaderboardData, 
  currentUser, 
  onUpvote, 
  onFilterChange,
  filter 
}) => {
  const [timeFilter, setTimeFilter] = useState('alltime'); // alltime, monthly, weekly, daily
  const [categoryFilter, setCategoryFilter] = useState('overall'); // overall, selfie, linkedin, etc.

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-black text-gray-500">#{index + 1}</span>;
  };

  const getRankGlow = (index) => {
    if (index === 0) return 'shadow-[0_0_20px_rgba(250,204,21,0.5)]';
    if (index === 1) return 'shadow-[0_0_15px_rgba(156,163,175,0.5)]';
    if (index === 2) return 'shadow-[0_0_15px_rgba(234,88,12,0.5)]';
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Leaderboard
          </h3>
          <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {['daily', 'weekly', 'monthly', 'alltime'].map((time) => (
            <button
              key={time}
              onClick={() => setTimeFilter(time)}
              className={`
                px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all
                ${timeFilter === time
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }
              `}
            >
              {time === 'alltime' ? 'All Time' : time.charAt(0).toUpperCase() + time.slice(1)}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['overall', 'selfie', 'linkedin', 'instagram', 'dating'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                ${categoryFilter === cat
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-black/20 text-gray-400 hover:bg-black/30'
                }
              `}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {leaderboardData.map((user, index) => {
          const isCurrentUser = user.id === currentUser?.uid;
          
          return (
            <div
              key={user.id}
              className={`
                relative overflow-hidden rounded-2xl p-4 transition-all duration-300
                ${index < 3
                  ? `bg-gradient-to-r backdrop-blur-xl border-2 ${getRankGlow(index)} transform hover:scale-[1.02]`
                  : 'bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10'
                }
                ${index === 0 ? 'from-yellow-500/20 to-orange-500/20 border-yellow-400' : ''}
                ${index === 1 ? 'from-gray-400/20 to-gray-500/20 border-gray-400' : ''}
                ${index === 2 ? 'from-orange-600/20 to-red-600/20 border-orange-500' : ''}
                ${isCurrentUser ? 'ring-2 ring-pink-500' : ''}
              `}
            >
              {/* Animated Background for Top 3 */}
              {index < 3 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer-slow" />
              )}

              <div className="relative flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  {getRankIcon(index)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white truncate">
                      {user.username}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-pink-500 px-2 py-0.5 rounded-full">YOU</span>
                      )}
                    </h4>
                    {user.isOnline && (
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{user.country}</span>
                    {user.rank && (
                      <>
                        <span>•</span>
                        <span className="text-yellow-400">{user.rank}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                      {user.rizzScore?.toFixed(2) || '0.00'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{user.upvotes || 0}</span>
                    </div>
                  </div>

                  {/* Upvote Button */}
                  {!isCurrentUser && (
                    <button
                      onClick={() => onUpvote(user.id)}
                      className="bg-white/10 hover:bg-pink-500 p-2 rounded-lg transition-all transform hover:scale-110 active:scale-95"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Trending Badge */}
              {user.isTrending && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  TRENDING
                </div>
              )}
            </div>
          );
        })}

        {leaderboardData.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">No rankings yet!</p>
            <p className="text-sm mt-2">Be the first to claim the top spot 👑</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer-slow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer-slow {
          animation: shimmer-slow 3s infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.7);
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;