import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, googleSignIn } from '../firebase';
import { User } from 'firebase/auth';

interface AuthScreenProps {
  onAuthSuccess: (user: User, accessToken: string | null) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const user = await signUpWithEmail(email, password);
        onAuthSuccess(user, null);
      } else {
        const user = await signInWithEmail(email, password);
        onAuthSuccess(user, null);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = "Authentication failed. Please check your credentials.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        errMsg = "Incorrect email or password.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setError("Google Sign-In failed. Please try again or use your Email/Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden" id="auth_screen_container">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-blue-900/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-indigo-900/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6 animate-fadeIn">
        {/* Logo and Greeting */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-blue-500/10">
            T
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight sm:text-2xl">
            Transport Manager
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Logistics tracking, commission ledger, and dynamic Google Workspace dispatch hub.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@transport.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={14} /> Create Account
                </>
              ) : (
                <>
                  <LogIn size={14} /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Social Divider and Google OAuth login */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-bold tracking-wider">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.3 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.08 3.58-5.14 3.58-8.73z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.82-2.13-6.77-5H1.21v3.1c1.98 3.93 6.04 6.65 10.79 6.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.23 14.25c-.24-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25V6.65H1.21C.44 8.19 0 9.93 0 12s.44 3.81 1.21 5.35l4.02-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.25 0 3.19 2.72 1.21 6.65L5.23 9.75c.95-2.87 3.62-5 6.77-5z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>
          </div>

          {/* View Toggle */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsSignUp(!isSignUp);
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-all"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
