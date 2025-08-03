'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from "lucide-react";
import { PageWrapper } from '@/components/page-wrapper';

interface DashboardPageProps {
  title: string | React.ReactNode;
  description?: string;
  buttonText?: string;
  buttonAction?: () => void;
  children: React.ReactNode;
}

export function DashboardPage({
  title,
  description,
  buttonText,
  buttonAction,
  children,
}: DashboardPageProps) {
  const actions = buttonText && buttonAction ? (
    <Button onClick={buttonAction}>
      <Plus className="h-4 w-4 mr-2" />
      {buttonText}
    </Button>
  ) : undefined;

  return (
    <PageWrapper
      title={title}
      description={description}
      actions={actions}
    >
      <div className="space-y-6">
        {children}
      </div>
    </PageWrapper>
  );
}