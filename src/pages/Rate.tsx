import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RatingGrid from '@/components/RatingGrid';
import VideoPlayer from '@/components/VideoPlayer';
import PhotoGallery from '@/components/PhotoGallery';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, User } from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  bio?: string;
  user_type: string;
}

const RatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rateUsername = searchParams.get('rate');
  const refUsername = searchParams.get('ref') || '';
  
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [likes, setLikes] = useState({ profile: 0, last: 0 });
  const [ratings, setRatings] = useState<{[key: number]: {userId: number, profileName: string, pageId: string}}>({});
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rateUsername) {
      fetchUserData();
    }
  }, [rateUsername]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', rateUsername)
        .eq('user_type', 'stripper')
        .or('user_type.eq.exotic')
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      setUserData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (number: number) => {
    if (!userData) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('ratings')
        .insert({
          rater_id: user.id,
          rated_user_id: userData.id,
          rating: number,
          referred_by: refUsername || null
        });

      if (error) {
        console.error('Error saving rating:', error);
        return;
      }

      setSelectedNumber(number);
      setRatings(prev => ({ ...prev, [number]: { userId: 1, profileName: userData.username, pageId: 'current' } }));
      setDialogMessage(`You have selected number ${number} for @${userData.username}. This rating is now locked.`);
      setShowRatingDialog(true);
    } catch (error) {
      console.error('Error handling rating:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-red-900/20 border-red-500">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-400 font-bold text-xl mb-2">User Not Found</h2>
            <p className="text-red-300">The requested user could not be found.</p>
            <Button 
              onClick={() => window.location.href = '/rate-girls'}
              className="mt-4 bg-red-500 hover:bg-red-600"
            >
              Back to Rate Girls
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const photos = [
    { url: userData.profile_photo || '/placeholder.svg', alt: 'Profile Photo' },
    { url: 'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_45c765ef-2fe4-4658-8281-ff6cae9e2618.png', alt: 'Photo 1' },
    { url: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_cce445b5-329a-4140-82d0-111f1ba6fc7e.png', alt: 'Photo 2' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <img 
            src={userData.profile_photo || '/placeholder.svg'}
            alt={userData.username}
            className="w-72 h-72 rounded-lg object-cover mx-auto mb-4 border-4 border-yellow-400 shadow-2xl"
          />
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">Rate @{userData.username}</h1>
          <div className="flex items-center justify-center gap-4 text-gray-300 mb-4">
            <div className="flex items-center gap-1">
              <User size={16} />
              <span className="capitalize">{userData.user_type}</span>
            </div>
            {userData.city && userData.state && (
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{userData.city}, {userData.state}</span>
              </div>
            )}
          </div>
          {userData.bio && (
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">{userData.bio}</p>
          )}
        </div>

        <VideoPlayer
          src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Opening+Page+f+(1).mp4"
          poster={userData.profile_photo || '/placeholder.svg'}
          title="Profile Video"
          onLike={() => setLikes(prev => ({...prev, profile: prev.profile + 1}))}
          likes={likes.profile}
        />

        <PhotoGallery
          photos={photos}
          title="Selected Photos"
          showMoreButton={true}
          onMoreClick={() => alert('More photos feature coming soon!')}
        />

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center">Rate This Performer</h3>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <RatingGrid 
              selectedNumber={selectedNumber}
              ratings={ratings}
              onRate={handleRate}
            />
          </div>
        </div>

        <div className="text-center mb-8">
          <Button 
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            onClick={() => window.location.href = `/rate-girls/?ref=${userData.username}`}
          >
            Rate Another Dime
          </Button>
        </div>
      </div>

      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="bg-gray-800 border-yellow-500">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Rating Confirmation</DialogTitle>
            <DialogDescription className="text-white">
              {dialogMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowRatingDialog(false)} className="bg-yellow-500 text-black hover:bg-yellow-600">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RatePage;