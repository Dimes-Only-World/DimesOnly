import React, { useState, useEffect } from 'react';
import VideoBackground from './VideoBackground';
import HeroSlide from './HeroSlide';

const slides = [
  {
    title: 'EXOTIC LADIES NEEDED',
    description: 'ONLY 1,000 PROFILES AVAILABLE A YEAR',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/basedlabs_image-e1745621711320.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-30-1.jpg'
  },
  {
    title: 'STRIPPER$ NEEDED',
    description: 'GET PAID $25,000 A YEAR MINIMUM JUST FOR BEING ACTIVE ON THE SITE. EXOTICS INCLUDED',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_c29856d5-1274-4469-b28a-8083af3ff1e6-1320x811.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-31-1.jpg'
  },
  {
    title: 'APPROVAL REQUIRED',
    description: 'FIRST 1,000 DANCERS EXOTICS EVERYONE ELSE IS AUTOMATICALLY APPROVED',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_96184858-4dad-438e-8884-105f6c880251.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-33.jpg'
  },
  {
    title: 'LADIES AND GENTLEMEN',
    description: 'Recruit strippers or exotic ladies. GET PAID FROM THEIR SUCCESS FOR 5 to 10 years!',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realisticvision_793a56ff-a227-47e9-9e00-67d850ecfc98.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/eroticgirl_2bc9e11c-f37f-4c16-8338-57a806d54b8b-1.png'
  },
  {
    title: 'MULTIPLE INCOME: STREAMS',
    description: 'CARS TIPS DRAWINGS CLOTHES MEMBERSHIP SUBSCRIPTIONS RESIDUALS AND MORE!',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_444ea3b3-8631-4a65-abd1-b6d2cdb53850.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-35.jpg'
  },
  {
    title: 'STRIPPER$',
    description: 'Tip the exotic females and dancers for cash prizes and points to many things including cars.',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_0deacb05-ad59-4ba5-b93b-69c7b1012537.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-37.jpg'
  },
  {
    title: 'EVENTS',
    description: 'Meet the ladies at varies events globally. Make sure to make the money to have fun with the dimes.',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_3b5eb5bd-73d1-4d60-9a55-523cd2d38c75.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_598c3223-592f-4a9d-9de8-08424964fe68-768x1250.png'
  },
  {
    title: 'POTENTIAL EARNING $100,000 TO $250.000 A YEAR AVERAGE 2 HOUR A DAY MINIMUM',
    description: '',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_cb75099a-b77e-4822-98fa-ff93d0a17523.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_d836d056-6ce5-4a36-ba3e-879622fba498.png'
  },
  {
    title: 'POSITIONS ARE LIMITED',
    description: 'REPLACING 50 WEAK LINKS A YEAR',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/realorgasm_68125643-bfdc-4b64-b513-1e5e18de8568.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/sdfsafd-2.jpg'
  },
  {
    title: 'ECONOMIC TO EXOTIC CARS BUY A CAR GET A PROFIT SHARING POSITION FREE',
    description: '',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-27-1.jpg',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-27-1.jpg'
  },
  {
    title: 'WATCH VIDEO BELOW',
    description: 'MORE DETAILS INSIDE',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-3-2.jpg',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-18-2.jpg'
  },
  {
    title: 'APP COMING SOON',
    description: 'SET UP FREE PROFILE BEFORE THE LAUNCH OF THE APP',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS-1-scaled.jpg',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/image-5-1.jpg'
  },
  {
    title: 'TIP & WIN',
    description: 'Tip the exotic females and dancers for cash prizes and points to many things including cars.',
    desktopImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/hdjks-91-1536x864.png',
    mobileImage: 'https://dimesonly.s3.us-east-2.amazonaws.com/eroticgirl_7dd2dfc3-d1ef-4f54-af34-f5ea901d4125-768x1250.png'
  }
];

const HeroBanner: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowVideo(true);
      setTimeout(() => {
        setShowVideo(false);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <VideoBackground 
        src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/OUTTRO-2-1080.mp4"
        className={`transition-opacity duration-1000 ${
          showVideo ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {slides.map((slide, index) => (
        <HeroSlide
          key={index}
          {...slide}
          isActive={index === currentSlide && !showVideo}
        />
      ))}
    </div>
  );
};

export default HeroBanner;