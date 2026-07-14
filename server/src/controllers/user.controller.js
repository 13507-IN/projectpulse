import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        githubUsername: true,
        avatarUrl: true,
        bio: true,
        location: true,
        company: true,
        website: true,
        role: true,
        skills: true,
        interests: true,
        availability: true,
        experience: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      firstName,
      lastName,
      bio,
      location,
      company,
      website,
      role,
      skills,
      interests,
      availability,
      experience,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        firstName,
        lastName,
        bio,
        location,
        company,
        website,
        role,
        skills,
        interests,
        availability,
        experience,
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        githubUsername: true,
        avatarUrl: true,
        bio: true,
        location: true,
        company: true,
        website: true,
        role: true,
        skills: true,
        interests: true,
        availability: true,
        experience: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

// Get all users (for team matching)
export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { skills, interests, availability, limit = 20 } = req.query;

    const where = {
      id: { not: currentUserId }, // Exclude current user
    };

    if (skills) {
      where.skills = {
        hasSome: skills.split(','),
      };
    }

    if (interests) {
      where.interests = {
        hasSome: interests.split(','),
      };
    }

    if (availability) {
      where.availability = availability;
    }

    const users = await prisma.user.findMany({
      where,
      take: parseInt(limit),
      select: {
        id: true,
        name: true,
        githubUsername: true,
        avatarUrl: true,
        role: true,
        skills: true,
        interests: true,
        availability: true,
        experience: true,
        bio: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Register new user with email/password
export const registerUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Set session
    req.session.userId = user.id;

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Login with email/password
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Set session
    req.session.userId = user.id;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};
