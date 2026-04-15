const { Server } = require('socket.io');

let io;

const socketManager = {
  init(server) {
    io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${socket.id} joined room: ${userId}`);
      });

      socket.on('updateLocation', (data) => {
        socket.to('tracking').emit('locationUpdated', data);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    return io;
  },

  getIO() {
    if (!io) {
      throw new Error('Socket.io not initialized. Call init(server) first.');
    }
    return io;
  },
};

module.exports = socketManager;
