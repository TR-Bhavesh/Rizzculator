// src/components/AchievementBadge.jsx - Achievement display component
import React from 'react';
import { Trophy, Star, Award, Zap } from 'lucide-react';
import { getRarityColor } from '../utils/achievements';

const AchievementBadge = ({ achievement, unlocked = false, onClick }) => {
  const rarityColor = getRarityColor(achievement.rarity);

  return (
    <div
      onClick={onClick}
      className={`
        relative group cursor-pointer transition-all duration-300
        ${unlocked ? 'opacity-100 hover:scale-110' : 'opacity-40 grayscale'}
      `}
    >
      <div
        className={`
          relative p-4 rounded-2xl border-2 backdrop-blur-lg
          ${unlocked ? 'bg-white/10 hover:bg-white/20' : 'bg-black/20'}
          transform transition-all duration-300
        `}
        style={{ borderColor: unlocked ? rarityColor : '#444' }}
      >
        {/* Achievement Icon */}
        <div className="text-center mb-2">
          <span className="text-4xl">{achievement.icon}</span>
        </div>

        {/* Achievement Name */}
        <h4 className="text-white font-bold text-sm text-center mb-1">
          {achievement.name}
        </h4>

        {/* Rarity Badge */}
        <div
          className="text-xs font-bold text-center px-2 py-1 rounded-full"
          style={{
            backgroundColor: `${rarityColor}33`,
            color: rarityColor
          }}
        >
          {achievement.rarity.toUpperCase()}
        </div>

        {/* XP Value */}
        {unlocked && (
          <div className="text-center mt-2 text-yellow-400 text-xs font-bold flex items-center justify-center gap-1">
            <Zap className="w-3 h-3" />
            +{achievement.xp} XP
          </div>
        )}

        {/* Locked Overlay */}
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl backdrop-blur-sm">
            <span className="text-4xl">🔒</span>
          </div>
        )}

        {/* Glow Effect for Unlocked */}
        {unlocked && (
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300"
            style={{ backgroundColor: rarityColor }}
          />
        )}
      </div>

      {/* Tooltip on Hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 backdrop-blur-xl text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {achievement.description}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="w-2 h-2 bg-black/90 rotate-45" />
        </div>
      </div>
    </div>
  );
};

// Achievement Unlock Animation Modal
export const AchievementUnlockModal = ({ achievement, onClose }) => {
  if (!achievement) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-fade-in">
      <div className="bg-gradient-to-br from-purple-600/30 via-pink-600/30 to-orange-600/30 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-yellow-400 shadow-2xl animate-scale-in">
        {/* Confetti Effect */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            >
              {['🎉', '✨', '🎊', '⭐', '💫'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>

        <div className="text-center relative z-10">
          <h2 className="text-3xl font-black text-yellow-400 mb-4 animate-bounce">
            🏆 Achievement Unlocked! 🏆
          </h2>

          <div className="text-8xl mb-4 animate-pulse">
            {achievement.icon}
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            {achievement.name}
          </h3>

          <p className="text-gray-300 mb-4">
            {achievement.description}
          </p>

          <div
            className="inline-block px-4 py-2 rounded-full text-sm font-bold mb-4"
            style={{
              backgroundColor: `${getRarityColor(achievement.rarity)}33`,
              color: getRarityColor(achievement.rarity)
            }}
          >
            {achievement.rarity.toUpperCase()} • +{achievement.xp} XP
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
          >
            Awesome! 🎉
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes confetti {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
        .animate-confetti {
          animation: confetti 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AchievementBadge;