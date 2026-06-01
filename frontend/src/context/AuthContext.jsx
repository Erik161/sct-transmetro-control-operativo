import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const stored = localStorage.getItem('sct_usuario');
    return stored ? JSON.parse(stored) : null;
  });

  const value = useMemo(() => ({
    usuario,
    login(data) {
      localStorage.setItem('sct_token', data.token);
      localStorage.setItem('sct_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
    },
    logout() {
      localStorage.removeItem('sct_token');
      localStorage.removeItem('sct_usuario');
      setUsuario(null);
    }
  }), [usuario]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
