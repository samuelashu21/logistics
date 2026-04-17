import { useContext } from 'react';
import { SocketContext } from './SocketContextValue.js';

export function useSocket() {
  return useContext(SocketContext);
} 