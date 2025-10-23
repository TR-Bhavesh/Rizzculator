// src/components/ScoreBreakdown.jsx - Detailed score analysis
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Award, AlertCircle, Lightbulb } from 'lucide-react';

const ScoreBreakdown = ({ breakdown, type }) => {
  if (!breakdown) return null;

  const CategoryBar = ({ name, score, max = 100 }) => {
    const percentage = (score / max) * 100;
    const color = score >= 80 ? 'from-green-500 to-emerald-600' : 
                  score >= 60 ? 'from-yellow-500 to-orange-600' : 
                  'from-red-500 to-rose-600';

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-white capitalize">{name}</span>
          <span className="text-sm font-bold text-white">{score}/{max}</span>
        </div>
        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out relative`}
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-shimmer" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Circle */}
      <div className="flex justify-center mb-8">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-white/20"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - breakdown.overall / 100)}`}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {breakdown.overall}
            </span>
            <span className="text-xs text-gray-400 font-semibold">OVERALL</span>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      {breakdown.categories && Object.keys(breakdown.categories).length > 0 && (
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-pink-400" />
            Category Breakdown
          </h3>
          {Object.entries(breakdown.categories).map(([key, value]) => (
            <CategoryBar key={key} name={key} score={value} />
          ))}
        </div>
      )}

      {/* Strengths */}
      {breakdown.strengths && breakdown.strengths.length > 0 && (
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-green-400" />
            What's Working 🔥
          </h3>
          <ul className="space-y-2">
            {breakdown.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-200">
                <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {breakdown.weaknesses && breakdown.weaknesses.length > 0 && (
        <div className="bg-gradient-to-br from-red-500/20 to-rose-600/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-red-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Needs Work 📉
          </h3>
          <ul className="space-y-2">
            {breakdown.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-200">
                <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {breakdown.improvements && breakdown.improvements.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            How to Improve 💡
          </h3>
          <ul className="space-y-2">
            {breakdown.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-200">
                <span className="text-yellow-400 font-bold flex-shrink-0">{index + 1}.</span>
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default ScoreBreakdown;