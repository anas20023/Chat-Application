import User from "../models/User.js";

// Sync Firebase User with MongoDB
export const syncUser = async (req, res) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: "UID and Email are required" });
    }

    // Update or Create user
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Ensure username is unique (fallback to email prefix if display name is missing)
      const baseName = (displayName || email.split('@')[0]).replace(/\s+/g, '_').toLowerCase();
      const uniqueUsername = `${baseName}_${Math.floor(Math.random() * 1000)}`;
      
      user = new User({
        firebaseUid: uid,
        email,
        name:(displayName==null?uniqueUsername:displayName), // Use displayName or fallback
        username: uniqueUsername,
        photoURL
      });
      await user.save();
    } else {
      // Sync latest info from Firebase
      if (photoURL) user.photoURL = photoURL;
      // If the user previously didn't have a good username, we could update it here,
      // but usually, we keep it once created.
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Search users by username or email
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
