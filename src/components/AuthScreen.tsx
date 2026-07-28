import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, sendPasswordResetLink } from '../firebase';
import { User } from 'firebase/auth';

interface AuthScreenProps {
  onAuthSuccess: (user: User, accessToken: string | null) => void;
  onEnterOfflineMode?: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isForgotPassword) {
      try {
        await sendPasswordResetLink(email);
        setResetSent(true);
      } catch (err: any) {
        console.error(err);
        let errMsg = "Failed to send reset email. Please check the email address.";
        if (err.code === "auth/user-not-found") {
          errMsg = "No account found with this email address.";
        } else if (err.code === "auth/invalid-email") {
          errMsg = "Please enter a valid email address.";
        }
        setError(errMsg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const user = await signUpWithEmail(email, password, rememberMe);
        onAuthSuccess(user, null);
      } else {
        try {
          const user = await signInWithEmail(email, password, rememberMe);
          onAuthSuccess(user, null);
        } catch (signInErr: any) {
          // Check if this matches a created Employee account that needs initial Firebase Auth registration
          const rawEmployees = localStorage.getItem('tcm_employees') || localStorage.getItem('tcm_employees_sandbox');
          let localEmpList: any[] = [];
          if (rawEmployees) {
            try { localEmpList = JSON.parse(rawEmployees); } catch (e) {}
          }
          const matchedEmp = localEmpList.find(
            e => e.email?.trim().toLowerCase() === email.trim().toLowerCase() && e.password?.trim() === password.trim()
          );

          if (matchedEmp) {
            try {
              const user = await signUpWithEmail(email, password, rememberMe);
              onAuthSuccess(user, null);
              return;
            } catch (signUpErr) {
              const user = await signInWithEmail(email, password, rememberMe);
              onAuthSuccess(user, null);
              return;
            }
          }
          throw signInErr;
        }
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
      } else if (err.code === "auth/network-request-failed" || err.message?.includes("network-request-failed")) {
        errMsg = "Network connection failed. Please check your internet connection and try again.";
      }
      setError(errMsg);
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
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-blue-500/10">
            T
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight sm:text-2xl">
            Transport Manager
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Logistics tracking, commission ledger, and dispatch portal.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {isForgotPassword ? (
          <div className="space-y-4">
            {resetSent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                  <CheckCircle2 size={18} /> Password Reset Email Sent!
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  We've sent a secure password reset link to <strong className="text-white">{email}</strong>. Please check your inbox and follow the instructions to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                    setError(null);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-slate-300 text-xs font-medium space-y-1">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <KeyRound size={16} className="text-blue-400" /> Reset Password
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enter your registered email address and we will send you a link to reset your password.
                  </p>
                </div>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail size={14} /> Send Reset Link
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={12} /> Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Email & Password Form */
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
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

              {/* Password */}
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
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (if sign up) */}
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

              {/* Remember Me and Forgot Password bar */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0 accent-blue-600 cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 cursor-pointer"
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

            {/* View Toggle */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsSignUp(!isSignUp);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-all cursor-pointer"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
