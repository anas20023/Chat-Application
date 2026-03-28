# Alpha Chat Backend - Real-time Engine (Socket.io)

This backend uses Socket.io to provide a low-latency, bi-directional communication layer for real-time chat, presence, and group management.

## Why Socket.io?
We chose Socket.io over vanilla WebSockets because:
- **Auto-reconnection**: Handles flaky connections automatically.
- **Rooms/Namespaces**: Built-in support for segregating message traffic (e.g., specific chat rooms).
- **Binary Support**: Efficiently handles media metadata and file transfers.
- **Fallbacks**: Supports HTTP long-polling if WebSockets are blocked by proxies.

## How it Works (The Flow)

### 1. Connection & Authentication
Every connection must provide a valid Firebase ID token. The backend verifies this token and attaches the MongoDB user object to the socket session.

```javascript
// Middleware for authentication
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const decodedToken = await getAuth().verifyIdToken(token);
  const user = await User.findOne({ firebaseUid: decodedToken.uid });
  
  socket.user = { _id: user._id, username: user.username };
  next();
});
```

### 2. Presence & Status Synchronization
When a user connects or disconnects, the server updates the database and broadcasts the change to all other connected clients.

```javascript
// On Connect
io.emit("user_status_changed", { userId: user._id, isOnline: true });

// On Disconnect
io.emit("user_status_changed", { userId: user._id, isOnline: false });
```

### 3. Messaging Flow
Messages are saved to MongoDB first to ensure persistence, then emitted to the specific room members.

```javascript
socket.on("send_message", async ({ roomId, message }) => {
  const newMessage = new Message({ senderId: socket.user._id, roomId, message });
  await newMessage.save();
  
  // Emit to the room participants
  io.to(roomId).emit("receive_message", newMessage);
});
```

### 4. Read Receipts
To mimic the Messenger experience, we track when a user actively views a room and update all messages from others as "seen".

```javascript
socket.on("mark_as_read", async ({ roomId }) => {
  await Message.updateMany(
    { roomId, senderId: { $ne: socket.user._id }, status: { $ne: 'seen' } },
    { $set: { status: 'seen' } }
  );
  io.to(roomId).emit("messages_read", { roomId, userId: socket.user._id });
});
```

## Key Socket Events
| Event | Direction | Purpose |
|-------|-----------|---------|
| `join_room` | Client -> Server | Join a specific chat room (Direct or Group) |
| `send_message` | Client -> Server | Send a new text/media message |
| `receive_message`| Server -> Client | New message arrival |
| `user_typing` | Server -> Client | Show typing indicator |
| `user_status_changed`| Server -> Client | Real-time Online/Offline tracking |
| `create_group` | Client -> Server | Initialize a new group chat room |
