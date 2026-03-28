// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain:import.meta.env.VITE_FB_API_DOMAIN,
  projectId: import.meta.env.VITE_FB_API_P_ID,
  storageBucket: import.meta.env.VITE_FB_API_STORAGE_BUCKET, // Added for storage
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);