import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Star } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground';

const ComingSoon: React.FC = () => {
  return (
    <VideoBackground 
      videoUrl="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Opening+Page+f+(1).mp4"
      overlayOpacity={0.7}
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <div className="mx-auto mb-4">
                <Clock className="w-16 h-16 text-yellow-400" />
              </div>
              <CardTitle className="text-4xl font-bold text-white mb-4">
                Coming Soon!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xl text-gray-200">
                This feature is currently under development and will be available soon.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Star className="w-5 h-5" />
                <span className="font-semibold">Stay tuned for exciting updates!</span>
                <Star className="w-5 h-5" />
              </div>
              
              <div className="pt-6">
                <Button 
                  onClick={() => window.history.back()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </VideoBackground>
  );
};

export default ComingSoon;