import React from 'react';
import SiteFooter from './SiteFooter.jsx';

export default function MainLayout({ children, className = '', showFooter = true }) {
  const layoutClassName = ['reader-site', className].filter(Boolean).join(' ');

  return (
    <div className={layoutClassName}>
      {children}
      {showFooter && <SiteFooter />}
    </div>
  );
}
