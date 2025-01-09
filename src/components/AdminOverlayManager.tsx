import React, { useState, useCallback } from 'react';
import { Upload, Trash2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { OverlayOption, BaseImage } from '../types';
import { supabase } from '../lib/supabase';

interface AdminOverlayManagerProps {
  overlays: OverlayOption[];
  baseImages: BaseImage[];
  headerImage: string | null;
  onOverlayAdd: (overlay: OverlayOption) => void;
  onOverlayDelete: (overlayId: string) => void;
  onBaseImageAdd: (image: BaseImage) => void;
  onBaseImageDelete: (imageId: string) => void;
  onHeaderImageUpdate: (imageUrl: string) => void;
}

type TabType = 'overlays' | 'baseImages' | 'settings';

export function AdminOverlayManager({
  overlays,
  baseImages,
  headerImage,
  onOverlayAdd,
  onOverlayDelete,
  onBaseImageAdd,
  onBaseImageDelete,
  onHeaderImageUpdate
}: AdminOverlayManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overlays');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(Math.abs(img.width - img.height) < 2);
      };
    });
  };

  const handleImageUpload = async (file: File, type: 'overlay' | 'baseImage' | 'header') => {
    if (isUploading) return;
    
    try {
      setIsUploading(true);

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
      }

      // Only validate square ratio for overlays and base images
      if (type !== 'header') {
        const isSquare = await validateImage(file);
        if (!isSquare) {
          alert('Please upload a square image (1:1 ratio).');
          return;
        }
      }

      // For overlays, automatically generate name and description
      let uploadName = name;
      let uploadDescription = description;
      
      if (type === 'overlay') {
        const overlayNumber = overlays.length + 1;
        uploadName = `DSHAD${overlayNumber}`;
        uploadDescription = `#${overlayNumber}`;
      } else if (type === 'baseImage') {
        if (!name.trim() || !description.trim()) {
          alert('Please fill in both name and description for base images.');
          return;
        }
        uploadName = name.trim();
        uploadDescription = description.trim();
      }

      // Upload image to appropriate Supabase Storage bucket
      const bucketName = type === 'header' ? 'settings' : (type === 'overlay' ? 'overlays' : 'base_images');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      if (type === 'header') {
        // Update header image in settings table
        const { error: settingsError } = await supabase
          .from('settings')
          .upsert({
            key: 'header_image',
            value: publicUrl
          });

        if (settingsError) {
          throw settingsError;
        }

        onHeaderImageUpdate(publicUrl);
      } else {
        // Create record in the appropriate table
        const tableName = type === 'overlay' ? 'overlays' : 'base_images';
        const { data: record, error: dbError } = await supabase
          .from(tableName)
          .insert({
            name: uploadName,
            description: uploadDescription,
            image_url: publicUrl,
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (dbError) {
          throw dbError;
        }

        // Add to local state through the appropriate callback
        if (type === 'overlay') {
          onOverlayAdd({
            id: record.id,
            name: record.name,
            description: record.description,
            imageUrl: record.image_url
          });
        } else {
          onBaseImageAdd({
            id: record.id,
            name: record.name,
            description: record.description,
            imageUrl: record.image_url
          });
          // Only clear form for base images since overlay names are automatic
          setName('');
          setDescription('');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, type: 'overlay' | 'baseImage') => {
    try {
      const tableName = type === 'overlay' ? 'overlays' : 'base_images';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      if (type === 'overlay') {
        onOverlayDelete(id);
      } else {
        onBaseImageDelete(id);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (activeTab === 'settings') {
        await handleImageUpload(file, 'header');
      } else {
        await handleImageUpload(file, activeTab === 'overlays' ? 'overlay' : 'baseImage');
      }
    }
  }, [activeTab, name, description, isUploading]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (activeTab === 'settings') {
        await handleImageUpload(file, 'header');
      } else {
        await handleImageUpload(file, activeTab === 'overlays' ? 'overlay' : 'baseImage');
      }
    }
  }, [activeTab, name, description, isUploading]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Developer Options</h2>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm mr-4 border-b-2 transition-colors ${
            activeTab === 'overlays'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overlays')}
        >
          Manage Overlays
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm mr-4 border-b-2 transition-colors ${
            activeTab === 'baseImages'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('baseImages')}
        >
          Manage Base Images
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
      
      {activeTab === 'settings' ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Header Image</h3>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                {headerImage ? (
                  <img src={headerImage} alt="Current header" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {headerImage ? 'Current header image' : 'No header image set'}
                </p>
              </div>
            </div>
            
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isUploading
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-300 hover:border-blue-500'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                id="headerImageInput"
                disabled={isUploading}
              />
              <label htmlFor="headerImageInput" className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  {isUploading ? 'Uploading...' : 'Drop new header image here or click to upload'}
                </p>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Add New {activeTab === 'overlays' ? 'Overlay' : 'Base Image'}
            </h3>
            
            {/* Only show name and description fields for base images */}
            {activeTab === 'baseImages' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Base image name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Base image description"
                  />
                </div>
              </>
            )}
            
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isUploading
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-300 hover:border-blue-500'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                id="imageFileInput"
                disabled={isUploading}
              />
              <label htmlFor="imageFileInput" className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  {isUploading ? 'Uploading...' : `Drop ${activeTab === 'overlays' ? 'overlay' : 'base image'} here or click to upload`}
                </p>
                {activeTab === 'overlays' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Name will be automatically set to DSHAD{overlays.length + 1}
                  </p>
                )}
              </label>
            </div>

            <div className="flex items-center text-amber-600 bg-amber-50 p-3 rounded">
              <AlertCircle className="w-4 h-4 mr-2" />
              <p className="text-sm">Only square images (1:1 ratio) are supported</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">
              Current {activeTab === 'overlays' ? 'Overlays' : 'Base Images'}
            </h3>
            <div className="space-y-4">
              {(activeTab === 'overlays' ? overlays : baseImages).map((item) => (
                <div key={item.id} className="flex items-center p-3 border rounded">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="ml-4 flex-grow">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, activeTab === 'overlays' ? 'overlay' : 'baseImage')}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}