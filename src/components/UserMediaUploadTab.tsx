import React from 'react';
import MediaUploadSection from './MediaUploadSection';

interface UserMediaUploadTabProps {
  userData: any;
  onUpdate?: (data: any) => Promise<boolean>;
}

const UserMediaUploadTab: React.FC<UserMediaUploadTabProps> = ({ userData, onUpdate }) => {
  const handleUpdate = async (data: any) => {
    if (onUpdate) {
      return await onUpdate(data);
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Media Upload</h2>
        <p className="text-gray-600">
          Upload your profile images and manage your photo and video gallery. 
          You can upload up to 25 photos and 25 videos.
        </p>
      </div>
      
      <MediaUploadSection userData={userData} onUpdate={handleUpdate} />
    </div>
  );
};

export default UserMediaUploadTab;