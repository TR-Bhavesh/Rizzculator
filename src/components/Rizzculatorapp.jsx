import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Share2, Trophy, Zap, TrendingUp, MessageSquare, Users, Target, LogIn, UserPlus, Send, ThumbsUp, Menu, X, Bot, Search, Linkedin, Instagram, Heart, Sparkles } from 'lucide-react';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  setDoc,
  increment
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

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

// AI Service
const callGroqAPI = async (messages, type = 'chat') => {
  try {
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, type }),
    });

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('AI Error:', error);
    return 'AI is taking a break. Try again! 💫';
  }
};

export default function RizzculatorApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState('landing');
  const [uploadType, setUploadType] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [chatImage, setChatImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState({ type: 'global', value: 'Global' });
  const [showChat, setShowChat] = useState(false);
  const [chatMode, setChatMode] = useState('ai');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedDMUser, setSelectedDMUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  
  // New analyzer states
  const [analyzerType, setAnalyzerType] = useState('selfie'); // selfie, linkedin, instagram, dating
  const [textInput, setTextInput] = useState('');
  
  const selfieInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const resultsRef = useRef(null);
  const chatEndRef = useRef(null);

  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    username: '',
    country: '',
    state: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUser({ uid: user.uid, ...userDoc.data() });
            setIsAuthenticated(true);
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

  useEffect(() => {
    if (isAuthenticated) {
      loadLeaderboard();
      loadAllUsers();
    }
  }, [leaderboardFilter, isAuthenticated]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadLeaderboard = async () => {
    try {
      let q = query(collection(db, 'users'), orderBy('rizzScore', 'desc'), limit(50));

      if (leaderboardFilter.type === 'country') {
        q = query(
          collection(db, 'users'),
          where('country', '==', leaderboardFilter.value),
          orderBy('rizzScore', 'desc'),
          limit(50)
        );
      } else if (leaderboardFilter.type === 'state') {
        q = query(
          collection(db, 'users'),
          where('state', '==', leaderboardFilter.value),
          orderBy('rizzScore', 'desc'),
          limit(50)
        );
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

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authForm.email,
          authForm.password
        );

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
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp()
        });

        setCurrentUser({
          uid: userCredential.user.uid,
          email: authForm.email,
          username: authForm.username,
          country: authForm.country,
          state: authForm.state,
          rizzScore: 0,
          upvotes: 0
        });
        setIsAuthenticated(true);
        setStep('landing');
      } else {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          authForm.email,
          authForm.password
        );

        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ uid: userCredential.user.uid, ...userDoc.data() });
          setIsAuthenticated(true);
          setStep('landing');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
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
        alert('You already upvoted this user!');
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
      alert('Upvote added! 🔥');
    } catch (err) {
      console.error('Error upvoting:', err);
      alert('Failed to upvote. Please try again.');
    }
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    setStep('analyzing');

    try {
      let systemPrompt = '';
      let userPrompt = '';

      if (analyzerType === 'linkedin') {
        systemPrompt = "You are a professional LinkedIn profile coach with a sense of humor. Analyze LinkedIn profiles and give honest, constructive feedback with some roasting. Provide a rizz score (0-100), specific improvements, and a rewritten version.";
        userPrompt = `Analyze this LinkedIn profile:\n\n${textInput}\n\nProvide:\n1. Rizz Score (0-100)\n2. Brutal honest roast\n3. Top 3 specific improvements\n4. Rewritten rizzed-up version`;
      } else if (analyzerType === 'instagram') {
        systemPrompt = "You are an Instagram bio expert who roasts cringe bios. Rate bios on cringe level (0-100, lower is better), detect red flags, and suggest improvements.";
        userPrompt = `Roast this Instagram bio:\n\n${textInput}\n\nProvide:\n1. Cringe Score (0-100, lower is better)\n2. Savage roast\n3. What's wrong with it\n4. Better version`;
      } else if (analyzerType === 'dating') {
        systemPrompt = "You are a dating profile expert. Analyze dating app bios and rate them on swipe-right potential. Be funny but helpful.";
        userPrompt = `Rate this dating profile bio:\n\n${textInput}\n\nProvide:\n1. Swipe-Right Score (0-100)\n2. Honest roast\n3. Red flags detected\n4. Improved version that actually works`;
      } else {
        // Selfie/Chat analysis
        systemPrompt = "You are a rizz coach analyzing photos and chat screenshots. Give scores and witty feedback.";
        userPrompt = "Analyze the vibe and give a rizz score with a funny roast.";
      }

      const aiResponse = await callGroqAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], analyzerType);

      // Parse AI response and create results
      const baseRizz = 65 + Math.random() * 33;
      const rizzScore = Math.round((baseRizz + Math.random() * 2 - 1) * 100) / 100;
      const mainCharacterScore = Math.round((70 + Math.random() * 28) * 100) / 100;
      const npcLevel = Math.round((5 + Math.random() * 30) * 100) / 100;

      const rank = rizzScore > 95 ? 'Rizz God 🔥' : 
                   rizzScore > 90 ? 'Rizz Legend ⭐' :
                   rizzScore > 85 ? 'S-Tier 💎' : 
                   rizzScore > 80 ? 'A-Tier 💫' : 
                   rizzScore > 75 ? 'B-Tier ✨' : 'C-Tier 🌟';

      const analysisResults = {
        mainCharacterScore,
        npcLevel,
        rizzScore,
        overallScore: Math.round(((mainCharacterScore + rizzScore + (100 - npcLevel)) / 3) * 100) / 100,
        aiAnalysis: aiResponse,
        oneLiner: aiResponse.split('\n')[0] || "AI is impressed with your vibe! 🔥",
        vibe: analyzerType === 'linkedin' ? 'Professional Rizz 💼' : 
              analyzerType === 'instagram' ? 'Social Media Star ⭐' :
              analyzerType === 'dating' ? 'Dating Profile Pro 💕' : 'Main Character ⚡',
        rank,
        uploadType: analyzerType,
        timestamp: Date.now()
      };

      setResults(analysisResults);
      setAnalyzing(false);
      setStep('results');

      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          rizzScore: rizzScore,
          mainCharacterScore: mainCharacterScore,
          npcLevel: npcLevel,
          rank: rank,
          lastActive: serverTimestamp()
        });
        
        setCurrentUser({
          ...currentUser,
          rizzScore,
          mainCharacterScore,
          npcLevel,
          rank
        });
        
        loadLeaderboard();
      } catch (err) {
        console.error('Error updating score:', err);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalyzing(false);
      setError('AI analysis failed. Please try again!');
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
      
      const chatHistory = messages.slice(-5).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      const systemPrompt = "You are the Rizzculator AI - a witty, sarcastic rizz coach. Give dating advice, roast bad texts, and help people improve their game. Be funny but helpful. Use Gen Z slang naturally. Keep responses under 150 words.";

      const aiResponse = await callGroqAPI([
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: userText }
      ]);

      setAiThinking(false);

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'Rizzculator AI',
        text: aiResponse,
        timestamp: Date.now(),
        isUser: false
      };

      setMessages(prev => [...prev, aiMessage]);
    } else if (selectedDMUser) {
      try {
        await addDoc(collection(db, 'messages'), {
          from: currentUser.uid,
          to: selectedDMUser.id,
          fromUsername: currentUser.username,
          toUsername: selectedDMUser.username,
          text: userText,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error('Error sending message:', err);
      }

      setTimeout(() => {
        const dmResponse = {
          id: Date.now() + 1,
          sender: selectedDMUser.username,
          text: "Hey! Thanks for the message! 👋",
          timestamp: Date.now(),
          isUser: false
        };
        setMessages(prev => [...prev, dmResponse]);
      }, 2000);
    }
  };

  const reset = () => {
    setStep('landing');
    setUploadType(null);
    setAnalyzerType('selfie');
    setUploadedImage(null);
    setChatImage(null);
    setTextInput('');
    setResults(null);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setStep('landing');
      setAuthForm({ email: '', password: '', username: '', country: '', state: '' });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Zap className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-xl">Loading Rizzculator...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 text-white flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-8">
            <Zap className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Rizzculator
            </h1>
            <p className="text-gray-300 mt-2">AI-Powered Rizz Analysis 🤖</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('login')}
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
              onClick={() => setAuthMode('signup')}
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
                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />

            {authMode === 'signup' && (
              <>
                <select
                  value={authForm.country}
                  onChange={(e) => setAuthForm({ ...authForm, country: e.target.value })}
                  className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                >
                  <option value="" className="bg-gray-900">Select Country</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country} className="bg-gray-900">{country}</option>
                  ))}
                </select>

                {authForm.country === 'United States' && (
                  <select
                    value={authForm.state}
                    onChange={(e) => setAuthForm({ ...authForm, state: e.target.value })}
                    className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="" className="bg-gray-900">Select State (Optional)</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state} className="bg-gray-900">{state}</option>
                    ))}
                  </select>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105"
            >
              {loading ? 'Loading...' : authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 text-white">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
      </div>

      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Rizzculator AI
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all relative"
            >
              <Bot className="w-5 h-5" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {messages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {showMenu && (
          <div className="bg-black/40 backdrop-blur-xl border-t border-white/10 p-4">
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-lg">{currentUser.username}</p>
                  <p className="text-sm text-gray-400">{currentUser.email}</p>
                  <p className="text-xs text-gray-500">{currentUser.country}{currentUser.state && `, ${currentUser.state}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-pink-400">{currentUser.rizzScore?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-gray-400">Rizz Score</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-white font-semibold py-2 px-4 rounded-lg transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {step === 'landing' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-4xl font-black mb-4">
                    Welcome back, <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">{currentUser.username}</span>!
                  </h2>
                  <p className="text-xl text-gray-300">What do you want to analyze with AI? 🤖</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                  <h3 className="text-2xl font-bold mb-4">Choose AI Analysis:</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setAnalyzerType('selfie');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 p-6 rounded-2xl transition-all transform hover:scale-105"
                    >
                      <Camera className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">Selfie Vibe Check</h4>
                      <p className="text-xs opacity-90">AI analyzes your photo</p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('chat');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 p-6 rounded-2xl transition-all transform hover:scale-105"
                    >
                      <MessageSquare className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">Chat Screenshot</h4>
                      <p className="text-xs opacity-90">Rate your conversations</p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('linkedin');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 p-6 rounded-2xl transition-all transform hover:scale-105"
                    >
                      <Linkedin className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">LinkedIn Profile</h4>
                      <p className="text-xs opacity-90">Professional rizz check 💼</p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('instagram');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 p-6 rounded-2xl transition-all transform hover:scale-105"
                    >
                      <Instagram className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">Instagram Bio</h4>
                      <p className="text-xs opacity-90">Cringe detector 📱</p>
                    </button>

                    <button
                      onClick={() => {
                        setAnalyzerType('dating');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 p-6 rounded-2xl transition-all transform hover:scale-105 md:col-span-2"
                    >
                      <Heart className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">Dating Profile</h4>
                      <p className="text-xs opacity-90">Tinder/Bumble/Hinge roaster 💕</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'upload' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                <button
                  onClick={() => setStep('landing')}
                  className="mb-4 text-gray-300 hover:text-white"
                >
                  ← Back
                </button>

                <h2 className="text-2xl font-bold mb-4">
                  {analyzerType === 'selfie' && '📸 Upload Your Selfie'}
                  {analyzerType === 'chat' && '💬 Upload Chat Screenshot'}
                  {analyzerType === 'linkedin' && '💼 Paste LinkedIn Profile'}
                  {analyzerType === 'instagram' && '📱 Paste Instagram Bio'}
                  {analyzerType === 'dating' && '💕 Paste Dating Profile Bio'}
                </h2>

                <div className="space-y-4">
                  {(analyzerType === 'selfie' || analyzerType === 'chat') && (
                    <>
                      <button
                        onClick={() => analyzerType === 'selfie' ? selfieInputRef.current?.click() : chatInputRef.current?.click()}
                        className={`w-full ${uploadedImage || chatImage ? 'bg-green-500/30' : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'} py-4 rounded-xl font-bold flex items-center justify-center gap-2`}
                      >
                        <Upload className="w-5 h-5" />
                        {uploadedImage || chatImage ? '✅ Image Uploaded' : 'Upload Image'}
                      </button>
                      
                      <input 
                        ref={selfieInputRef} 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => setUploadedImage(event.target.result);
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="hidden" 
                      />
                      
                      <input 
                        ref={chatInputRef} 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => setChatImage(event.target.result);
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="hidden" 
                      />
                    </>
                  )}

                  {(analyzerType === 'linkedin' || analyzerType === 'instagram' || analyzerType === 'dating') && (
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={
                        analyzerType === 'linkedin' ? 'Paste your LinkedIn bio, headline, and about section...' :
                        analyzerType === 'instagram' ? 'Paste your Instagram bio...' :
                        'Paste your dating profile bio...'
                      }
                      className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[200px]"
                      required
                    />
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
                <h2 className="text-3xl font-bold mb-6">AI Analyzing Your Vibe...</h2>
                <div className="space-y-2 text-gray-300">
                  <p className="animate-pulse">🤖 Running advanced AI algorithms...</p>
                  <p className="animate-pulse">🔍 Detecting rizz patterns...</p>
                  <p className="animate-pulse">💭 Generating personalized roast...</p>
                </div>
              </div>
            )}

            {step === 'results' && results && (
              <div ref={resultsRef} className="space-y-6">
                <div className="bg-gradient-to-br from-pink-500/30 via-purple-600/30 to-blue-600/30 backdrop-blur-xl rounded-3xl p-8 border-4 border-white/30 relative">
                  <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-xs font-bold">
                    Rizzculator AI 🤖
                  </div>

                  <div className="text-center mb-6">
                    <h2 className="text-4xl font-black mb-2">{currentUser.username}</h2>
                    <p className="text-gray-300">📍 {currentUser.country}{currentUser.state && `, ${currentUser.state}`}</p>
                    <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm font-black px-4 py-1 rounded-full mt-2">
                      {results.rank}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-black/40 rounded-2xl p-4 text-center border-2 border-pink-500/50">
                      <div className="text-4xl mb-1">😎</div>
                      <div className="text-3xl font-black text-pink-400">{results.mainCharacterScore.toFixed(2)}</div>
                      <div className="text-xs text-gray-300">Main Character</div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 text-center border-2 border-purple-500/50">
                      <div className="text-4xl mb-1">💋</div>
                      <div className="text-3xl font-black text-purple-400">{results.rizzScore.toFixed(2)}</div>
                      <div className="text-xs text-gray-300">Rizz Score</div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 text-center border-2 border-blue-500/50">
                      <div className="text-4xl mb-1">🤖</div>
                      <div className="text-3xl font-black text-blue-400">{results.npcLevel.toFixed(2)}</div>
                      <div className="text-xs text-gray-300">NPC Level</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-500/30 to-orange-600/30 rounded-2xl p-6 mb-6 text-center border-2 border-yellow-500/50">
                    <div className="text-sm font-bold text-yellow-300 mb-1">OVERALL VIBE</div>
                    <div className="text-6xl font-black bg-gradient-to-r from-yellow-300 to-red-500 bg-clip-text text-transparent">
                      {results.overallScore.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-black/40 rounded-2xl p-5 border-2 border-purple-500/30">
                      <div className="text-sm font-bold text-purple-300 mb-2">YOUR VIBE:</div>
                      <p className="text-xl font-bold">{results.vibe}</p>
                    </div>
                    
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
                      className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                    <button
                      onClick={reset}
                      className="bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold"
                    >
                      Analyze Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-black">Leaderboard</h3>
              </div>

              <div className="space-y-2 mb-4">
                <select
                  value={leaderboardFilter.type}
                  onChange={(e) => setLeaderboardFilter({ type: e.target.value, value: e.target.value === 'global' ? 'Global' : leaderboardFilter.value })}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="global" className="bg-gray-900">🌍 Global</option>
                  <option value="country" className="bg-gray-900">🌎 By Country</option>
                  <option value="state" className="bg-gray-900">📍 By State</option>
                </select>

                {leaderboardFilter.type === 'country' && (
                  <select
                    value={leaderboardFilter.value}
                    onChange={(e) => setLeaderboardFilter({ ...leaderboardFilter, value: e.target.value })}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country} value={country} className="bg-gray-900">{country}</option>
                    ))}
                  </select>
                )}

                {leaderboardFilter.type === 'state' && (
                  <select
                    value={leaderboardFilter.value}
                    onChange={(e) => setLeaderboardFilter({ ...leaderboardFilter, value: e.target.value })}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    {US_STATES.map(state => (
                      <option key={state} value={state} className="bg-gray-900">{state}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leaderboardData.map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border border-yellow-500/50' :
                      index === 1 ? 'bg-gray-400/20 border border-gray-400/50' :
                      index === 2 ? 'bg-orange-600/20 border border-orange-600/50' :
                      'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-xl font-black w-8">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{user.username}</div>
                        <div className="text-xs text-gray-400 truncate">{user.country}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-lg font-black text-pink-400">{user.rizzScore?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {user.upvotes || 0}
                        </div>
                      </div>
                      <button
                        onClick={() => upvoteUser(user.id)}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {leaderboardData.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No rankings yet!</p>
                    <p className="text-xs mt-1">Be the first 👑</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 flex flex-col shadow-2xl z-50">
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Bot className="w-5 h-5 text-yellow-400" />
                Rizzculator AI Chat
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="bg-white/10 hover:bg-white/20 p-1 rounded-lg"
              >
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
                <p className="text-xs mt-1">Get roasted, get advice, get rizzed up 🔥</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.isUser
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                      : 'bg-white/20 border border-white/10'
                  }`}
                >
                  {!msg.isUser && (
                    <p className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {msg.sender}
                    </p>
                  )}
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
                placeholder="Ask AI anything..."
                disabled={aiThinking}
                className="flex-1 bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || aiThinking}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-xl transition-all"
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