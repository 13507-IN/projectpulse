import prisma from '../config/prisma.js';
import { 
  calculateMatchScore, 
  calculateMatchDetails,
  generateUserEmbedding, 
  findSimilarUsers 
} from '../services/pinecone.service.js';

// Get AI-matched teammates
export const getMatchedTeammates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills, interests, availability, role, experience, minScore, projectId, limit = 12 } = req.query;

    // Fetch target project details if matching for a specific project
    let targetProject = null;
    const excludedUserIds = new Set([userId]);

    if (projectId && typeof projectId === 'string' && projectId.trim()) {
      targetProject = await prisma.project.findUnique({
        where: { id: projectId.trim() },
        select: { 
          id: true, 
          name: true, 
          category: true, 
          tech: true,
          ownerId: true,
          members: {
            select: {
              userId: true
            }
          }
        },
      });

      if (targetProject) {
        excludedUserIds.add(targetProject.ownerId);
        if (targetProject.members) {
          targetProject.members.forEach(member => {
            excludedUserIds.add(member.userId);
          });
        }
      }
    }
    const excludedList = Array.from(excludedUserIds);

    // Get current user with necessary fields
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        skills: true,
        interests: true,
        availability: true,
        experience: true,
        githubUsername: true,
        avatarUrl: true,
        bio: true,
        role: true,
        embedding: true,
      },
    });

    const userObj = currentUser || {
      id: userId || 'guest',
      name: 'Guest User',
      skills: [],
      interests: [],
      availability: 'Full-time',
      experience: 'Intermediate',
      role: 'Developer'
    };

    // Build flexible query for candidate users (excluding current user and existing project members/owner)
    const where = {
      id: { notIn: excludedList },
    };

    if (skills && typeof skills === 'string' && skills.trim() && !['all', 'any', 'undefined'].includes(skills.trim().toLowerCase())) {
      const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillList.length > 0) {
        where.skills = { hasSome: skillList };
      }
    }

    if (interests && typeof interests === 'string' && interests.trim() && !['all', 'any', 'undefined'].includes(interests.trim().toLowerCase())) {
      const interestList = interests.split(',').map(i => i.trim()).filter(Boolean);
      if (interestList.length > 0) {
        where.interests = { hasSome: interestList };
      }
    }

    if (role && typeof role === 'string' && role.trim() && !['all', 'any', 'undefined'].includes(role.trim().toLowerCase())) {
      where.role = { contains: role.trim().replace('-', ' '), mode: 'insensitive' };
    }

    if (availability && typeof availability === 'string' && availability.trim() && !['all', 'any', 'undefined'].includes(availability.trim().toLowerCase())) {
      where.availability = availability.trim();
    }

    if (experience && typeof experience === 'string' && experience.trim() && !['all', 'any', 'undefined'].includes(experience.trim().toLowerCase())) {
      where.experience = experience.trim();
    }

    let candidateUsers = await prisma.user.findMany({
      where,
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
        embedding: true,
      },
      take: parseInt(limit) * 2,
    });

    // Fallback: If no candidate users match strict filters, load general candidates
    if (candidateUsers.length === 0) {
      candidateUsers = await prisma.user.findMany({
        where: { id: { notIn: excludedList } },
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
          embedding: true,
        },
        take: parseInt(limit) * 2,
      });
    }

    // Fetch existing verifications involving current user
    const verifications = await prisma.partnerVerification.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
    });

    // Fetch existing team invites sent by current user
    const existingInvites = await prisma.teamInvite.findMany({
      where: {
        senderId: userId,
      },
      select: {
        id: true,
        receiverId: true,
        projectId: true,
        status: true,
      },
    });

    // Map candidate users with rich match calculations, verification status, and invite status
    let matchedTeammates = candidateUsers.map(user => {
      const matchDetails = calculateMatchDetails(userObj, user, targetProject);
      
      // Find verification record with this user if exists
      const verif = verifications.find(v => 
        (v.user1Id === userId && v.user2Id === user.id) ||
        (v.user2Id === userId && v.user1Id === user.id)
      );

      // Find invite record with this user if exists
      const invite = existingInvites.find(i => 
        i.receiverId === user.id && (!targetProject || i.projectId === targetProject.id)
      );

      return {
        ...user,
        matchScore: matchDetails.score,
        matchFactors: matchDetails.factors,
        highlights: matchDetails.highlights,
        inviteStatus: invite ? invite.status : null,
        verification: verif ? {
          id: verif.id,
          overallStatus: verif.overallStatus,
          user1Id: verif.user1Id,
          user2Id: verif.user2Id,
          u1Status: verif.u1Status,
          u2Status: verif.u2Status,
        } : null,
      };
    });

    // Apply minimum score filter if requested
    if (minScore && minScore !== '0' && minScore !== 'all' && !isNaN(parseInt(minScore))) {
      const scoreCutoff = parseInt(minScore);
      const filtered = matchedTeammates.filter(t => t.matchScore >= scoreCutoff);
      if (filtered.length > 0) {
        matchedTeammates = filtered;
      }
    }

    // Sort by match score descending and apply limit
    matchedTeammates.sort((a, b) => b.matchScore - a.matchScore);
    const result = matchedTeammates.slice(0, parseInt(limit));

    res.json(result);
  } catch (error) {
    console.error('Error in getMatchedTeammates:', error);
    res.status(500).json({ 
      error: 'Failed to get matched teammates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// Send team invitation
export const sendTeamInvite = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { projectId, receiverId, message } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    let targetProjectId = projectId;

    if (!targetProjectId) {
      // Find sender's most recent project
      const userProject = await prisma.project.findFirst({
        where: {
          OR: [
            { ownerId: senderId },
            { members: { some: { userId: senderId } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (userProject) {
        targetProjectId = userProject.id;
      } else {
        // Auto-create a Collaborative Workspace project
        const defaultProject = await prisma.project.create({
          data: {
            name: 'Collaborative Workspace',
            description: 'Default project workspace created for team collaboration.',
            ownerId: senderId,
          },
        });
        targetProjectId = defaultProject.id;
      }
    }

    // Verify project exists and sender has permission
    const project = await prisma.project.findFirst({
      where: {
        id: targetProjectId,
        OR: [
          { ownerId: senderId },
          {
            members: {
              some: {
                userId: senderId,
                role: { in: ['owner', 'admin'] },
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Check if invite already exists
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        projectId: targetProjectId,
        receiverId,
        status: 'pending',
      },
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Invite already sent to this user' });
    }

    // Create invite
    const invite = await prisma.teamInvite.create({
      data: {
        projectId: targetProjectId,
        senderId,
        receiverId,
        message,
        status: 'pending',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'invite_received',
        title: 'Team Invitation',
        message: `${req.user.name} invited you to join "${project.name}"`,
        link: `/invites/${invite.id}`,
        userId: receiverId,
      },
    });

    res.status(201).json(invite);
  } catch (error) {
    console.error('Error sending team invite:', error);
    res.status(500).json({ error: 'Failed to send team invite' });
  }
};

// Get user's invites
export const getUserInvites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    };

    if (status) {
      where.status = status;
    }

    const invites = await prisma.teamInvite.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
};

// Respond to team invite
export const respondToInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const userId = req.user.id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "accept" or "reject"' });
    }

    // Find invite
    const invite = await prisma.teamInvite.findFirst({
      where: {
        id,
        receiverId: userId,
        status: 'pending',
      },
      include: {
        project: true,
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found or already responded' });
    }

    // Update invite status
    const updatedInvite = await prisma.teamInvite.update({
      where: { id },
      data: {
        status: action === 'accept' ? 'accepted' : 'rejected',
        respondedAt: new Date(),
      },
    });

    // If accepted, add user as project member
    if (action === 'accept') {
      await prisma.projectMember.create({
        data: {
          projectId: invite.projectId,
          userId,
          role: 'member',
        },
      });

      // Create activity log
      await prisma.activity.create({
        data: {
          type: 'member_joined',
          description: `${req.user.name} joined the project`,
          projectId: invite.projectId,
          userId,
        },
      });

      // Notify sender
      await prisma.notification.create({
        data: {
          type: 'invite_accepted',
          title: 'Invite Accepted',
          message: `${req.user.name} accepted your invitation to join "${invite.project.name}"`,
          link: `/project/${invite.projectId}`,
          userId: invite.senderId,
        },
      });
    }

    res.json({
      message: `Invite ${action}ed successfully`,
      invite: updatedInvite,
    });
  } catch (error) {
    console.error('Error responding to invite:', error);
    res.status(500).json({ error: 'Failed to respond to invite' });
  }
};

// Update user profile for better matching
export const updateMatchingProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills, interests, availability, experience, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        skills,
        interests,
        availability,
        experience,
        bio,
      },
    });

    // Generate new embedding for updated profile
    try {
      const embedding = await generateUserEmbedding(updatedUser);
      await prisma.user.update({
        where: { id: userId },
        data: { embedding },
      });
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      // Continue even if embedding generation fails
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        skills: updatedUser.skills,
        interests: updatedUser.interests,
        availability: updatedUser.availability,
        experience: updatedUser.experience,
        bio: updatedUser.bio,
      },
    });
  } catch (error) {
    console.error('Error updating matching profile:', error);
    res.status(500).json({ error: 'Failed to update matching profile' });
  }
};

// --- SKILLSET VERIFICATION CONTROLLERS ---

// Initiate or fetch existing skillset verification with a partner
export const initiateVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot verify skills with yourself' });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, skills: true, role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target partner not found' });
    }

    // Find existing verification or create new one
    let verification = await prisma.partnerVerification.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, githubUsername: true, avatarUrl: true, skills: true, role: true } },
        user2: { select: { id: true, name: true, githubUsername: true, avatarUrl: true, skills: true, role: true } }
      }
    });

    if (!verification) {
      verification = await prisma.partnerVerification.create({
        data: {
          user1Id: userId,
          user2Id: targetUserId,
          overallStatus: 'in_progress'
        },
        include: {
          user1: { select: { id: true, name: true, githubUsername: true, avatarUrl: true, skills: true, role: true } },
          user2: { select: { id: true, name: true, githubUsername: true, avatarUrl: true, skills: true, role: true } }
        }
      });
    }

    res.json(verification);
  } catch (error) {
    console.error('Error initiating verification:', error);
    res.status(500).json({ error: 'Failed to initiate skillset verification' });
  }
};

// Set 1-2 verification questions for partner
export const setVerificationQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { questions } = req.body; // Array of 1-2 questions: [{ id, text, skill }]

    if (!questions || !Array.isArray(questions) || questions.length === 0 || questions.length > 2) {
      return res.status(400).json({ error: 'Provide 1 or 2 verification questions' });
    }

    const verification = await prisma.partnerVerification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification session not found' });
    }

    const isUser1 = verification.user1Id === userId;
    const isUser2 = verification.user2Id === userId;

    if (!isUser1 && !isUser2) {
      return res.status(403).json({ error: 'Unauthorized to modify this verification' });
    }

    const updatedData = isUser1 
      ? { u1Questions: questions, u1Status: 'questions_set' } 
      : { u2Questions: questions, u2Status: 'questions_set' };

    const updatedVerification = await prisma.partnerVerification.update({
      where: { id },
      data: updatedData,
      include: {
        user1: { select: { id: true, name: true, avatarUrl: true, skills: true, role: true } },
        user2: { select: { id: true, name: true, avatarUrl: true, skills: true, role: true } }
      }
    });

    const recipientId = isUser1 ? verification.user2Id : verification.user1Id;
    await prisma.notification.create({
      data: {
        type: 'verification_questions',
        title: 'Skillset Verification Questions Received',
        message: `${req.user.name} set ${questions.length} verification question(s) for you to answer!`,
        link: `/team-match?verificationId=${id}`,
        userId: recipientId
      }
    });

    res.json(updatedVerification);
  } catch (error) {
    console.error('Error setting verification questions:', error);
    res.status(500).json({ error: 'Failed to set verification questions' });
  }
};

// Submit answers to partner's questions
export const submitVerificationAnswers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { answers } = req.body; // Array of answer objects: [{ questionId, answer }]

    const verification = await prisma.partnerVerification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification session not found' });
    }

    const isUser1 = verification.user1Id === userId;
    const isUser2 = verification.user2Id === userId;

    if (!isUser1 && !isUser2) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedData = isUser1 
      ? { u2Answers: answers, u2Status: 'answered' }
      : { u1Answers: answers, u1Status: 'answered' };

    const updatedVerification = await prisma.partnerVerification.update({
      where: { id },
      data: updatedData,
      include: {
        user1: { select: { id: true, name: true, avatarUrl: true, skills: true, role: true } },
        user2: { select: { id: true, name: true, avatarUrl: true, skills: true, role: true } }
      }
    });

    const recipientId = isUser1 ? verification.user2Id : verification.user1Id;
    await prisma.notification.create({
      data: {
        type: 'verification_answers',
        title: 'Skillset Answers Submitted',
        message: `${req.user.name} submitted answers to your verification questions!`,
        link: `/team-match?verificationId=${id}`,
        userId: recipientId
      }
    });

    res.json(updatedVerification);
  } catch (error) {
    console.error('Error submitting verification answers:', error);
    res.status(500).json({ error: 'Failed to submit answers' });
  }
};

// Evaluate / Verify partner's answers
export const evaluateVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { action } = req.body; // 'verify' | 'reject'

    const verification = await prisma.partnerVerification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification session not found' });
    }

    const isUser1 = verification.user1Id === userId;
    const isUser2 = verification.user2Id === userId;

    if (!isUser1 && !isUser2) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const newStatus = action === 'verify' ? 'verified' : 'rejected';
    const updatedData = isUser1 
      ? { u1Status: newStatus }
      : { u2Status: newStatus };

    const u1Final = isUser1 ? newStatus : verification.u1Status;
    const u2Final = isUser2 ? newStatus : verification.u2Status;

    if (u1Final === 'verified' || u2Final === 'verified') {
      updatedData.overallStatus = 'verified';
    } else if (u1Final === 'rejected' && u2Final === 'rejected') {
      updatedData.overallStatus = 'failed';
    }

    const updatedVerification = await prisma.partnerVerification.update({
      where: { id },
      data: updatedData,
      include: {
        user1: { select: { id: true, name: true } },
        user2: { select: { id: true, name: true } }
      }
    });

    const recipientId = isUser1 ? verification.user2Id : verification.user1Id;
    await prisma.notification.create({
      data: {
        type: 'verification_evaluated',
        title: action === 'verify' ? 'Skillset Verified!' : 'Skillset Review Updated',
        message: `${req.user.name} ${action === 'verify' ? 'verified your skillset response!' : 'reviewed your answers.'}`,
        link: `/team-match?verificationId=${id}`,
        userId: recipientId
      }
    });

    res.json(updatedVerification);
  } catch (error) {
    console.error('Error evaluating verification:', error);
    res.status(500).json({ error: 'Failed to evaluate verification' });
  }
};

// Get single verification status by ID or target user ID
export const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const verification = await prisma.partnerVerification.findFirst({
      where: {
        OR: [
          { id },
          { user1Id: userId, user2Id: id },
          { user1Id: id, user2Id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, githubUsername: true, avatarUrl: true, skills: true, role: true } },
        user2: { select: { id: true, name: true, githubUsername: true, avatarUrl: true, skills: true, role: true } }
      }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    res.json(verification);
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
};

