import express from 'express';
import Note from '../models/Note.js';
import {io} from '../server.js';
import { verifyToeken } from '../middleware/auth.js';
import { redisClient } from "../server.js";

const router = express.Router();

//Add a Note
router.post('/', verifyToeken, async (req, res) => {
    try {
        const { title, content } = req.body;
        const newNote = new Note({
            userId: req.user.userId,
            title,
            content,
        });
        await newNote.save();
        // Emit real-time update to the user
        io.to(req.user.userId).emit('newNote', newNote);

        // Invalidate cache for all pages (simple way: delete all cache for user)
        const keys = await redisClient.keys(`notes:${req.user.userId}:*`);
        for (let key of keys) {
            await redisClient.del(key);
        }

        res.status(201).json(newNote);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

//Fetch notes (with pagination)
router.get("/", verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const userId = req.user.userId;

        const cacheKey = `notes:${userId}:page:${page}`;

        // Check cache first
        const cachedNotes = await redisClient.get(cacheKey);
        if (cachedNotes) {
            return res.json(JSON.parse(cachedNotes));
        }

        // If not cached, fetch from MongoDB
        const notes = await Note.find({ userId })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        // Store in Redis cache (e.g., expire after 5 minutes)
        await redisClient.setEx(cacheKey, 300, JSON.stringify(notes));

        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;