import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useFavorites = () => {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Sync favorites when user logs in/out
  useEffect(() => {
    const username = currentUser ? currentUser.username : 'guest';
    const saved = localStorage.getItem(`bh_favorites_${username}`);
    setFavorites(saved ? JSON.parse(saved) : []);
  }, [currentUser]);

  // Save favorites to localStorage on updates
  const toggleFavorite = (businessId: string) => {
    const username = currentUser ? currentUser.username : 'guest';
    setFavorites(prev => {
      let updated: string[];
      if (prev.includes(businessId)) {
        updated = prev.filter(id => id !== businessId);
      } else {
        updated = [...prev, businessId];
      }
      localStorage.setItem(`bh_favorites_${username}`, JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorited = (businessId: string): boolean => {
    return favorites.includes(businessId);
  };

  return { favorites, toggleFavorite, isFavorited };
};
