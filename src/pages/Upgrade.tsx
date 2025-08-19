import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Star, Check, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Upgrade: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedPlan = searchParams.get('plan');
  const { toast } = useToast();

  const plans = [
    {
      id: 'silver',
      name: 'Silver Plus',
      price: '$19.99',
      period: 'month',
      icon: <Star className="w-8 h-8 text-yellow-500" />,
      color: 'from-yellow-500 to-yellow-600',
      hoverColor: 'from-yellow-600 to-yellow-700',
      features: [
        'Upload up to 260 photos',
        'Upload up to 48 videos',
        'Access to Silver content',
        'Priority support',
        'Advanced analytics',
        'Custom branding'
      ],
      popular: false
    },
    {
      id: 'gold',
      name: 'Gold Plus',
      price: '$39.99',
      period: 'month',
      icon: <Crown className="w-8 h-8 text-yellow-500" />,
      color: 'from-yellow-400 to-orange-500',
      hoverColor: 'from-yellow-500 to-orange-600',
      features: [
        'Unlimited uploads',
        'Access to all content tiers',
        'Premium features',
        'VIP support',
        'Advanced analytics',
        'Custom branding',
        'API access',
        'White-label options'
      ],
      popular: true
    }
  ];

  const handleUpgrade = (planId: string) => {
    // TODO: Integrate with PayPal payment system
    console.log(`Upgrading to ${planId}`);
    toast({
      title: 'Coming Soon',
      description: 'Payment integration will be available soon!'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock premium features, higher upload limits, and exclusive content access
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-2 text-sm font-semibold rounded-bl-lg">
                  Most Popular
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600">/{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  className={`w-full bg-gradient-to-r ${plan.color} hover:${plan.hoverColor} text-white font-semibold py-3 text-lg`}
                >
                  Upgrade to {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Current Plan Info */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Current Plan: Free
              </h3>
              <p className="text-gray-600 mb-4">
                You're currently on the free plan with limited features. 
                Upgrade to unlock your full potential!
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => handleUpgrade('silver')}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                >
                  Start with Silver Plus
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
