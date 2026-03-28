# Alpha Chat Frontend - Real-time Interface

This frontend is built with React, Tailwind CSS, and Zustand. It communicates with the backend via Socket.io to provide a seamless, real-time messaging experience.

## Real-time Architecture

### 1. Socket Service (Singleton)
We use a singleton class to manage the socket connection across the entire application. This ensures we don't create multiple connections.

```javascript
// src/services/socket.service.js
class SocketService {
  connect(token) {
    this.socket = io(SOCKET_URL, { auth: { token } });
    return this.socket;
  }
  emit(event, data) {
    this.socket.emit(event, data);
  }
}
```

### 2. Global State Sync (Zustand)
The `useChatStore` acts as the bridge between socket events and the UI. When a socket event arrives, the store updates, triggering a re-render in the relevant components.

```javascript
// Example: Handling new messages in the store
socket.on("receive_message", (newMessage) => {
  set((state) => ({ 
    messages: [...state.messages, newMessage] 
  }));
});
```

### 3. Theme Management
Dark and light modes are handled via a global `theme` state in Zustand. We use Tailwind's conditional classes to switch styles.

```jsx
// src/pages/Dashboard.jsx
<div className={`h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
  {/* Content */}
</div>
```

## Feature Implementation Details

### Voice Messaging
1. **Record**: Uses `MediaRecorder` API to capture audio blobs.
2. **Upload**: Blobs are uploaded to Firebase Storage.
3. **Send**: The resulting URL is sent via `send_message` with `messageType: 'voice'`.
4. **Render**: `MessageBubble` detect the type and renders a custom audio player.

### Messenger-style Read Receipts
We monitor the `activeRoom` state. When a user opens a room, we emit `mark_as_read`. The backend then broadcasts `messages_read` to other participants, updating their UI to show the "Seen" indicator.

```javascript
// In ChatWindow.jsx
useEffect(() => {
  if (activeRoom) {
    socketService.emit('mark_as_read', { roomId: activeRoom._id });
  }
}, [activeRoom]);
```

## Tech Stack
- **React**: UI Framework
- **Zustand**: State Management
- **Tailwind CSS**: Styling & Dark Mode
- **React Icons**: Icon Library
- **Socket.io-client**: Real-time Communication
- **Firebase**: Authentication & Media Storage
