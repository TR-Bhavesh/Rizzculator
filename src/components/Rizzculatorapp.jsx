// src/components/RizzculatorApp.jsx - COMPLETE INTEGRATED VERSION
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Share2, Trophy, Zap, TrendingUp, MessageSquare, Users, Target, LogIn, UserPlus, Send, ThumbsUp, Menu, X, Bot, Search, Linkedin, Instagram, Heart, Sparkles, Bell, User, Award } from 'lucide-react';
import { db, auth } from '../config/firebase';
import { 
  collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, setDoc, increment 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';

// Import components
import Notifications from './Notifications';
import AchievementBadge, { AchievementUnlockModal } from './AchievementBadge';
import ScoreBreakdown from './ScoreBreakdown';
import Leaderboard from './Leaderboard';
import DMSystem from './DMsystems';
import UserProfile from './UserProfile';

// Import hooks
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadCount } from '../hooks/useRealtimeMessages';
import { useAutoStatus } from '../hooks/useUserStatus';

// Import utils
import { calculateRizzScore, getRankFromScore, getScoreBreakdown, getMotivationalMessage } from '../utils/scoring';
import { ACHIEVEMENTS, checkAchievements, calculateLevel, updateStreak } from '../utils/achievements';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Japan', 'Brazil', 'Mexico',
  'Italy', 'Spain', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Belgium',
  'Austria', 'Switzerland', 'Portugal', 'Greece', 'Czech Republic', 'Ireland', 'New Zealand', 'Singapore', 'Malaysia',
  'Thailand', 'Philippines', 'Indonesia', 'Vietnam', 'Pakistan', 'Bangladesh', 'Egypt', 'South Africa', 'Nigeria',
  'Kenya', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Turkey', 'Saudi Arabia', 'UAE', 'Israel', 'Russia'
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];

// AI API call function
const callGroqAPI = async (messages, type = 'chat', userProfile = null) => {
  try {
    // Use the correct API endpoint
    const apiUrl = import.meta.env.VITE_API_URL || '/api/groq';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userProfile?.uid || 'anonymous'
      },
      body: JSON.stringify({ messages, type, userProfile }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('AI Error:', error);
    // Provide more specific error message
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
      throw new Error('Unable to connect to AI service. Please check your API configuration.');
    }
    throw error;
  }
};

export default function RizzculatorApp() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [authForm, setAuthForm] = useState({
    email: '', password: '', username: '', country: '', state: ''
  });

  // App state
  const [step, setStep] = useState('landing');
  const [analyzerType, setAnalyzerType] = useState('selfie');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [chatImage, setChatImage] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  
  // UI state
  const [showChat, setShowChat] = useState(false);
  const [showDMs, setShowDMs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(null);
  
  // Chat state
  const [chatMode, setChatMode] = useState('ai');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  
  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState({ type: 'global', value: 'Global' });
  const [allUsers, setAllUsers] = useState([]);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Refs
  const selfieInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const resultsRef = useRef(null);
  const chatEndRef = useRef(null);

  // Hooks
  const { notifications, removeNotification, success, error: showError, info } = useNotifications();
  const unreadCount = useUnreadCount(currentUser?.uid);
  useAutoStatus(currentUser?.uid);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = { uid: user.uid, ...userDoc.data() };
            setCurrentUser(userData);
            setIsAuthenticated(true);
            
            // Check streak
            const streakUpdate = updateStreak(userData.lastLoginDate);
            if (streakUpdate.isNewDay) {
              if (streakUpdate.streak === 'increment') {
                await updateDoc(doc(db, 'users', user.uid), {
                  loginStreak: increment(1),
                  lastLoginDate: serverTimestamp()
                });
                info(`🔥 ${userData.loginStreak + 1} day streak!`);
              } else if (streakUpdate.streak === 1) {
                await updateDoc(doc(db, 'users', user.uid), {
                  loginStreak: 1,
                  lastLoginDate: serverTimestamp()
                });
              }
            }
          }
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load leaderboard and users
  useEffect(() => {
    if (isAuthenticated) {
      loadLeaderboard();
      loadAllUsers();
    }
  }, [leaderboardFilter, isAuthenticated]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadLeaderboard = async () => {
    try {
      let q = query(collection(db, 'users'), orderBy('rizzScore', 'desc'), limit(50));

      if (leaderboardFilter.type === 'country') {
        q = query(collection(db, 'users'), where('country', '==', leaderboardFilter.value), orderBy('rizzScore', 'desc'), limit(50));
      } else if (leaderboardFilter.type === 'state') {
        q = query(collection(db, 'users'), where('state', '==', leaderboardFilter.value), orderBy('rizzScore', 'desc'), limit(50));
      }

      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setLeaderboardData(users);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  };

  const loadAllUsers = async () => {
    try {
      const q = query(collection(db, 'users'), limit(100));
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUser?.uid) {
          users.push({ id: doc.id, ...doc.data() });
        }
      });
      setAllUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!authForm.username || !authForm.email || !authForm.password || !authForm.country) {
          setError('Please fill in all required fields!');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: authForm.email,
          username: authForm.username,
          country: authForm.country,
          state: authForm.state || '',
          rizzScore: 0,
          mainCharacterScore: 0,
          npcLevel: 0,
          upvotes: 0,
          rank: 'Unranked',
          xp: 0,
          loginStreak: 1,
          achievements: [],
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
          lastLoginDate: serverTimestamp()
        });

        setCurrentUser({
          uid: userCredential.user.uid,
          email: authForm.email,
          username: authForm.username,
          country: authForm.country,
          state: authForm.state,
          rizzScore: 0,
          upvotes: 0,
          xp: 0
        });
        setIsAuthenticated(true);
        setStep('landing');
        success('Welcome to Rizzculator! 🎉');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ uid: userCredential.user.uid, ...userDoc.data() });
          setIsAuthenticated(true);
          setStep('landing');
          success(`Welcome back, ${userDoc.data().username}! 👋`);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
      showError('Login failed. Check your credentials!');
    } finally {
      setLoading(false);
    }
  };

  const upvoteUser = async (userId) => {
    if (!currentUser) return;

    try {
      const upvoteRef = doc(db, 'upvotes', `${currentUser.uid}_${userId}`);
      const upvoteDoc = await getDoc(upvoteRef);

      if (upvoteDoc.exists()) {
        showError('You already upvoted this user!');
        return;
      }

      await setDoc(upvoteRef, {
        from: currentUser.uid,
        to: userId,
        timestamp: serverTimestamp()
      });

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        upvotes: increment(1)
      });

      loadLeaderboard();
      success('Upvote added! 🔥');
    } catch (err) {
      console.error('Error upvoting:', err);
      showError('Failed to upvote!');
    }
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    setStep('analyzing');

    try {
      let systemPrompt = '';
      let userPrompt = '';

      if (analyzerType === 'linkedin') {
        userPrompt = `Analyze this LinkedIn profile:\n\n${textInput}\n\nProvide:\n1. Rizz Score (0-100)\n2. Honest assessment\n3. Top 3 improvements\n4. Rewritten version`;
      } else if (analyzerType === 'instagram') {
        userPrompt = `Roast this Instagram bio:\n\n${textInput}\n\nProvide:\n1. Cringe Score (0-100)\n2. Savage roast\n3. What's wrong\n4. Better version`;
      } else if (analyzerType === 'dating') {
        userPrompt = `Rate this dating profile:\n\n${textInput}\n\nProvide:\n1. Swipe-Right Score (0-100)\n2. Honest roast\n3. Red flags\n4. Improved version`;
      } else {
        userPrompt = "Analyze the vibe and give a rizz score with a funny roast.";
      }

      const aiData = await callGroqAPI([
        { role: 'user', content: userPrompt }
      ], analyzerType, {
        username: currentUser.username,
        rizzScore: currentUser.rizzScore,
        rank: currentUser.rank
      });

      const aiResponse = aiData.message;
      const extractedScores = aiData.scores;

      // Calculate scores
      const baseRizz = extractedScores?.overall || (65 + Math.random() * 30);
      const rizzScore = calculateRizzScore(baseRizz, {
        confidence: Math.random() * 2,
        creativity: Math.random() * 2,
        authenticity: Math.random() * 2
      });
      
      const mainCharacterScore = Math.round((70 + Math.random() * 28) * 100) / 100;
      const npcLevel = Math.round((5 + Math.random() * 30) * 100) / 100;
      const rank = getRankFromScore(rizzScore);

      const analysisResults = {
        mainCharacterScore,
        npcLevel,
        rizzScore,
        overallScore: Math.round(((mainCharacterScore + rizzScore + (100 - npcLevel)) / 3) * 100) / 100,
        aiAnalysis: aiResponse,
        oneLiner: aiResponse.split('\n')[0] || "AI is impressed! 🔥",
        vibe: rank.emoji + ' ' + rank.name,
        rank: rank.name,
        rankData: rank,
        uploadType: analyzerType,
        timestamp: Date.now()
      };

      // Get detailed breakdown
      const breakdown = getScoreBreakdown(analyzerType, aiResponse);
      breakdown.overall = analysisResults.overallScore;
      setScoreBreakdown(breakdown);

      setResults(analysisResults);
      setAnalyzing(false);
      setStep('results');

      // Update user in database
      try {
        const xpGain = 10 + Math.floor(rizzScore / 10);
        const newXP = (currentUser.xp || 0) + xpGain;
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
          rizzScore: rizzScore,
          mainCharacterScore: mainCharacterScore,
          npcLevel: npcLevel,
          rank: rank.name,
          xp: newXP,
          lastActive: serverTimestamp()
        });

        // Save to score history
        await addDoc(collection(db, 'scoreHistory'), {
          userId: currentUser.uid,
          score: rizzScore,
          type: analyzerType,
          rank: rank.name,
          timestamp: serverTimestamp()
        });

        setCurrentUser({ ...currentUser, rizzScore, rank: rank.name, xp: newXP });
        
        // Check achievements
        const userStats = {
          totalScans: (currentUser.totalScans || 0) + 1,
          highestScore: Math.max(currentUser.highestScore || 0, rizzScore),
          loginStreak: currentUser.loginStreak || 1,
          achievements: currentUser.achievements || []
        };
        
        const newAchievements = checkAchievements(userStats);
        if (newAchievements.length > 0) {
          setShowAchievementModal(newAchievements[0]);
          success(`Achievement unlocked: ${newAchievements[0].name}! 🏆`);
        }

        info(`+${xpGain} XP earned! ⚡`);
        loadLeaderboard();
      } catch (err) {
        console.error('Error updating score:', err);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalyzing(false);
      showError(error.message || 'AI analysis failed. Try again!');
      setStep('upload');
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: currentUser.username,
      text: messageInput,
      timestamp: Date.now(),
      isUser: true
    };

    setMessages([...messages, newMessage]);
    const userText = messageInput;
    setMessageInput('');

    if (chatMode === 'ai') {
      setAiThinking(true);

      try {
        const chatHistory = messages.slice(-5).map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        }));

        const aiData = await callGroqAPI([
          ...chatHistory,
          { role: 'user', content: userText }
        ], 'chat', {
          username: currentUser.username,
          rizzScore: currentUser.rizzScore,
          rank: currentUser.rank
        });

        setAiThinking(false);

        const aiMessage = {
          id: Date.now() + 1,
          sender: 'Rizzculator AI',
          text: aiData.message,
          timestamp: Date.now(),
          isUser: false
        };

        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        setAiThinking(false);
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'Rizzculator AI',
          text: error.message || "Sorry, I'm having trouble right now. Try again! 🤖",
          timestamp: Date.now(),
          isUser: false
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const reset = () => {
    setStep('landing');
    setAnalyzerType('selfie');
    setUploadedImage(null);
    setChatImage(null);
    setTextInput('');
    setResults(null);
    setScoreBreakdown(null);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setStep('landing');
      setAuthForm({ email: '', password: '', username: '', country: '', state: '' });
      info('Logged out successfully!');
    } catch (err) {
      console.error('Logout error:', err);
      showError('Logout failed!');
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'selfie') {
          setUploadedImage(reader.result);
        } else if (type === 'chat') {
          setChatImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openProfileView = (user) => {
    setProfileUser(user);
    setShowProfile(true);
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white">Loading Rizzculator...</h2>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-black mb-2 bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                Rizzculator
              </h1>
              <p className="text-gray-200 text-sm">AI-Powered Vibe Analysis 🤖</p>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                }}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Login
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setError('');
                }}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <input
                  type="text"
                  placeholder="Username"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />

              {authMode === 'signup' && (
                <>
                  <select
                    value={authForm.country}
                    onChange={(e) => setAuthForm({ ...authForm, country: e.target.value, state: '' })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  >
                    <option value="" className="bg-gray-800">Select Country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country} className="bg-gray-800">
                        {country}
                      </option>
                    ))}
                  </select>

                  {authForm.country === 'United States' && (
                    <select
                      value={authForm.state}
                      onChange={(e) => setAuthForm({ ...authForm, state: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="" className="bg-gray-800">Select State (Optional)</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state} className="bg-gray-800">
                          {state}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 hover:from-yellow-600 hover:via-pink-600 hover:to-purple-700 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 text-white">
      <Notifications notifications={notifications} onDismiss={removeNotification} />
      
      {showAchievementModal && (
        <AchievementUnlockModal
          achievement={showAchievementModal}
          onClose={() => setShowAchievementModal(null)}
        />
      )}

      {showDMs && (
        <DMSystem
          currentUser={currentUser}
          onClose={() => setShowDMs(false)}
          allUsers={allUsers}
        />
      )}

      {showProfile && profileUser && (
        <UserProfile
          user={profileUser}
          currentUser={currentUser}
          onClose={() => {
            setShowProfile(false);
            setProfileUser(null);
          }}
          onUpvote={upvoteUser}
        />
      )}

      {/* Header */}
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                Rizzculator
              </h1>
              <span className="hidden sm:inline text-xs bg-gradient-to-r from-green-400 to-blue-500 px-2 py-1 rounded-full font-bold">
                AI v2.0
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setStep('landing')}
                className="hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Analyze
              </button>
              <button
                onClick={() => openProfileView(currentUser)}
                className="hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => setShowDMs(true)}
                className="hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 relative"
              >
                <MessageSquare className="w-4 h-4" />
                Messages
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowChat(true)}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                AI Chat
              </button>
              <button
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold"
              >
                Logout
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="md:hidden bg-white/10 hover:bg-white/20 p-2 rounded-xl"
            >
              {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {showMenu && (
            <div className="md:hidden mt-4 space-y-2">
              <button
                onClick={() => {
                  setStep('landing');
                  setShowMenu(false);
                }}
                className="w-full bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Analyze
              </button>
              <button
                onClick={() => {
                  openProfileView(currentUser);
                  setShowMenu(false);
                }}
                className="w-full bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  setShowDMs(true);
                  setShowMenu(false);
                }}
                className="w-full bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl flex items-center gap-2 relative"
              >
                <MessageSquare className="w-4 h-4" />
                Messages
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowChat(true);
                  setShowMenu(false);
                }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 px-4 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                AI Chat
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="w-full bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl font-bold"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Section */}
          <div className="lg:col-span-2 space-y-6">
            {step === 'landing' && (
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center">
                  <h2 className="text-3xl sm:text-4xl font-black mb-4">
                    Choose Your Analysis 🎯
                  </h2>
                  <p className="text-gray-300 mb-8">
                    Select what you want AI to roast... I mean analyze! 😈
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setAnalyzerType('selfie');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 p-6 rounded-2xl transition-all hover:scale-105"
                    >
                      <Camera className="w-12 h-12 mx-auto mb-3" />
                      <h3 className="font-bold text-xl mb-2">Selfie Analysis</h3>
                      <p className="text-sm text-gray-200">
                        Get your rizz score from your photo
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('chat');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 p-6 rounded-2xl transition-all hover:scale-105"
                    >
                      <MessageSquare className="w-12 h-12 mx-auto mb-3" />
                      <h3 className="font-bold text-xl mb-2">Chat Screenshot</h3>
                      <p className="text-sm text-gray-200">
                        Analyze your text game
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('linkedin');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 p-6 rounded-2xl transition-all hover:scale-105"
                    >
                      <Linkedin className="w-12 h-12 mx-auto mb-3" />
                      <h3 className="font-bold text-xl mb-2">LinkedIn Profile</h3>
                      <p className="text-sm text-gray-200">
                        Professional rizz check
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('instagram');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 p-6 rounded-2xl transition-all hover:scale-105"
                    >
                      <Instagram className="w-12 h-12 mx-auto mb-3" />
                      <h3 className="font-bold text-xl mb-2">Instagram Bio</h3>
                      <p className="text-sm text-gray-200">
                        Social media vibe check
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('dating');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 p-6 rounded-2xl transition-all hover:scale-105 sm:col-span-2"
                    >
                      <Heart className="w-12 h-12 mx-auto mb-3" />
                      <h3 className="font-bold text-xl mb-2">Dating Profile</h3>
                      <p className="text-sm text-gray-200">
                        Get that swipe-right score
                      </p>
                    </button>
                  </div>
                </div>

                {/* User Stats */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Your Stats
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-black/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-pink-400">
                        {currentUser.rizzScore?.toFixed(0) || 0}
                      </div>
                      <div className="text-xs text-gray-400">Rizz Score</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {currentUser.upvotes || 0}
                      </div>
                      <div className="text-xs text-gray-400">Upvotes</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {currentUser.xp || 0}
                      </div>
                      <div className="text-xs text-gray-400">XP</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-orange-400">
                        {currentUser.loginStreak || 0}🔥
                      </div>
                      <div className="text-xs text-gray-400">Day Streak</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'upload' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20">
                <button
                  onClick={() => setStep('landing')}
                  className="mb-6 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold"
                >
                  ← Back
                </button>

                <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
                  {analyzerType === 'selfie' && '📸 Upload Your Selfie'}
                  {analyzerType === 'chat' && '💬 Upload Chat Screenshot'}
                  {analyzerType === 'linkedin' && '💼 Paste LinkedIn Profile'}
                  {analyzerType === 'instagram' && '📱 Paste Instagram Bio'}
                  {analyzerType === 'dating' && '❤️ Paste Dating Profile'}
                </h2>

                <div className="space-y-6">
                  {(analyzerType === 'selfie' || analyzerType === 'chat') && (
                    <div>
                      <input
                        ref={analyzerType === 'selfie' ? selfieInputRef : chatInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, analyzerType)}
                        className="hidden"
                      />
                      
                      {(analyzerType === 'selfie' ? uploadedImage : chatImage) ? (
                        <div className="relative">
                          <img
                            src={analyzerType === 'selfie' ? uploadedImage : chatImage}
                            alt="Upload"
                            className="w-full rounded-2xl"
                          />
                          <button
                            onClick={() => analyzerType === 'selfie' ? setUploadedImage(null) : setChatImage(null)}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 p-2 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => (analyzerType === 'selfie' ? selfieInputRef : chatInputRef).current?.click()}
                          className="w-full border-4 border-dashed border-white/30 hover:border-pink-500 rounded-2xl p-12 transition-all hover:bg-white/5"
                        >
                          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-bold">Click to Upload Image</p>
                          <p className="text-sm text-gray-400 mt-2">
                            {analyzerType === 'selfie' 
                              ? 'Upload your best selfie for AI analysis'
                              : 'Upload a screenshot of your chat'
                            }
                          </p>
                        </button>
                      )}
                    </div>
                  )}

                  {(analyzerType === 'linkedin' || analyzerType === 'instagram' || analyzerType === 'dating') && (
                    <div>
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={
                          analyzerType === 'linkedin'
                            ? 'Paste your LinkedIn headline and summary here...'
                            : analyzerType === 'instagram'
                            ? 'Paste your Instagram bio here...'
                            : 'Paste your dating profile text here...'
                        }
                        className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[200px]"
                      />
                    </div>
                  )}

                  {((analyzerType === 'selfie' && uploadedImage) || 
                    (analyzerType === 'chat' && chatImage) ||
                    (analyzerType === 'linkedin' && textInput.trim()) ||
                    (analyzerType === 'instagram' && textInput.trim()) ||
                    (analyzerType === 'dating' && textInput.trim())) && (
                    <button
                      onClick={analyzeWithAI}
                      className="w-full bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 hover:from-yellow-600 hover:via-pink-600 hover:to-purple-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Analyze with AI 🤖
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 'analyzing' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-yellow-400 animate-pulse" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-6">AI Analyzing Your Vibe...</h2>
                <div className="space-y-2 text-gray-300">
                  <p className="animate-pulse">🤖 Running AI algorithms...</p>
                  <p className="animate-pulse">🔍 Detecting rizz patterns...</p>
                  <p className="animate-pulse">💭 Generating roast...</p>
                </div>
              </div>
            )}

            {step === 'results' && results && (
              <div className="space-y-6">
                <div ref={resultsRef} className="bg-gradient-to-br from-pink-500/30 via-purple-600/30 to-blue-600/30 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border-4 border-white/30 relative">
                  <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-xs font-bold">
                    Rizzculator AI 🤖
                  </div>

                  <div className="text-center mb-6">
                    <h2 className="text-3xl sm:text-4xl font-black mb-2">{currentUser.username}</h2>
                    <p className="text-gray-300 text-sm sm:text-base">📍 {currentUser.country}{currentUser.state && `, ${currentUser.state}`}</p>
                    <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm font-black px-4 py-1 rounded-full mt-2">
                      {results.rank}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                    <div className="bg-black/40 rounded-2xl p-3 sm:p-4 text-center border-2 border-pink-500/50">
                      <div className="text-3xl sm:text-4xl mb-1">😎</div>
                      <div className="text-2xl sm:text-3xl font-black text-pink-400">{results.mainCharacterScore.toFixed(2)}</div>
                      <div className="text-xs text-gray-300">Main Character</div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 sm:p-4 text-center border-2 border-purple-500/50">
                      <div className="text-3xl sm:text-4xl mb-1">💋</div>
                      <div className="text-2xl sm:text-3xl font-black text-purple-400">{results.rizzScore.toFixed(2)}</div>
                      <div className="text-xs text-gray-300">Rizz Score</div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 sm:p-4 text-center border-2 border-blue-500/50">
                      <div className="text-3xl sm:text-4xl mb-1">🤖</div>
                      <div className="text-2xl sm:text-3xl font-black text-blue-400">{results.npcLevel.toFixed(2)}</div>
                      <div className="text-xs text-gray-300">NPC Level</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-500/30 to-orange-600/30 rounded-2xl p-6 mb-6 text-center border-2 border-yellow-500/50">
                    <div className="text-sm font-bold text-yellow-300 mb-1">OVERALL VIBE</div>
                    <div className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-yellow-300 to-red-500 bg-clip-text text-transparent">
                      {results.overallScore.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-5 border-2 border-pink-500/40">
                      <div className="text-sm font-bold text-pink-300 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI ANALYSIS:
                      </div>
                      <div className="text-sm whitespace-pre-line">{results.aiAnalysis}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => alert('Screenshot this to share! 📸')}
                      className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 py-3 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                    <button
                      onClick={reset}
                      className="bg-white/10 hover:bg-white/20 py-3 sm:py-4 rounded-xl font-bold"
                    >
                      Again
                    </button>
                  </div>
                </div>

                {scoreBreakdown && (
                  <ScoreBreakdown breakdown={scoreBreakdown} type={analyzerType} />
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="lg:block">
            <Leaderboard
              leaderboardData={leaderboardData}
              currentUser={currentUser}
              onUpvote={upvoteUser}
              onFilterChange={setLeaderboardFilter}
              filter={leaderboardFilter}
            />
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-full sm:w-96 h-[500px] bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 flex flex-col shadow-2xl z-50 mx-4 sm:mx-0">
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Bot className="w-5 h-5 text-yellow-400" />
                Rizzculator AI Chat
              </h3>
              <button onClick={() => setShowChat(false)} className="bg-white/10 hover:bg-white/20 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400">Powered by Groq AI 🚀</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-50 text-yellow-400" />
                <p>Chat with Rizzculator AI!</p>
                <p className="text-xs mt-1">Get roasted, get advice 🔥</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.isUser ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-white/20 border border-white/10'
                }`}>
                  {!msg.isUser && <p className="text-xs text-yellow-400 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />{msg.sender}</p>}
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {aiThinking && (
              <div className="flex justify-start">
                <div className="bg-white/20 border border-white/10 rounded-2xl px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-xs text-gray-400">AI thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-white/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !aiThinking && sendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                onClick={sendMessage}
                disabled={aiThinking || !messageInput.trim()}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
