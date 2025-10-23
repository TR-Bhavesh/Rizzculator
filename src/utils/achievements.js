// src/utils/achievements.js - Achievement and gamification system

export const ACHIEVEMENTS = {
  FIRST_SCAN: {
    id: 'first_scan',
    name: 'Getting Started',
    description: 'Complete your first rizz scan',
    icon: '🎯',
    rarity: 'common',
    xp: 10
  },
  RIZZ_GOD: {
    id: 'rizz_god',
    name: 'Rizz God Status',
    description: 'Achieve a score of 95 or higher',
    icon: '🔥',
    rarity: 'legendary',
    xp: 100
  },
  TOP_10: {
    id: 'top_10',
    name: 'Top 10',
    description: 'Reach top 10 on global leaderboard',
    icon: '🏆',
    rarity: 'epic',
    xp: 75
  },
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Send 50 messages',
    icon: '🦋',
    rarity: 'rare',
    xp: 30
  },
  UPVOTE_KING: {
    id: 'upvote_king',
    name: 'Community Favorite',
    description: 'Receive 100 upvotes',
    icon: '👑',
    rarity: 'epic',
    xp: 50
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'Weekly Warrior',
    description: '7-day login streak',
    icon: '🔥',
    rarity: 'rare',
    xp: 40
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Rizz Veteran',
    description: '30-day login streak',
    icon: '💎',
    rarity: 'legendary',
    xp: 150
  },
  ALL_ANALYZERS: {
    id: 'all_analyzers',
    name: 'Jack of All Trades',
    description: 'Try all 5 analyzer types',
    icon: '🎨',
    rarity: 'rare',
    xp: 35
  },
  PERFECT_SCORE: {
    id: 'perfect_score',
    name: 'Flawless',
    description: 'Get a perfect 100 score',
    icon: '💯',
    rarity: 'mythic',
    xp: 200
  },
  CHAT_MASTER: {
    id: 'chat_master',
    name: 'Chat Master',
    description: 'Have 100 AI conversations',
    icon: '💬',
    rarity: 'epic',
    xp: 60
  }
};

export const checkAchievements = (userStats) => {
  const unlocked = [];

  // Check each achievement
  if (userStats.totalScans >= 1 && !userStats.achievements?.includes('first_scan')) {
    unlocked.push(ACHIEVEMENTS.FIRST_SCAN);
  }

  if (userStats.highestScore >= 95 && !userStats.achievements?.includes('rizz_god')) {
    unlocked.push(ACHIEVEMENTS.RIZZ_GOD);
  }

  if (userStats.highestScore >= 100 && !userStats.achievements?.includes('perfect_score')) {
    unlocked.push(ACHIEVEMENTS.PERFECT_SCORE);
  }

  if (userStats.leaderboardRank <= 10 && !userStats.achievements?.includes('top_10')) {
    unlocked.push(ACHIEVEMENTS.TOP_10);
  }

  if (userStats.messagesSent >= 50 && !userStats.achievements?.includes('social_butterfly')) {
    unlocked.push(ACHIEVEMENTS.SOCIAL_BUTTERFLY);
  }

  if (userStats.upvotesReceived >= 100 && !userStats.achievements?.includes('upvote_king')) {
    unlocked.push(ACHIEVEMENTS.UPVOTE_KING);
  }

  if (userStats.loginStreak >= 7 && !userStats.achievements?.includes('streak_7')) {
    unlocked.push(ACHIEVEMENTS.STREAK_7);
  }

  if (userStats.loginStreak >= 30 && !userStats.achievements?.includes('streak_30')) {
    unlocked.push(ACHIEVEMENTS.STREAK_30);
  }

  if (userStats.analyzersUsed >= 5 && !userStats.achievements?.includes('all_analyzers')) {
    unlocked.push(ACHIEVEMENTS.ALL_ANALYZERS);
  }

  if (userStats.aiConversations >= 100 && !userStats.achievements?.includes('chat_master')) {
    unlocked.push(ACHIEVEMENTS.CHAT_MASTER);
  }

  return unlocked;
};

export const calculateLevel = (xp) => {
  // Level formula: level = floor(sqrt(xp / 100))
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpProgress = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = (xpProgress / xpNeeded) * 100;

  return {
    level,
    xp,
    xpForNextLevel,
    xpProgress,
    xpNeeded,
    progressPercent: Math.round(progressPercent)
  };
};

export const getRarityColor = (rarity) => {
  const colors = {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
    mythic: '#EF4444'
  };
  return colors[rarity] || colors.common;
};

export const updateStreak = (lastLoginDate) => {
  if (!lastLoginDate) return { streak: 1, isNewDay: true };

  const today = new Date().setHours(0, 0, 0, 0);
  const lastLogin = new Date(lastLoginDate).setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Same day
    return { streak: null, isNewDay: false };
  } else if (daysDiff === 1) {
    // Consecutive day
    return { streak: 'increment', isNewDay: true };
  } else {
    // Streak broken
    return { streak: 1, isNewDay: true };
  }
};