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
import InstallPWAButton from './components/InstallPWAButton';

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
            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<InitialLaunch />} />
                <Route path="/splash" element={<SplashPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/works" element={<DevelopmentPage />} />
                <Route path="/works/:id" element={<WorkDetailsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />
                <Route path="/register" element={<RegistrationPage />} />
                <Route path="/my-profile" element={<MyProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-conditions" element={<TermsPage />} />
                <Route path="/polls" element={<PollsPage />} />
                <Route path="/complaint" element={<ComplaintPage />} />
                <Route path="/my-complaints" element={<MyComplaintsPage />} />
                <Route path="/photo-gallery" element={<PhotoGalleryPage />} />
                <Route path="/video-gallery" element={<VideoGalleryPage />} />
                <Route path="/latest-updates" element={<LatestUpdatesPage />} />
                <Route path="/menu" element={<MenuPage />} />
                {/* Future feature placeholders */}
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/volunteer" element={<VolunteerPage />} />
                <Route path="/manifesto" element={<ManifestoPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/my-area" element={<MyAreaPage />} />
                <Route path="/poster-generator" element={<PosterGeneratorPage />} />
                {/* Catch‑all */}
                <Route path="*" element={<Placeholder name="404 Not Found" />} />
              </Routes>
            </div>
            {/* Floating PWA Install Prompt Button for browser users */}
            <InstallPWAButton />
          </div>
        </Router>
      </LanguageProvider>
    </TenantProvider>
  );
}
