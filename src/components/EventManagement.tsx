import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Upload, Calendar, MapPin, DollarSign } from 'lucide-react';

interface NewEvent {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  address: string;
  city: string;
  state: string;
  genre: string;
  price: number;
  free_spots_strippers: number;
  free_spots_exotics: number;
  description: string;
}

const EventManagement: React.FC = () => {
  const { toast } = useToast();
  const [newEvent, setNewEvent] = useState<NewEvent>({
    name: '',
    date: '',
    start_time: '',
    end_time: '',
    address: '',
    city: '',
    state: '',
    genre: 'Nightlife',
    price: 0,
    free_spots_strippers: 5,
    free_spots_exotics: 5,
    description: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (file: File, bucket: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload main photo
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await handleFileUpload(photoFile, 'event-photos');
      }

      // Upload videos
      const videoUrls = [];
      for (const video of videoFiles) {
        const url = await handleFileUpload(video, 'event-videos');
        if (url) videoUrls.push(url);
      }

      // Upload additional photos
      const additionalPhotoUrls = [];
      for (const photo of additionalPhotos) {
        const url = await handleFileUpload(photo, 'event-photos');
        if (url) additionalPhotoUrls.push(url);
      }

      // Insert event into database
      const { error } = await supabase
        .from('events')
        .insert({
          ...newEvent,
          photo_url: photoUrl,
          video_urls: videoUrls,
          additional_photos: additionalPhotoUrls,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event created successfully!'
      });

      // Reset form
      setNewEvent({
        name: '',
        date: '',
        start_time: '',
        end_time: '',
        address: '',
        city: '',
        state: '',
        genre: 'Nightlife',
        price: 0,
        free_spots_strippers: 5,
        free_spots_exotics: 5,
        description: ''
      });
      setPhotoFile(null);
      setVideoFiles([]);
      setAdditionalPhotos([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Add New Event
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event Name</label>
              <Input
                value={newEvent.name}
                onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                placeholder="Enter event name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Genre</label>
              <Select value={newEvent.genre} onValueChange={(value) => setNewEvent({...newEvent, genre: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nightlife">Nightlife</SelectItem>
                  <SelectItem value="Concerts">Concerts</SelectItem>
                  <SelectItem value="Yacht Parties">Yacht Parties</SelectItem>
                  <SelectItem value="Mansion Parties">Mansion Parties</SelectItem>
                  <SelectItem value="Food & Drink">Food & Drink</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Arts & Culture">Arts & Culture</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <Input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <Input
                type="time"
                value={newEvent.start_time}
                onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Time</label>
              <Input
                type="time"
                value={newEvent.end_time}
                onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input
                value={newEvent.address}
                onChange={(e) => setNewEvent({...newEvent, address: e.target.value})}
                placeholder="Street address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                value={newEvent.city}
                onChange={(e) => setNewEvent({...newEvent, city: e.target.value})}
                placeholder="City"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input
                value={newEvent.state}
                onChange={(e) => setNewEvent({...newEvent, state: e.target.value})}
                placeholder="State"
                required
              />
            </div>
          </div>

          {/* Pricing and Spots */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newEvent.price}
                onChange={(e) => setNewEvent({...newEvent, price: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Free Spots - Strippers</label>
              <Input
                type="number"
                min="0"
                value={newEvent.free_spots_strippers}
                onChange={(e) => setNewEvent({...newEvent, free_spots_strippers: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Free Spots - Exotics</label>
              <Input
                type="number"
                min="0"
                value={newEvent.free_spots_exotics}
                onChange={(e) => setNewEvent({...newEvent, free_spots_exotics: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
              placeholder="Event description"
              rows={3}
            />
          </div>

          {/* File Uploads */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Main Event Photo</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Videos (Optional)</label>
              <Input
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => setVideoFiles(Array.from(e.target.files || []))}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Additional Photos (Optional)</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setAdditionalPhotos(Array.from(e.target.files || []))}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Event...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EventManagement;