import React from 'react';
import News from '../components/features/news/news';

export default function ActualitesPage({ role }) {
  const isGuest = !role || role === 'guest';

  return (
    <div className="min-h-screen bg-canvas">
      {isGuest && (
        <div className="mx-4 mt-6 rounded-lg border border-edge bg-brand-light px-4 py-3 text-center">
          <p className="text-sm text-brand">Sign in to personalize your feed and get notifications</p>
        </div>
      )}

      <News />
    </div>
  );
}
