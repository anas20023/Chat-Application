import mongoose from "mongoose";
const MongoDBConnection = () => {
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ALPHA-CHAT-APP')
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('MongoDB connection error:', err));
}
export default MongoDBConnection