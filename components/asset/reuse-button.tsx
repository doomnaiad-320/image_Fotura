'use client';

import { useState, useEffect } from 'react';
import { ReuseDialog } from './reuse-dialog';
import { Button } from '@/components/ui/button';

export interface ReuseButtonProps {
  assetId: string;
  assetTitle: string;
  isAuthenticated: boolean;
  userCredits?: number;
  reusePoints?: number;
}

export function ReuseButton({
  assetId,
  assetTitle,
  isAuthenticated,
  userCredits = 0,
  reusePoints = 50
}: ReuseButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  console.log('[ReuseButton] Rendered:', { assetId, assetTitle, isAuthenticated, userCredits, reusePoints });

  const handleClick = () => {
    console.log('[ReuseButton] Button clicked');
    if (!isAuthenticated) {
      // 跳转到登录页
      console.log('[ReuseButton] User not authenticated, redirecting...');
      window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href);
      return;
    }

    console.log('[ReuseButton] Opening dialog...');
    setDialogOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        className="flex-1"
        onClick={handleClick}
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        复用
      </Button>

      {isAuthenticated && (
        <ReuseDialog
          open={dialogOpen}
          assetId={assetId}
          assetTitle={assetTitle}
          reusePoints={reusePoints}
          userCredits={userCredits}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

export default ReuseButton;
