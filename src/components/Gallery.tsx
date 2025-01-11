import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Creation } from '../types';
import { Trophy, ThumbsUp, Upload, AlertCircle, LogIn, LogOut, User } from 'lucide-react';
import { AuthModal } from './AuthModal';

export function Gallery() {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const fetchCreations = async () => {
    try {
      const { data, error } = await supabase
        .from('creations')
        .select('*')
        .order('votes_count', { ascending: false });

      if (error) throw error;

      if (user) {
        // Check which creations the user has voted on
        const { data: votes } = await supabase
          .from('votes')
          .select('creation_id')
          .eq('user_id', user.id);

        const votedCreationIds = new Set(votes?.map(vote => vote.creation_id));
        
        setCreations(data.map(creation => ({
          ...creation,
          hasVoted: votedCreationIds.has(creation.id)
        })));
      } else {
        setCreations(data);
      }
    } catch (error) {
      console.error('Error fetching creations:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('creations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('creations')
        .getPublicUrl(fileName);

      // Create creation record
      const { error: creationError } = await supabase
        .from('creations')
        .insert({
          title,
          image_url: publicUrl,
          user_id: user.id
        });

      if (creationError) throw creationError;

      setTitle('');
      fetchCreations();
    } catch (error) {
      console.error('Error uploading creation:', error);
      alert('Failed to upload creation. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVote = async (creationId: string, hasVoted: boolean) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('creation_id', creationId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from('votes')
          .insert({
            creation_id: creationId,
            user_id: user.id
          });

        if (error) throw error;
      }

      fetchCreations();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  useEffect(() => {
    fetchCreations();
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setUserProfile(profile);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-green-500">SHADOW GALLERY</h2>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-green-500 flex items-center">
                <User className="w-4 h-4 mr-2" />
                {userProfile?.username}
              </span>
              <button
                onClick={handleSignOut}
                className="dos-button flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                SIGN OUT
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="dos-button flex items-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              SIGN IN
            </button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-8 p-4 dos-card">
        <h3 className="text-xl font-bold text-green-500 mb-4">UPLOAD YOUR CREATION</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-green-500 mb-1">
              TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="dos-input w-full"
              placeholder="Enter a title for your creation"
              required
            />
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="creationInput"
              disabled={isUploading}
            />
            <label
              htmlFor="creationInput"
              className="dos-button flex items-center justify-center w-full cursor-pointer"
            >
              <Upload className="w-5 h-5 mr-2" />
              {isUploading ? 'UPLOADING...' : 'UPLOAD IMAGE'}
            </label>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creations.map((creation, index) => (
          <div key={creation.id} className="dos-card">
            <div className="relative">
              {index < 3 && (
                <div className="absolute top-2 right-2 bg-green-500 text-black px-2 py-1 rounded">
                  #{index + 1}
                </div>
              )}
              <img
                src={creation.imageUrl}
                alt={creation.title}
                className="w-full aspect-square object-cover rounded mb-2"
              />
            </div>
            <h3 className="text-lg font-bold text-green-500">{creation.title}</h3>
            <div className="flex items-center justify-between mt-2">
              <span className="text-green-500 text-sm">by {creation.username}</span>
              <button
                onClick={() => handleVote(creation.id, creation.hasVoted || false)}
                className={`dos-button flex items-center ${
                  creation.hasVoted ? 'bg-green-900' : ''
                }`}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                {creation.votesCount}
              </button>
            </div>
          </div>
        ))}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}