import { initializeApp, cert } from 'firebase-admin/app';
const FirebaseConfig = () => {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            initializeApp({
                credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
            });
            console.log('Firebase Admin initialized');
        } catch (error) {
            console.error('Firebase Admin initialization error:', error);
        }
    } else {
        console.warn('Firebase service account not found in environment variables');
    }

}
export default FirebaseConfig