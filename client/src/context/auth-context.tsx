
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  access_token?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/user', {
        method: 'GET',
        credentials: 'include', // Important for sending cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser({
            id: data.user.id,
            login: data.user.login || data.user.githubUsername,
            name: data.user.name,
            email: data.user.email,
            avatar_url: data.user.avatarUrl || data.user.avatar_url,
            access_token: data.user.access_token
          });
        } else {
          setUser(null);
        }
      } else if (response.status === 401) {
        // Clear any invalid session
        setUser(null);
        document.cookie = 'user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const loginStatus = params.get('login');
    
    if (loginStatus === 'success') {
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Verify the session
      checkAuth();
    } else {
      // Regular auth check
      checkAuth();
    }
  }, []);

  const login = async () => {
    try {
      // Redirect directly to the GitHub OAuth URL
      // The backend will handle the OAuth flow and redirect back to the frontend
      window.location.href = 'http://localhost:4000/api/auth/github';
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('http://localhost:4000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear local state
      localStorage.removeItem('token');
      setUser(null);
      
      // Force a hard refresh to clear any session state
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated: !!user,
      login, 
      logout, 
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
