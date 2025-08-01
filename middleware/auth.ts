import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

//  Extended Request interface με user data
export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    email: string;
    role: string;
  };
}

//  JWT User Payload interface
interface JWTPayload {
  user_id: number;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

//  Middleware για έλεγχο authentication
export const authenticateToken = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
    return;
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Προσθήκη user data στο request
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    console.log(' User authenticated:', req.user.username);
    next();
    
  } catch (error) {
    console.error(' Token verification failed:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Token verification error'
      });
    }
    return;
  }
};

//  Middleware για έλεγχο admin role
export const requireAdmin = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  console.log(' Admin access granted:', req.user.username);
  next();
};

//  Middleware για έλεγχο user ownership ή admin
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const targetUserId = parseInt(req.params[userIdParam]);
    const currentUserId = req.user.user_id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && currentUserId !== targetUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own data'
      });
      return;
    }

    console.log(' Ownership/Admin access granted:', req.user.username);
    next();
  };
};

//  Optional authentication - δεν κάνει fail αν δεν υπάρχει token
export const optionalAuth = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Δεν υπάρχει token, συνεχίζουμε χωρίς authentication
    next();
    return;
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    console.log(' Optional auth successful:', req.user.username);
  } catch (error) {
    console.log(' Optional auth failed, continuing without user');
    // Δεν κάνουμε throw error, απλά συνεχίζουμε
  }

  next();
};

export default {
  authenticateToken,
  requireAdmin,
  requireOwnershipOrAdmin,
  optionalAuth
};