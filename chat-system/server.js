// Simple Socket.IO server for chat-system
const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});
require('dotenv').config({ path: '../.env' });
const { verifyToken, createClerkClient } = require('@clerk/backend');

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const user = await clerkClient.users.getUser(payload.sub);
    socket.userName = user.firstName || user.username || user.emailAddresses[0].emailAddress;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join', (room) => {
    socket.join(room);
  });
  socket.on('leave', (room) => {
    socket.leave(room);
  });
  socket.on('message', ({ text, room }) => {
    // Force the authenticated user's name
    io.to(room).emit('message', { user: socket.userName, text });
  });
});

const PORT = process.env.CHAT_PORT || 4001;
httpServer.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});
