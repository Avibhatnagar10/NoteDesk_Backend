import jwt from 'jsonwebtoken';

// shared verifier
export const verifyJwt = (req, res, next) => {
  const authHeader = req.headers["authorization"]; // "Bearer token"
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // take the token part
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded; // store decoded payload in req.user
    next(); // ✅ continue to your route
  });
};

// HTTP middleware
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Access Denied. No token provided' });

  const decoded = verifyJwt(token);
  if (!decoded) return res.status(403).json({ message: 'Invalid token' });

  req.user = decoded; // { userId, ... }
  next();
};

// Socket.IO middleware
export const socketAuth = (socket, next) => {
  // Prefer handshake.auth.token; fall back to Authorization header if provided
  const bearer = socket.handshake.headers?.authorization || '';
  const headerToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
  const token = socket.handshake.auth?.token || headerToken;

  if (!token) return next(new Error('No token provided'));
  const decoded = verifyJwt(token);
  if (!decoded) return next(new Error('Invalid token'));

  socket.user = decoded;            // attach user to socket
  socket.join(decoded.userId);      // join a room per-user for targeted emits
  next();
};
