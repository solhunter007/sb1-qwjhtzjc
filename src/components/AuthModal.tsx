import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, AlertCircle, Loader } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        // Check if username is available
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingUser) {
          setError('Username already taken');
          return;
        }

        // Generate a unique email using the username
        const email = `${username}@dickshadow.local`;

        // Sign up
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              username
            });

          if (profileError) throw profileError;
        }
      } else {
        // For sign in, use the same email generation pattern
        const email = `${username}@dickshadow.local`;
        
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
      }

      onClose();
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="dos-card max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-green-500">
            {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </h2>
          <button
            onClick={onClose}
            className="text-green-500 hover:text-green-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-green-500 mb-1">
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="dos-input w-full"
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]+"
              title="Only letters, numbers, and underscores allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-green-500 mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dos-input w-full"
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm text-green-500 mb-1">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="dos-input w-full"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-green-500 text-sm hover:text-green-400"
            >
              {isSignUp ? 'Already have an account?' : 'Need an account?'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="dos-button flex items-center"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}