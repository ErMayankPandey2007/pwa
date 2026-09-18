import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/LoadingSpinner';
import RegistrationPage from './components/RegistrationPage';
import MyAreaPage from './components/MyAreaPage';
import VolunteerPage from './components/VolunteerPage';
import MembershipPage from './components/MembershipPage';
import ManifestoPage from './components/ManifestoPage';
import SearchPage from './components/SearchPage';
import PosterGeneratorPage from './components/PosterGeneratorPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TenantProvider } from './context/TenantContext';
import { LanguageProvider } from './context/LanguageContext';
import LanguageModal from './components/LanguageModal';
import SplashPage from './components/SplashPage';
import OnboardingPage from './components/OnboardingPage';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import { setupForegroundFcmListener, syncFcmTokenIfPermitted } from './services/firebase';

import CompleteProfileModal from './components/CompleteProfileModal';
import ProtectedRoute from './components/ProtectedRoute';

// Global Registration Modal Handler across all routes
function GlobalRegistrationModal() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('pwa_open_registration', handleOpen);
    return () => window.removeEventListener('pwa_open_registration', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <CompleteProfileModal
      isOpen={isOpen}
      isMandatory={false}
      onClose={() => setIsOpen(false)}
      onComplete={(updatedUser) => {
        setIsOpen(false);
      }}
    />
  );
}

// Route helper to show splash on app load
const InitialLaunch = () => {
  const hasSeenSplash = localStorage.getItem('pwa_has_seen_splash');
  if (!hasSeenSplash) {
    return <SplashPage />;
  }
  return <Navigate to="/home" replace />;
};
import AboutPage from './components/AboutPage';
import DevelopmentPage from './components/DevelopmentPage';
import WorkDetailsPage from './components/WorkDetailsPage';
import EventsPage from './components/EventsPage';
import EventDetailsPage from './components/EventDetailsPage';
import MyProfilePage from './components/MyProfilePage';
import NotificationsPage from './components/NotificationsPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsPage from './components/TermsPage';
import PollsPage from './components/PollsPage';
import ComplaintPage from './components/ComplaintPage';
import MyComplaintsPage from './components/MyComplaintsPage';
import PhotoGalleryPage from './components/PhotoGalleryPage';
import VideoGalleryPage from './components/VideoGalleryPage';
import LatestUpdatesPage from './components/LatestUpdatesPage';
import MenuPage from './components/MenuPage';

// Placeholder component for future pages
const Placeholder = ({ name }) => (
  <div className="flex items-center justify-center h-full text-xl text-gray-500 p-8">
    {name} – Coming Soon
  </div>
);

export default function App() {
  useEffect(() => {
    // 1. Synchronize token if permission was previously granted
    syncFcmTokenIfPermitted();

    // 2. Setup foreground push notification handler
    let unsubscribe = () => {};
    setupForegroundFcmListener().then((unsub) => {
      if (typeof unsub === 'function') unsubscribe = unsub;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (

    <TenantProvider>
      <LanguageProvider>
        <Router>
          <ScrollToTop />
          <div className="flex flex-col min-h-screen bg-[#f8fafc]">
            <ToastContainer position="top-center" autoClose={2000} hideProgressBar theme="colored" />
            {/* Global Language Selection Modal */}
            <LanguageModal />
            {/* Global Registration Modal for all pages */}
            <GlobalRegistrationModal />
            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<InitialLaunch />} />
                <Route path="/splash" element={<SplashPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegistrationPage />} />

                {/* Public & Browsing Routes */}
                <Route path="/home" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/works" element={<DevelopmentPage />} />
                <Route path="/works/:id" element={<WorkDetailsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />
                <Route path="/photo-gallery" element={<PhotoGalleryPage />} />
                <Route path="/video-gallery" element={<VideoGalleryPage />} />
                <Route path="/latest-updates" element={<LatestUpdatesPage />} />
                <Route path="/manifesto" element={<ManifestoPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-conditions" element={<TermsPage />} />

                {/* Protected Action Routes - require registration to access */}
                <Route path="/my-profile" element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/polls" element={<ProtectedRoute><PollsPage /></ProtectedRoute>} />
                <Route path="/complaint" element={<ProtectedRoute><ComplaintPage /></ProtectedRoute>} />
                <Route path="/my-complaints" element={<ProtectedRoute><MyComplaintsPage /></ProtectedRoute>} />
                <Route path="/membership" element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
                <Route path="/volunteer" element={<ProtectedRoute><VolunteerPage /></ProtectedRoute>} />
                <Route path="/my-area" element={<ProtectedRoute><MyAreaPage /></ProtectedRoute>} />
                <Route path="/poster-generator" element={<ProtectedRoute><PosterGeneratorPage /></ProtectedRoute>} />
                
                {/* Catch‑all */}
                <Route path="*" element={<Placeholder name="404 Not Found" />} />
              </Routes>
            </div>
          </div>
        </Router>
      </LanguageProvider>
    </TenantProvider>
  );
}
