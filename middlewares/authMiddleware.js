const jwt = require("jsonwebtoken");

// ✅ Middleware for authenticating users (JWT verification)
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.log("🚨 No token provided");
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      username: decoded.username,
      roles: decoded.roles || [], // 🆕 support for multiple roles
    };
    console.log("✅ User Authenticated:", req.user);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// ✅ Updated Middleware for multi-role authorization
const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    console.log("🔍 Checking Roles:", req.user.roles, "Allowed:", allowedRoles);

    const hasPermission = req.user.roles.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      console.log("🚨 Access Denied. Required:", allowedRoles, "Found:", req.user.roles);
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

module.exports = { authenticateUser, authorizeRole };
