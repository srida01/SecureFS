import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard.tsx';
import AdminPanel from './pages/AdminPanel.tsx';
import SignInPage from './pages/SignInPage.tsx';
import SignUpPage from './pages/SignUpPage.tsx';
import UserSettings from './pages/UserSettings.tsx';
import SharedWithMe from './pages/SharedWithMe.tsx';
import SharedByMe from './pages/SharedByMe.tsx';
import { setupAxiosInterceptor } from './services/api';

function AuthInterceptorSetup() {
  const { getToken } = useAuth();
  const isSetupRef = useRef(false);

  useEffect(() => {
    // Only set up interceptor once
    if (!isSetupRef.current && getToken) {
      isSetupRef.current = true;
      setupAxiosInterceptor(getToken);
    }
  }, [getToken]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <SignedIn>
        <AuthInterceptorSetup />
      </SignedIn>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/settings" element={<UserSettings />} />
                  <Route path="/shared" element={<SharedWithMe />} />
                  <Route path="/shared-by-me" element={<SharedByMe />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
