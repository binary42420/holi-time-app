"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Hand, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Stage = 'enter-email' | 'reset-password' | 'success';

export default function ForgotPasswordPage() {
  const [stage, setStage] = useState<Stage>('enter-email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send reset code');
      setStage('reset-password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');
      setStage('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (stage) {
      case 'enter-email':
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Code'}</Button>
          </form>
        );
      case 'reset-password':
        return (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="grid gap-2 text-center">
              <Label htmlFor="code">Enter Verification Code</Label>
              <p className="text-sm text-muted-foreground">A 6-digit code was sent to {email}</p>
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Resetting...' : 'Reset Password'}</Button>
          </form>
        );
      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="text-green-600 mx-auto" />
            <h2 className="text-xl font-semibold">Password Reset Successful</h2>
            <p className="text-muted-foreground">You can now log in with your new password.</p>
            <Link href="/login" className="w-full">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Hand size={48} className="text-blue-600" />
          </div>
          <CardTitle>
            {stage === 'reset-password' ? 'Create New Password' : 'Forgot Password'}
          </CardTitle>
          <CardDescription>
            {stage === 'enter-email' && "Enter your email to receive a verification code."}
            {stage === 'reset-password' && "We've sent a code to your email. Please enter it and your new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {renderContent()}
          {stage !== 'success' && (
            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
