import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AdminNotificationTab: React.FC = () => {
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'none'>('none');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `notifications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  };

  const handleSendNotification = async () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let mediaUrl = null;
      
      if (mediaFile && mediaType !== 'none') {
        mediaUrl = await uploadMedia(mediaFile);
        if (!mediaUrl) {
          throw new Error('Failed to upload media');
        }
      }

      // Insert notification into messages table
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: 'admin',
          recipient_id: 'all', // Broadcast to all users
          message: message,
          media_url: mediaUrl,
          media_type: mediaType === 'none' ? null : mediaType,
          is_notification: true,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification sent to all users',
      });

      // Reset form
      setMessage('');
      setMediaType('none');
      setMediaFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('media-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Notification to All Users</CardTitle>
        <p className="text-sm text-muted-foreground">
          Notifications will appear in user dashboards and auto-delete after 3 days
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Enter your notification message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Media Type (Optional)</Label>
          <RadioGroup
            value={mediaType}
            onValueChange={(value: 'photo' | 'video' | 'none') => {
              setMediaType(value);
              if (value === 'none') {
                setMediaFile(null);
                const fileInput = document.getElementById('media-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
              }
            }}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none">No Media</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="photo" id="photo" />
              <Label htmlFor="photo">Photo Upload</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="video" id="video" />
              <Label htmlFor="video">Video Upload</Label>
            </div>
          </RadioGroup>
        </div>

        {mediaType !== 'none' && (
          <div>
            <Label htmlFor="media-upload">
              Upload {mediaType === 'photo' ? 'Photo' : 'Video'}
            </Label>
            <Input
              id="media-upload"
              type="file"
              accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
              onChange={handleFileChange}
              className="mt-1"
            />
            {mediaFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {mediaFile.name}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Post Date: {new Date().toLocaleDateString()}
          </div>
          <Button
            onClick={handleSendNotification}
            disabled={loading || !message.trim()}
          >
            {loading ? 'Sending...' : 'Send Notification'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminNotificationTab;