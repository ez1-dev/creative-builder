import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  usuario: string | null;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [usuario, setUsuario] = useState(api.getUser());

  useEffect(() => {
    setIsAuthenticated(api.isAuthenticated());
    setUsuario(api.getUser());
  }, []);

  const login = useCallback(async (user: string, senha: string) => {
    const data = await api.login(user, senha);
    setIsAuthenticated(true);
    setUsuario(data.usuario);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setIsAuthenticated(false);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
