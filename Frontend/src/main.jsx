import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import ThemeProvider from './components/ThemeProvider.jsx';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY || 'missing'}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>,
);
