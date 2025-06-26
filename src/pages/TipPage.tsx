import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TipPage: React.FC = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Tip Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome to the tip page!</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TipPage;