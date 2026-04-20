import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-page)' }}>
      <SignIn routing="path" path="/sign-in" redirectUrl="/" />
    </div>
  );
}