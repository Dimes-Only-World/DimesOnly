import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Eye, Star, MapPin, Calendar } from 'lucide-react';

interface UserProfileCardProps {
  username: string;
  displayName?: string;
  profileImage?: string;
  coverImage?: string;
  bio?: string;
  location?: string;
  joinDate?: string;
  stats?: {
    followers: number;
    tips: number;
    rating: number;
  };
  isOnline?: boolean;
  recentPhotos?: string[];
  recentVideos?: string[];
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  username,
  displayName,
  profileImage,
  coverImage,
  bio,
  location,
  joinDate,
  stats = { followers: 0, tips: 0, rating: 0 },
  isOnline = false,
  recentPhotos = [],
  recentVideos = []
}) => {
  return (
    <Card className="bg-gray-900 border-gray-700 overflow-hidden">
      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-r from-purple-600 to-pink-600">
        {coverImage && (
          <img 
            src={coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <CardHeader className="relative pb-4">
        {/* Profile Avatar */}
        <div className="absolute -top-16 left-6">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-gray-900">
              <AvatarImage src={profileImage} alt={username} />
              <AvatarFallback className="bg-purple-600 text-white text-xl">
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-gray-900 rounded-full" />
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {displayName || username}
              </h2>
              <p className="text-gray-400">@{username}</p>
            </div>
            {isOnline && (
              <Badge className="bg-green-600 text-white">
                Online
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-300">
              <Heart className="w-4 h-4 text-red-400" />
              <span>{stats.followers}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-300">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>${stats.tips}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-300">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>{stats.rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Location and Join Date */}
          <div className="space-y-1 text-sm text-gray-400">
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}
            {joinDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(joinDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {bio && (
            <p className="text-gray-300 text-sm leading-relaxed">
              {bio}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recent Photos */}
        {recentPhotos.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Recent Photos
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {recentPhotos.slice(0, 3).map((photo, index) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg">
                  <img 
                    src={photo} 
                    alt={`Recent photo ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Videos */}
        {recentVideos.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Recent Videos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {recentVideos.slice(0, 2).map((video, index) => (
                <div key={index} className="aspect-video overflow-hidden rounded-lg relative">
                  <video 
                    src={video}
                    className="w-full h-full object-cover"
                    poster={video.replace('.mp4', '_thumb.jpg')}
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
            <Heart className="w-4 h-4 mr-2" />
            Follow
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
            <Eye className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;