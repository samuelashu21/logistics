const { Server } = require('socket.io');

let io;

const socketManager = {
  init(server) {
    io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Be explicit rather than using '*'
    methods: ["GET", "POST"],
    credentials: true
  }
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
