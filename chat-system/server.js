// Simple Socket.IO server for chat-system
const { createServer } = require('http');
const { Server } = require('socket.io');
const { neon } = require('@neondatabase/serverless');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});
require('dotenv').config({ path: '../.env' });
const { verifyToken, createClerkClient } = require('@clerk/backend');

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const sql = neon(process.env.DATABASE_URL);

// Rooms that any signed-in user may join, regardless of classroom membership.
const PUBLIC_ROOMS = new Set(['general', 'peer-to-peer']);

// Checks whether userEmail is allowed to join `room`.
// - Public rooms (general, peer-to-peer) are open to anyone authenticated.
// - Any other room is treated as a classroom ID and checked against the
//   memberships table (or classroom ownership, for the teacher), mirroring
//   the same rule the main app already enforces in
//   src/lib/auth/membership-guard.ts requireMembership().
async function checkRoomAccess(userEmail, room) {
  if (PUBLIC_ROOMS.has(room)) {
    return true;
  }

  const classroomId = Number(room);
  if (!Number.isInteger(classroomId) || classroomId <= 0) {
    // Unrecognized room format - fail closed instead of guessing.
    return false;
  }

  const rows = await sql`
    SELECT 1 FROM "memberships"
    WHERE "userEmail" = ${userEmail} AND "classroomId" = ${classroomId}
    UNION
    SELECT 1 FROM "classrooms"
    WHERE "id" = ${classroomId} AND "teacherEmail" = ${userEmail}
    LIMIT 1
  `;

  return rows.length > 0;
}

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
    socket.userEmail = user.primaryEmailAddress?.emailAddress;
    socket.userName = user.firstName || user.username || socket.userEmail;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join', async (room) => {
    try {
      const isAuthorized = await checkRoomAccess(socket.userEmail, room);
      if (!isAuthorized) {
        return socket.emit('error', 'Unauthorized to join room');
      }
      socket.join(room);
    } catch (err) {
      console.error('Room access check failed:', err);
      socket.emit('error', 'Could not verify room access');
    }
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
