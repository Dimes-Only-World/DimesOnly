import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, User, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface ProfileImageUploadProps {
  userData: any;
  onUpdate: (data: any) => Promise<boolean>;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ userData, onUpdate }) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUpload = async (file: File, type: 'profile' | 'banner' | 'front_page') => {
    if (!userData?.id) return;

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.id}/${type}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('user-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('user-photos')
        .getPublicUrl(fileName);

      const updateField = type === 'profile' ? 'profile_photo' : 
                         type === 'banner' ? 'banner_photo' : 'front_page_photo';

      await onUpdate({ [updateField]: publicUrl });
      
      toast({
        title: 'Success',
        description: `${type} image updated successfully`,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const triggerFileInput = (type: 'profile' | 'banner' | 'front_page') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file, type);
      }
    };
    input.click();
  };

  return (
    <Card className="bg-white/10 backdrop-blur border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile Images
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden bg-gray-200">
              {userData?.profile_photo ? (
                <img src={userData.profile_photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <Button
              onClick={() => triggerFileInput('profile')}
              disabled={uploading === 'profile'}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading === 'profile' ? 'Uploading...' : 'Profile Photo'}
            </Button>
          </div>

          <div className="text-center">
            <div className="w-24 h-16 mx-auto mb-2 rounded overflow-hidden bg-gray-200">
              {userData?.banner_photo ? (
                <img src={userData.banner_photo} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            <Button
              onClick={() => triggerFileInput('banner')}
              disabled={uploading === 'banner'}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading === 'banner' ? 'Uploading...' : 'Banner Image'}
            </Button>
          </div>

          <div className="text-center">
            <div className="w-24 h-16 mx-auto mb-2 rounded overflow-hidden bg-gray-200">
              {userData?.front_page_photo ? (
                <img src={userData.front_page_photo} alt="Front Page" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            <Button
              onClick={() => triggerFileInput('front_page')}
              disabled={uploading === 'front_page'}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {uploading === 'front_page' ? 'Uploading...' : 'Front Page'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileImageUpload;