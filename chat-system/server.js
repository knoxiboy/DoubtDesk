// Simple Socket.IO server for chat-system
const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  socket.on('join', (room) => {
    socket.join(room);
  });
  socket.on('leave', (room) => {
    socket.leave(room);
  });
  socket.on('message', ({ user, text, room }) => {
    io.to(room).emit('message', { user, text });
  });
});

const PORT = process.env.CHAT_PORT || 4001;
httpServer.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});
