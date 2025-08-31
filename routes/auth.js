import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// ----------------- SIGNUP -----------------
router.post('/signup', async (req, res) => {
  console.log("📩 Incoming body:", req.body);
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user
    const newUser = new User({ username, email,  passwordHash });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------- LOGIN -----------------
router.post('/login', async (req, res) => {
  console.log("📩 Incoming body:", req.body);
  try {
    const { username, email, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(username, user.username) || await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({message:"Login Succesful 🎉", token, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
