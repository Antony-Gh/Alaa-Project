const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

class RealtimeService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.userRooms = new Map(); // userId -> rooms
  }

  initialize(server) {
    if (!config.realtime.enabled) {
      logger.info('📡 Real-time service disabled');
      return;
    }

    try {
      this.io = socketIo(server, {
        cors: config.realtime.cors,
        transports: ['websocket', 'polling'],
      });

      this.setupMiddleware();
      this.setupEventHandlers();

      logger.info('📡 Real-time service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize real-time service', {
        error: error.message,
      });
    }
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.username = decoded.username;

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', socket => {
      logger.info('📡 User connected', {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
      });

      // Store user connection
      this.connectedUsers.set(socket.userId, socket);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);
      this.userRooms.set(socket.userId, [`user:${socket.userId}`]);

      // Join role-based room
      socket.join(`role:${socket.userRole}`);
      this.userRooms.get(socket.userId).push(`role:${socket.userRole}`);

      // Join admin room if user is admin
      if (socket.userRole === 'admin') {
        socket.join('admin');
        this.userRooms.get(socket.userId).push('admin');
      }

      // Handle user typing
      socket.on('typing', data => {
        socket.broadcast.to(`user:${data.recipientId}`).emit('user-typing', {
          userId: socket.userId,
          username: socket.username,
        });
      });

      // Handle user stopped typing
      socket.on('stop-typing', data => {
        socket.broadcast
          .to(`user:${data.recipientId}`)
          .emit('user-stop-typing', {
            userId: socket.userId,
            username: socket.username,
          });
      });

      // Handle user status
      socket.on('status-change', data => {
        socket.broadcast.emit('user-status-change', {
          userId: socket.userId,
          username: socket.username,
          status: data.status,
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info('📡 User disconnected', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id,
        });

        this.connectedUsers.delete(socket.userId);
        this.userRooms.delete(socket.userId);
      });
    });
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
      logger.info('📡 Notification sent to user', {
        userId,
        event,
        socketId: socket.id,
      });
    } else {
      logger.warn('⚠️ User not connected for notification', { userId, event });
    }
  }

  // Send notification to all users with specific role
  sendToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
    logger.info('📡 Notification sent to role', { role, event });
  }

  // Send notification to all admin users
  sendToAdmins(event, data) {
    this.io.to('admin').emit(event, data);
    logger.info('📡 Notification sent to admins', { event });
  }

  // Send notification to all connected users
  sendToAll(event, data) {
    this.io.emit(event, data);
    logger.info('📡 Notification sent to all users', { event });
  }

  // Send appointment-related notifications
  sendAppointmentCreated(appointment, createdBy) {
    const notification = {
      type: 'appointment_created',
      appointment,
      createdBy,
      timestamp: new Date().toISOString(),
    };

    // Notify admins
    this.sendToAdmins('appointment:created', notification);

    // Notify the user who created the appointment
    this.sendToUser(createdBy.id, 'appointment:created', notification);
  }

  sendAppointmentUpdated(appointment, updatedBy, oldStatus, newStatus) {
    const notification = {
      type: 'appointment_updated',
      appointment,
      updatedBy,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    };

    // Notify admins
    this.sendToAdmins('appointment:updated', notification);

    // Notify the appointment owner
    this.sendToUser(appointment.userId, 'appointment:updated', notification);
  }

  sendAppointmentReminder(appointment, user) {
    const notification = {
      type: 'appointment_reminder',
      appointment,
      user,
      timestamp: new Date().toISOString(),
    };

    this.sendToUser(user.id, 'appointment:reminder', notification);
  }

  // Send system notifications
  sendSystemNotification(message, type = 'info', recipients = 'all') {
    const notification = {
      type: 'system',
      message,
      notificationType: type,
      timestamp: new Date().toISOString(),
    };

    switch (recipients) {
      case 'admins':
        this.sendToAdmins('system:notification', notification);
        break;
      case 'employees':
        this.sendToRole('employee', 'system:notification', notification);
        break;
      default:
        this.sendToAll('system:notification', notification);
    }
  }

  // Send real-time statistics updates
  sendStatsUpdate(stats) {
    const update = {
      type: 'stats_update',
      stats,
      timestamp: new Date().toISOString(),
    };

    this.sendToAdmins('stats:update', update);
  }

  // Send user activity updates
  sendUserActivity(userId, activity) {
    const update = {
      type: 'user_activity',
      userId,
      activity,
      timestamp: new Date().toISOString(),
    };

    this.sendToAdmins('user:activity', update);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  getConnectedUsersByRole(role) {
    const users = [];
    this.connectedUsers.forEach((socket, userId) => {
      if (socket.userRole === role) {
        users.push({
          userId,
          username: socket.username,
          socketId: socket.id,
        });
      }
    });
    return users;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get user's socket
  getUserSocket(userId) {
    return this.connectedUsers.get(userId);
  }

  // Broadcast to specific room
  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
    logger.info('📡 Notification sent to room', { room, event });
  }

  // Join user to room
  joinUserToRoom(userId, room) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.join(room);
      const userRooms = this.userRooms.get(userId) || [];
      if (!userRooms.includes(room)) {
        userRooms.push(room);
        this.userRooms.set(userId, userRooms);
      }
      logger.info('📡 User joined room', { userId, room });
    }
  }

  // Remove user from room
  removeUserFromRoom(userId, room) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.leave(room);
      const userRooms = this.userRooms.get(userId) || [];
      const index = userRooms.indexOf(room);
      if (index > -1) {
        userRooms.splice(index, 1);
        this.userRooms.set(userId, userRooms);
      }
      logger.info('📡 User left room', { userId, room });
    }
  }
}

module.exports = new RealtimeService();
