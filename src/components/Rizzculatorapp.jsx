import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Share2, Trophy, Zap, TrendingUp, MessageSquare, Users, Target, LogIn, UserPlus, Send, ThumbsUp, Menu, X, Bot, Search } from 'lucide-react';
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

// Country and State data
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

  // Listen for auth state changes
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

  // Load leaderboard from Firestore
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

  // Load all users for DM search
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

  // Handle Authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!authForm.username || !authForm.email || !authForm.password || !authForm.country) {
          setError('Please fill in all required fields!!');
          setLoading(false);
          return;
        }

        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authForm.email,
          authForm.password
        );

        // Create user document in Firestore
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
        // Login
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

  // Upvote user
  const upvoteUser = async (userId) => {
    if (!currentUser) return;

    try {
      const upvoteRef = doc(db, 'upvotes', `${currentUser.uid}_${userId}`);
      const upvoteDoc = await getDoc(upvoteRef);

      if (upvoteDoc.exists()) {
        alert('You have already upvoted this user!');
        return;
      }

      // Create upvote record
      await setDoc(upvoteRef, {
        from: currentUser.uid,
        to: userId,
        timestamp: serverTimestamp()
      });

      // Increment upvotes
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

  // Analyze vibe
  const analyzeVibe = () => {
    setAnalyzing(true);
    setStep('analyzing');

    setTimeout(async () => {
      const baseRizz = 65 + Math.random() * 33;
      const uniqueOffset = Math.random() * 2 - 1;
      const rizzScore = Math.round((baseRizz + uniqueOffset) * 100) / 100;
      
      const mainCharacterScore = Math.round((70 + Math.random() * 28 + Math.random() * 2 - 1) * 100) / 100;
      const npcLevel = Math.round((5 + Math.random() * 30 + Math.random() * 2 - 1) * 100) / 100;
      
      const oneLiners = [
        "You look like you just rejected your villain arc to start a podcast.",
        "Certified Side Character Energyy 💀",
        `${Math.floor(rizzScore)}% Rizz — Elon DMs you for advice.`,
        "Main Character Energy: You walk in slow motion when no one's watching.",
        "Your texts probably get screenshot and sent to group chats.",
        "You're the friend everyone calls when they need relationship advice.",
        "Plot twist: You're the mentor character everyone underestimated.",
        "Your DMs are a battlefield and you're winning every war.",
        "Netflix would green-light your life story in 3 seconds.",
        "You text 'hey' and people write paragraphs back.",
        "The camera follows YOU in group photos.",
        "Your screenshot game is legendary, admit it.",
        "You give advice like you've lived 9 lives.",
        "Your energy enters the room before you do.",
        "Supporting cast? Never heard of her.",
        "You're the plot twist everyone saw coming but still loved."
      ];

      const vibes = [
        "Protagonist Energy ⚡",
        "Love Interest Material 💕",
        "Mysterious Stranger Vibes 🌙",
        "Final Boss Status 👑",
        "Comic Relief (But Make It Hot) 😂",
        "Mentor Figure Energy 🧠",
        "Villain Origin Story 🔥",
        "Supporting Cast Royalty ✨"
      ];

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
        oneLiner: oneLiners[Math.floor(Math.random() * oneLiners.length)],
        vibe: vibes[Math.floor(Math.random() * vibes.length)],
        rank,
        uploadType,
        timestamp: Date.now()
      };

      setResults(analysisResults);
      setAnalyzing(false);
      setStep('results');

      // Update user score in Firestore
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
    }, 3500);
  };

  // Send message
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
    setMessageInput('');

    if (chatMode === 'ai') {
      setTimeout(() => {
        const aiResponses = [
          "Okay but that text was UNHINGED 💀 Rizz level: Chaotic Good",
          "Not you trying to rizz ME up 😭 Sir/Ma'am, I'm an AI",
          "That message energy? Pure main character syndrome. I respect it 🔥",
          "Bro really said that and thought it was smooth... 7/10 for confidence though",
          "STOP 💀 That's the kind of text that gets you left on read for 3 days",
          "Okay Shakespeare calm down, we get it you can type 😂",
          "Your rizz game is stronger than my processing power ngl",
          "That's either genius or absolutely deranged. Either way, I'm impressed",
          "You're giving 'chronically online' but make it fashion 💅",
          "Not the double text energy 😬 But hey, shooters shoot",
          "POV: You're the main character and everyone else is just living in your story",
          "That text has more layers than my neural network 🧠"
        ];

        const aiMessage = {
          id: Date.now() + 1,
          sender: 'Rizzculator AI',
          text: aiResponses[Math.floor(Math.random() * aiResponses.length)],
          timestamp: Date.now(),
          isUser: false
        };

        setMessages(prev => [...prev, aiMessage]);
      }, 1000);
    } else if (selectedDMUser) {
      // Save DM to Firestore
      try {
        await addDoc(collection(db, 'messages'), {
          from: currentUser.uid,
          to: selectedDMUser.id,
          fromUsername: currentUser.username,
          toUsername: selectedDMUser.username,
          text: messageInput,
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
    setUploadedImage(null);
    setChatImage(null);
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

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 text-white flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-8">
            <Zap className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Rizzculator
            </h1>
            <p className="text-gray-300 mt-2">Join the ultimate rizz ranking platform</p>
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

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-700 to-blue-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Rizzculator
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all relative"
            >
              <MessageSquare className="w-5 h-5" />
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
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {step === 'landing' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-4xl font-black mb-4">
                    Welcome back, <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">{currentUser.username}</span>!
                  </h2>
                  <p className="text-xl text-gray-300">Ready to prove your rizz?</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                  <h3 className="text-2xl font-bold mb-4">Choose Your Scan:</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setUploadType('selfie');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 p-6 rounded-2xl transition-all transform hover:scale-105"
                    >
                      <Camera className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">Selfie</h4>
                      <p className="text-xs opacity-90">Vibe check</p>
                    </button>

                    <button
                      onClick={() => {
                        setUploadType('chat');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 p-6 rounded-2xl transition-all transform hover:scale-105"
                    >
                      <MessageSquare className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">Chat</h4>
                      <p className="text-xs opacity-90">Rizz rating</p>
                    </button>

                    <button
                      onClick={() => {
                        setUploadType('both');
                        setStep('upload');
                      }}
                      className="bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 p-6 rounded-2xl transition-all transform hover:scale-105 relative"
                    >
                      <span className="absolute top-2 right-2 bg-red-500 text-xs font-bold px-2 py-0.5 rounded-full">HOT</span>
                      <Target className="w-10 h-10 mx-auto mb-3" />
                      <h4 className="font-bold mb-1">Full Scan</h4>
                      <p className="text-xs opacity-90">Complete</p>
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

                <div className="space-y-4">
                  {(uploadType === 'selfie' || uploadType === 'both') && (
                    <button
                      onClick={() => selfieInputRef.current?.click()}
                      className={`w-full ${uploadedImage ? 'bg-green-500/30' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'} py-4 rounded-xl font-bold flex items-center justify-center gap-2`}
                    >
                      <Camera className="w-5 h-5" />
                      {uploadedImage ? '✅ Selfie Uploaded' : 'Upload Selfie'}
                    </button>
                  )}

                  {(uploadType === 'chat' || uploadType === 'both') && (
                    <button
                      onClick={() => chatInputRef.current?.click()}
                      className={`w-full ${chatImage ? 'bg-green-500/30' : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'} py-4 rounded-xl font-bold flex items-center justify-center gap-2`}
                    >
                      <MessageSquare className="w-5 h-5" />
                      {chatImage ? '✅ Chat Uploaded' : 'Upload Chat'}
                    </button>
                  )}

                  <input ref={selfieInputRef} type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setUploadedImage(event.target.result);
                      reader.readAsDataURL(file);
                    }
                  }} className="hidden" />

                  <input ref={chatInputRef} type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setChatImage(event.target.result);
                      reader.readAsDataURL(file);
                    }
                  }} className="hidden" />

                  {((uploadType === 'selfie' && uploadedImage) || 
                    (uploadType === 'chat' && chatImage) || 
                    (uploadType === 'both' && uploadedImage && chatImage)) && (
                    <button
                      onClick={analyzeVibe}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-4 rounded-xl font-bold"
                    >
                      Analyze My Rizz 🔥
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
                </div>
                <h2 className="text-3xl font-bold mb-6">AI Analyzing Your Vibe...</h2>
                <div className="space-y-2 text-gray-300">
                  <p className="animate-pulse">🔍 Scanning energy levels...</p>
                  <p className="animate-pulse">💬 Processing rizz quotient...</p>
                  <p className="animate-pulse">🎬 Generating ratings...</p>
                </div>
              </div>
            )}

            {step === 'results' && results && (
              <div ref={resultsRef} className="space-y-6">
                <div className="bg-gradient-to-br from-pink-500/30 via-purple-600/30 to-blue-600/30 backdrop-blur-xl rounded-3xl p-8 border-4 border-white/30 relative">
                  <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-xs font-bold">
                    Rizzculator.ai 🔥
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
                      <div className="text-sm font-bold text-pink-300 mb-2">AI ROAST:</div>
                      <p className="text-lg italic">"{results.oneLiner}"</p>
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
                      Scan Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Sidebar */}
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

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 flex flex-col shadow-2xl z-50">
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Chat
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="bg-white/10 hover:bg-white/20 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setChatMode('ai');
                  setMessages([]);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  chatMode === 'ai'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Bot className="w-4 h-4 inline mr-1" />
                AI Chat
              </button>
              <button
                onClick={() => {
                  setChatMode('dm');
                  setMessages([]);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  chatMode === 'dm'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                DMs
              </button>
            </div>

            {chatMode === 'dm' && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                {searchQuery && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {allUsers
                      .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 5)
                      .map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedDMUser(user);
                            setSearchQuery('');
                            setMessages([]);
                          }}
                          className="w-full text-left px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                        >
                          {user.username} - {user.country}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {chatMode === 'dm' && selectedDMUser && (
              <div className="mt-2 bg-white/20 rounded-lg px-3 py-2">
                <p className="text-sm font-bold">{selectedDMUser.username}</p>
                <p className="text-xs text-gray-400">{selectedDMUser.country}</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                {chatMode === 'ai' ? (
                  <>
                    <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chat with Rizzculator AI!</p>
                    <p className="text-xs mt-1">Get roasted or rizz'd up 🔥</p>
                  </>
                ) : (
                  <>
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Search for users to DM</p>
                  </>
                )}
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
                      : 'bg-white/20'
                  }`}
                >
                  {!msg.isUser && (
                    <p className="text-xs text-gray-400 mb-1">{msg.sender}</p>
                  )}
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-white/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={chatMode === 'ai' ? 'Type to AI...' : selectedDMUser ? 'Type message...' : 'Select a user first'}
                disabled={chatMode === 'dm' && !selectedDMUser}
                className="flex-1 bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || (chatMode === 'dm' && !selectedDMUser)}
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