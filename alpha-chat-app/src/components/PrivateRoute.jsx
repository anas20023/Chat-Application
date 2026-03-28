import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../config/firebase.config';
import useChatStore from '../store/useChatStore';

const PrivateRoute = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const {theme} = useChatStore();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className={`h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse text-sm font-medium">Initializing Alpha Chat...</p>
      </div>
    </div>;
  }

  return currentUser ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;