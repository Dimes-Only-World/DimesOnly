import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

const Upgrade = () => {
  const packages = [
    {
      name: 'SILVER PACKAGE',
      price: '$49.99',
      badge: 'POSITIONS LIMITED',
      savings: 'SAVE 72%',
      warning: 'PRICE GOING UP SOON!',
      benefits: [
        '20% override on all the free people that join under your link in phase 2.',
        '30% of all subscriptions/memberships sold through your link now.',
        '40% of tips designated to you through your link.',
        '20% of tips if designated to you through someone else\'s link.',
        '20% of tips if they choose you to tip.',
        'Do not share any of your profit with the sponsors.',
        'Do not wait to get sponsored and pay for a profit-sharing position.'
      ]
    },
    {
      name: 'GOLD PACKAGE',
      price: '$99.99',
      benefits: [
        'All the benefits of the Silver Package.',
        'Lifetime FREE admission to all events surrounding the show and cast members forever.',
        'Lifetime subscription to the upcoming FLAME FLIX Social media webpage on ALL affiliated platform apps.',
        'Be 1 of 10 out of 300 chosen to be in the semi-finals every year, instead of competing against millions of dancers that join FREE.',
        'This increases your chances of going to the semi-finals every year in Los Angeles, CA.',
        'Get featured on our Instagram page along with cast members.'
      ]
    },
    {
      name: 'DIAMOND PACKAGE',
      price: '$150.00',
      subtitle: 'SPLIT PAYMENT IN 3',
      monthly: '$53.25 a month includes transaction fees',
      benefits: [
        'GET ALL THE BENEFITS OF FREE, SILVER AND GOLD',
        'VIP Access & VIP Section 4 times a year + 1 person you can bring FREE.',
        'Profit share 10% of companies gross sales FOREVER split among the first 300 dancers.',
        'Get featured on our Instagram page along with cast members.',
        'Get featured on the opening page of the App every day for 3 years.'
      ]
    },
    {
      name: 'ELITE PACKAGE',
      price: '$10,000.00',
      benefits: [
        'GET ALL THE BENEFITS OF FREE, SILVER AND GOLD',
        'VIP Access & VIP Section 4 times a year + 3 people you can bring FREE.',
        'Get 10% profit shared equally in the elite club',
        'Get exclusive VIP access to all Yacht and Mansion Parties globally.',
        'Come to season reunions free for updates and meet and greets to new celebrity host and cast members'
      ]
    }
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">UPGRADE YOUR MEMBERSHIP</h1>
            <div className="bg-yellow-400 text-black p-4 rounded-lg mb-6">
              <p className="font-bold text-lg mb-2">TRUST THIS MESSAGE.</p>
              <p className="mb-2">Any questions Email Question with your username to:</p>
              <p className="font-bold text-xl mb-2">Talent@DimesOnly.World</p>
              <p className="mb-2">Paid positions are available & can make you up to $25,000 a year.</p>
              <p className="font-bold mb-2">THIS IS AN OPPORTUNITY THAT WILL NOT LAST.</p>
              <p className="mb-2">IF YOU DO NOT UNDERSTAND THE BENEFITS, CONTACT US TO MAKE AN INFORMED DECISION.</p>
              <p className="font-bold">Fill out the Application when you are ready.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg, index) => (
              <Card key={index} className="bg-black/80 border-2 border-pink-500 text-white">
                <CardHeader>
                  <CardTitle className="text-pink-400 text-xl">{pkg.name}</CardTitle>
                  <CardDescription className="text-3xl font-bold text-white">{pkg.price}</CardDescription>
                  {pkg.badge && <Badge className="bg-red-600 text-white">{pkg.badge}</Badge>}
                  {pkg.savings && <Badge className="bg-green-600 text-white">{pkg.savings}</Badge>}
                  {pkg.warning && <p className="text-red-400 font-bold">{pkg.warning}</p>}
                  {pkg.subtitle && <p className="text-yellow-400 font-bold">{pkg.subtitle}</p>}
                  {pkg.monthly && <p className="text-sm text-gray-300">{pkg.monthly}</p>}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {pkg.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                    UPGRADE NOW
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Upgrade;