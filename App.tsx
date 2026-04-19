import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import SharedWithMe from './pages/SharedWithMe';
import UserSettings from './pages/UserSettings';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } }} />
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
                  <Route path="/shared" element={<SharedWithMe />} />
                  <Route path="/settings" element={<UserSettings />} />
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
