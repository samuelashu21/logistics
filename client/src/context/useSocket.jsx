import { useContext } from 'react';
import { SocketContext } from './SocketContext.jsx';

export function useSocket() {
  return useContext(SocketContext);
}