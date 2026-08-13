import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  isAdmin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem('bh_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [members, setMembers] = useState<User[]>(() => {
    const saved = localStorage.getItem('bh_members');
    return saved ? JSON.parse(saved) : [
      { id: '1', username: 'admin', password: '123', role: 'admin' },
      { id: '2', username: 'user1', password: '123', role: 'editor' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('bh_members', JSON.stringify(members));
  }, [members]);

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('bh_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bh_current_user');
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, members, setMembers, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
