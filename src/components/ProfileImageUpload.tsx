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

  const slots = [
    { type: 'profile' as const, label: 'Profile Photo', hint: 'Square • shown on your profile & cards', field: 'profile_photo', round: true },
    { type: 'banner' as const, label: 'Banner Image', hint: 'Wide • header background', field: 'banner_photo', round: false },
    { type: 'front_page' as const, label: 'Front Page', hint: 'Wide • featured placements', field: 'front_page_photo', round: false },
  ];

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <User className="h-4 w-4 text-primary" />
          Profile Images
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload a profile photo, banner and featured image. JPG or PNG, up to 10MB.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {slots.map(({ type, label, hint, field, round }) => {
            const url = userData?.[field];
            const isUploading = uploading === type;
            return (
              <div
                key={type}
                className="group flex flex-col items-center rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-primary/50"
              >
                <div
                  className={`relative mb-3 flex w-full items-center justify-center overflow-hidden bg-muted ${
                    round ? 'aspect-square max-w-[7rem] rounded-full' : 'aspect-video rounded-lg'
                  }`}
                >
                  {url ? (
                    <img src={url} alt={label} className="h-full w-full object-cover" loading="lazy" />
                  ) : round ? (
                    <User className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Upload className="h-5 w-5 animate-pulse text-primary" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mb-3 mt-0.5 text-center text-xs text-muted-foreground">{hint}</p>
                <Button
                  onClick={() => triggerFileInput(type)}
                  disabled={isUploading}
                  size="sm"
                  variant="outline"
                  className="mt-auto w-full gap-2 border-border/70"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploading ? 'Uploading…' : url ? 'Replace' : 'Upload'}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileImageUpload;