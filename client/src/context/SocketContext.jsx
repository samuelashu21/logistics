import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const newSocket = io({
      auth: { token },
    });

    newSocket.on('connect', () => {
      if (user?._id) {
        newSocket.emit('join', user._id);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated, token, user?._id]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}