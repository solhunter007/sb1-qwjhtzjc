import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { OverlaySelector } from './components/OverlaySelector';
import { ImageEditor } from './components/ImageEditor';
import { AdminOverlayManager } from './components/AdminOverlayManager';
import { BaseImageSelector } from './components/BaseImageSelector';
import { Gallery } from './components/Gallery';
import { ImageState, OverlayOption, BaseImage } from './types';
import { Image, Settings, X, AlertCircle, Shield, Trophy } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  const [ageVerified, setAgeVerified] = useState<boolean>(false);
  const [imageState, setImageState] = useState<ImageState>({
    file: null,
    preview: null,
    overlayId: null,
  });
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [overlays, setOverlays] = useState<OverlayOption[]>([]);
  const [baseImages, setBaseImages] = useState<BaseImage[]>([]);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [headerText, setHeaderText] = useState<string>('SHADOW CASTER v1.0');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [showGallery, setShowGallery] = useState(false);

  const handleReset = useCallback(() => {
    setImageState({
      file: null,
      preview: null,
      overlayId: null,
    });
    setShowAdmin(false);
    setShowGallery(false);
  }, []);

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: '102668'
    });
    
    if (error) {
      console.error('Error signing in:', error);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: overlayData, error: overlayError } = await supabase
        .from('overlays')
        .select('*')
        .order('created_at', { ascending: false });

      if (overlayError) {
        console.error('Error fetching overlays:', overlayError);
      } else {
        setOverlays(
          overlayData.map((overlay) => ({
            id: overlay.id,
            name: overlay.name,
            description: overlay.description,
            imageUrl: overlay.image_url,
          }))
        );
      }

      const { data: baseImageData, error: baseImageError } = await supabase
        .from('base_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (baseImageError) {
        console.error('Error fetching base images:', baseImageError);
      } else {
        setBaseImages(
          baseImageData.map((image) => ({
            id: image.id,
            name: image.name,
            description: image.description,
            imageUrl: image.image_url,
          }))
        );
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*');

      if (!settingsError && settingsData) {
        const headerImageSetting = settingsData.find(s => s.key === 'header_image');
        const headerTextSetting = settingsData.find(s => s.key === 'header_text');
        const contractAddressSetting = settingsData.find(s => s.key === 'contract_address');
        
        if (headerImageSetting?.value) setHeaderImage(headerImageSetting.value);
        if (headerTextSetting?.value) setHeaderText(headerTextSetting.value);
        if (contractAddressSetting?.value) setContractAddress(contractAddressSetting.value);
      }
    };

    fetchData();
  }, []);

  const isOverlayScreen = imageState.preview !== null && !showAdmin && !showGallery;

  if (!ageVerified) {
    return (
      <div className="min-h-screen bg-black font-dos flex items-center justify-center p-4">
        <div className="dos-card max-w-2xl w-full mx-auto text-center">
          <div className="dos-header mb-8">
            <h1 className="text-2xl">{headerText}</h1>
          </div>
          
          <div className="space-y-6 p-4">
            <div className="flex justify-center mb-6">
              <Shield className="w-16 h-16 text-green-500" />
            </div>
            
            <div className="text-green-500 space-y-4">
              <p className="text-xl">AGE VERIFICATION REQUIRED</p>
              <p>YOU MUST BE 18 YEARS OR OLDER TO CAST SHADOWS</p>
            </div>
            
            <div className="mt-8 space-y-4">
              <button
                onClick={() => setAgeVerified(true)}
                className="dos-button w-full max-w-md mx-auto"
              >
                YES, I AM 18 YEARS OR OLDER
              </button>
              
              <a
                href="https://www.google.com"
                className="dos-button block w-full max-w-md mx-auto"
              >
                NO, TAKE ME AWAY
              </a>
            </div>
            
            <div className="text-green-500 text-sm mt-8">
              <p>BY CLICKING "YES" YOU CONFIRM THAT YOU ARE</p>
              <p>OF LEGAL AGE TO VIEW THIS CONTENT</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-dos">
      <header className={`bg-green-500 text-black ${isOverlayScreen ? 'py-1' : 'py-2'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleReset}
                className="flex items-center focus:outline-none hover:opacity-75 transition-opacity"
              >
                {headerImage ? (
                  <img 
                    src={headerImage} 
                    alt="Logo" 
                    className={isOverlayScreen ? 'w-6 h-6 mr-2' : 'w-8 h-8 mr-3'}
                  />
                ) : (
                  <Image 
                    className={isOverlayScreen ? 'w-6 h-6 mr-2 text-black' : 'w-8 h-8 mr-3 text-black'}
                  />
                )}
                <div>
                  <h1 className={`font-bold text-black ${isOverlayScreen ? 'text-xl' : 'text-2xl'}`}>
                    {headerText}
                  </h1>
                  {!isOverlayScreen && contractAddress && (
                    <p className="text-sm font-bold">CA: {contractAddress}</p>
                  )}
                </div>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowGallery(prev => !prev)}
                className="dos-button bg-black text-green-500 hover:bg-green-900"
                title="View Gallery"
              >
                <Trophy className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="opacity-10 hover:opacity-100 transition-opacity"
                title="Developer Options"
              >
                <Settings className="w-3 h-3 text-black" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 ${isOverlayScreen ? 'py-2' : 'py-8 sm:px-6 lg:px-8'}`}>
        {showAdmin ? (
          <AdminOverlayManager
            overlays={overlays}
            baseImages={baseImages}
            headerImage={headerImage}
            headerText={headerText}
            contractAddress={contractAddress}
            onOverlayAdd={(overlay) => setOverlays((prev) => [overlay, ...prev])}
            onOverlayDelete={(id) => setOverlays((prev) => prev.filter(o => o.id !== id))}
            onBaseImageAdd={(image) => setBaseImages((prev) => [image, ...prev])}
            onBaseImageDelete={(id) => setBaseImages((prev) => prev.filter(i => i.id !== id))}
            onHeaderImageUpdate={setHeaderImage}
            onHeaderTextUpdate={setHeaderText}
            onContractAddressUpdate={setContractAddress}
          />
        ) : showGallery ? (
          <Gallery />
        ) : (
          <>
            {!imageState.preview ? (
              <BaseImageSelector
                baseImages={baseImages}
                onBaseImageSelect={(imageUrl) => setImageState(prev => ({ ...prev, preview: imageUrl }))}
                onCustomImageSelect={(file) => {
                  const preview = URL.createObjectURL(file);
                  setImageState(prev => ({ ...prev, file, preview }));
                }}
              />
            ) : (
              <div className="flex flex-col h-[calc(100vh-4rem)]">
                <ImageEditor
                  imageUrl={imageState.preview}
                  overlayId={imageState.overlayId}
                  overlays={overlays}
                />
                <OverlaySelector
                  overlays={overlays}
                  selectedOverlay={imageState.overlayId}
                  onOverlaySelect={(overlayId) => setImageState(prev => ({ ...prev, overlayId }))}
                />
              </div>
            )}
          </>
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="dos-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-green-500">DEVELOPER ACCESS</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPasswordError(false);
                }}
                className="text-green-500 hover:text-green-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (password === '102668') {
                const success = await signInAnonymously();
                if (success) {
                  setShowPasswordModal(false);
                  setShowAdmin(true);
                  setPassword('');
                  setPasswordError(false);
                } else {
                  setPasswordError(true);
                }
              } else {
                setPasswordError(true);
              }
            }}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm text-green-500 mb-1">
                  ENTER PASSWORD
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="dos-input w-full"
                  placeholder="ENTER DEVELOPER PASSWORD"
                />
                {passwordError && (
                  <div className="mt-2 flex items-center text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span>INCORRECT PASSWORD</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setPasswordError(false);
                  }}
                  className="dos-button"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="dos-button"
                >
                  ACCESS DEV OPTIONS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}