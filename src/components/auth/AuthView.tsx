import React, { useState, useEffect } from 'react';
import { AppLogo } from '../common/AppLogo';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../../firebase';
import { syncUserProfile } from '../../services/firestoreService';
import { AuthUser } from '../../types';
import { ArrowRight, Lock, Mail, AlertCircle, X, Shield, Sparkles } from 'lucide-react';

interface AuthViewProps {
  onAuthenticated?: (user: AuthUser, token: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Hidden Admin & Owner State
  const [showHiddenAdmin, setShowHiddenAdmin] = useState(false);
  const [hiddenFlowType, setHiddenFlowType] = useState<'admin' | 'owner'>('admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminAccountPrepared, setAdminAccountPrepared] = useState(false);

  // Hidden Shortcut 1: CTRL + LEFT CLICK on the login page opens hidden Super Admin flow
  const handlePageClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setHiddenFlowType('admin');
      setShowHiddenAdmin(prev => !prev);
      setError(null);
      setAdminError(null);
    }
  };

  // Hidden Shortcut 2: CTRL + RIGHT CLICK on the login page opens hidden Personal Owner flow
  const handleContextMenu = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setHiddenFlowType('owner');
      setShowHiddenAdmin(true);
      setError(null);
      setAdminError(null);
    }
  };

  // Second Hidden Shortcut (Left Click inside modal): Prepares Super Admin account identifier (admin@zaynhub.com)
  const handleHiddenAdminClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setHiddenFlowType('admin');
      setAdminEmail('admin@zaynhub.com');
      setAdminAccountPrepared(true);
      setAdminError(null);
    }
  };

  // Second Hidden Shortcut (Right Click inside modal): Prepares Personal Owner account identifier (itsyourmujahid@gmail.com)
  const handleHiddenOwnerContextMenu = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setHiddenFlowType('owner');
      setAdminEmail('itsyourmujahid@gmail.com');
      setAdminAccountPrepared(true);
      setAdminError(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const token = await res.user.getIdToken();
      const profile = await syncUserProfile(res.user);
      if (onAuthenticated) {
        onAuthenticated(
          {
            id: res.user.uid,
            email: res.user.email || '',
            displayName: profile?.displayName || res.user.displayName || 'User',
            role: profile?.role || 'user',
          },
          token
        );
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const token = await res.user.getIdToken();
        const profile = await syncUserProfile(res.user);
        if (onAuthenticated) {
          onAuthenticated(
            {
              id: res.user.uid,
              email: res.user.email || '',
              displayName: displayName.trim() || profile?.displayName || 'User',
              role: profile?.role || 'user',
            },
            token
          );
        }
      } else {
        const res = await signInWithEmailAndPassword(auth, email.trim(), password);
        const token = await res.user.getIdToken();
        const profile = await syncUserProfile(res.user);
        if (onAuthenticated) {
          onAuthenticated(
            {
              id: res.user.uid,
              email: res.user.email || '',
              displayName: profile?.displayName || res.user.displayName || 'User',
              role: profile?.role || 'user',
            },
            token
          );
        }
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminGoogleSignIn = async () => {
    setAdminError(null);
    setAdminLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const token = await res.user.getIdToken();
      const profile = await syncUserProfile(res.user);

      if (profile?.role !== 'admin') {
        setAdminError('Access restricted: Signed in account does not hold Super Admin authorization.');
        setAdminLoading(false);
        return;
      }

      if (onAuthenticated) {
        onAuthenticated(
          {
            id: res.user.uid,
            email: res.user.email || '',
            displayName: profile?.displayName || res.user.displayName || 'Super Admin',
            role: 'admin',
          },
          token
        );
      }
      setShowHiddenAdmin(false);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAdminError(err.message || 'Super Admin authentication failed.');
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    try {
      const res = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      const token = await res.user.getIdToken();
      const profile = await syncUserProfile(res.user);

      if (profile?.role !== 'admin') {
        setAdminError('Access restricted: This account does not possess Super Admin privileges.');
        setAdminLoading(false);
        return;
      }

      if (onAuthenticated) {
        onAuthenticated(
          {
            id: res.user.uid,
            email: res.user.email || '',
            displayName: profile?.displayName || 'Super Admin',
            role: 'admin',
          },
          token
        );
      }
      setShowHiddenAdmin(false);
    } catch (err: any) {
      setAdminError(err.message || 'Invalid Super Admin credentials.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div
      onClick={handlePageClick}
      onContextMenu={handleContextMenu}
      className="min-h-screen bg-[#F3F4F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#E50914]/20 selection:text-[#E50914] select-none"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo - completely untouched 1:1 asset */}
        <div className="flex justify-center mb-4">
          <AppLogo size={52} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#111111]">
          Self Reporting
        </h2>
        <p className="mt-1 text-xs text-[#4B5563] tracking-wide uppercase font-medium">
          Personal Work Operating System & Accountability Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          onClick={e => e.stopPropagation()}
          className="bg-white py-8 px-6 shadow-sm border border-[#E5E7EB] rounded-2xl sm:px-10"
        >
          {/* Google Sign In Option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs font-semibold text-[#111111] bg-white border border-[#D1D5DB] rounded-lg hover:bg-neutral-50 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#6B7280]">or with email</span>
            </div>
          </div>

          {/* Clean User Tabs (Only Sign In & New Account) */}
          <div className="flex items-center bg-[#F3F4F6] p-1 rounded-lg mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold text-center rounded-md transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#111111] shadow-2xs'
                  : 'text-[#4B5563] hover:text-[#111111]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold text-center rounded-md transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#111111] shadow-2xs'
                  : 'text-[#4B5563] hover:text-[#111111]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Hunter"
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#E50914]/30 focus:border-[#E50914]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#E50914]/30 focus:border-[#E50914]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#E50914]/30 focus:border-[#E50914]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#111111] hover:bg-black active:scale-[0.98] rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with Firebase...</span>
              ) : (
                <>
                  <span>
                    {mode === 'login' ? 'Sign In to Workspace' : 'Create Isolated Account'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Session Persistence Notice */}
          <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#4B5563]">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#4B5563]" />
              Persistent Authenticated Session
            </span>
            <span>Production v1.0</span>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-[#6B7280]">
          <p>
            Your workspace data is encrypted and strictly isolated to your authenticated account.
          </p>
        </div>
      </div>

      {/* HIDDEN SUPER ADMIN MODAL (Completely invisible to normal users; triggered ONLY via CTRL + CLICK) */}
      {showHiddenAdmin && (
        <div
          onClick={() => setShowHiddenAdmin(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={e => {
              e.stopPropagation();
              handleHiddenAdminClick(e);
            }}
            onContextMenu={e => {
              e.stopPropagation();
              handleHiddenOwnerContextMenu(e);
            }}
            className="bg-[#111111] border border-[#2E2E2E] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowHiddenAdmin(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-[#E50914]" />
              <h3 className="text-base font-bold tracking-tight text-white">
                {hiddenFlowType === 'owner' ? 'Personal Owner Authorization' : 'Super Admin Authorization'}
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-6">
              {hiddenFlowType === 'owner'
                ? 'Personal workspace owner gateway. Authenticate with owner credentials or Google.'
                : 'Owner identity gateway. Access verified through Firebase database security rules.'}
            </p>

            {adminAccountPrepared && (
              <div className="mb-4 px-3 py-2 bg-[#1A1A1A] border border-[#E50914]/40 rounded-lg flex items-center justify-between text-xs text-neutral-300">
                <span className="font-mono text-[11px] text-[#E50914]">
                  Target: {adminEmail}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {hiddenFlowType === 'owner' ? 'Personal Owner Identifier Ready' : 'Super Admin Identifier Ready'}
                </span>
              </div>
            )}

            {adminError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{adminError}</span>
              </div>
            )}

            {/* Owner Google Sign In */}
            <button
              type="button"
              onClick={handleAdminGoogleSignIn}
              disabled={adminLoading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#1A1A1A] hover:bg-[#252525] border border-neutral-700 rounded-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Authorize with Owner Google Account</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-[#111111] px-2 text-neutral-500">or admin credentials</span>
              </div>
            </div>

            {/* Email / Password Form for Admin */}
            <form onSubmit={handleAdminSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Super Admin Account Identifier
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@zaynhub.com"
                  className="w-full px-3 py-2 text-xs bg-[#1A1A1A] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#E50914]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Owner Secret Key / Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3 py-2 text-xs bg-[#1A1A1A] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#E50914]"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {adminLoading ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Enter Super Admin Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
