import { useContext } from 'react';
import { SocketContext } from './socketContext.js';

export function useSocket() {
  return useContext(SocketContext);
}
