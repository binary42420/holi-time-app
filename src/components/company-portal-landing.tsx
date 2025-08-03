'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hand, LogIn, Calendar, Users, FileText, Clock, Shield, Phone } from 'lucide-react';

const features = [
  { icon: Calendar, title: 'Schedule Shifts', description: 'Create and manage work shifts for your projects and events.' },
  { icon: Users, title: 'Manage Staff', description: 'Shift Time Tracker' },
  { icon: FileText, title: 'Approve Timesheets', description: 'Review and approve employee timesheets with digital signatures.' },
  { icon: Clock, title: 'Real-time Tracking', description: 'Monitor clock-ins, breaks, and shift progress in real-time.' },
  { icon: Shield, title: 'Secure Access', description: 'Enterprise-grade security with role-based access controls.' },
  { icon: Phone, title: '24/7 Support', description: 'Get help when you need it with our dedicated support team.' },
];

export function CompanyPortalLanding() {
  return (
    <div className="bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Hand size={32} className="text-blue-600" />
              <h1 className="text-xl font-bold">Hands On Labor</h1>
            </div>
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Welcome to the
            <span className="text-blue-600"> Hands on Labor</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">Workforce Management Portal</p>
          
          <div className="flex justify-center gap-4 mb-12">
            <Button size="lg" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-5 w-5" /> Hands on Labor's WFM Portal
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="tel:619-299-5991">
                <Phone className="mr-2 h-5 w-5" /> Call (619) 299-5991
              </a>
            </Button>
          </div>

          <Card className="max-w-xl mx-auto bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">🔒 Secure Login Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-700">
                Contact us at (619)299-5991 to set up your company portal access or if you need login assistance.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-2">What You Can Do</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our company portal gives you complete control over your staffing operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto bg-blue-100 text-blue-600 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                    <feature.icon size={32} />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-lg max-w-2xl mx-auto mb-8 text-blue-100">
            Contact us today to set up your company portal access and start managing
            your workforce more efficiently.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <a href="tel:619-299-5991">
                Call (619) 299-5991
              </a>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600" asChild>
              <Link href="/login">
                Sign In to Portal
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Hand size={24} />
            <p className="text-lg font-semibold">Hands On Labor</p>
          </div>
          <p className="text-gray-400 mb-2">
            Professional staffing solutions for your business needs.
          </p>
          <p className="text-sm text-gray-500">
            © 2024 Hands On Labor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
