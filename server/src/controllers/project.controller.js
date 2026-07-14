import prisma from '../config/prisma.js';

// Get all projects for the current user
export const getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                githubUsername: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get a specific project
export const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                githubUsername: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
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
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Create a new project
export const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      githubRepoId,
      githubRepoUrl,
      githubRepoName,
      repoOwner,
      repoPrivate,
      tech,
      category,
      startDate,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        githubRepoId,
        githubRepoUrl,
        githubRepoName,
        repoOwner,
        repoPrivate: repoPrivate || false,
        tech: tech || [],
        category,
        startDate: startDate ? new Date(startDate) : null,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create an activity log
    await prisma.activity.create({
      data: {
        type: 'project_created',
        description: `Created project "${name}"`,
        projectId: project.id,
        userId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Update a project
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      description,
      status,
      progress,
      tech,
      category,
      startDate,
      endDate,
    } = req.body;

    // Check if user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status,
        progress,
        tech,
        category,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                githubUsername: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'project_updated',
        description: `Updated project "${updatedProject.name}"`,
        projectId: id,
        userId,
      },
    });

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete a project
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    await prisma.project.delete({
      where: { id },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// Add member to project
export const addProjectMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: memberUserId, role } = req.body;
    const currentUserId = req.user.id;

    // Check if current user owns or is admin of the project
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { ownerId: currentUserId },
          {
            members: {
              some: {
                userId: currentUserId,
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

    // Check if member already exists
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: memberUserId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: memberUserId,
        role: role || 'member',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'member_added',
        description: `Added ${member.user.name} to the project`,
        projectId: id,
        userId: currentUserId,
      },
    });

    // Create notification for the new member
    await prisma.notification.create({
      data: {
        type: 'member_added',
        title: 'Added to Project',
        message: `You have been added to project "${project.name}"`,
        link: `/project/${id}`,
        userId: memberUserId,
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Failed to add project member' });
  }
};

// Remove member from project
export const removeProjectMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const currentUserId = req.user.id;

    // Check if current user owns or is admin of the project
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { ownerId: currentUserId },
          {
            members: {
              some: {
                userId: currentUserId,
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

    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'member_removed',
        description: 'Removed a member from the project',
        projectId: id,
        userId: currentUserId,
      },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: 'Failed to remove project member' });
  }
};

// Get project statistics
export const getProjectStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await prisma.$transaction([
      // Total active projects
      prisma.project.count({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
          status: 'active',
        },
      }),
      // Total pending tasks
      prisma.task.count({
        where: {
          assigneeId: userId,
          status: { in: ['todo', 'in_progress'] },
        },
      }),
      // Total completed tasks
      prisma.task.count({
        where: {
          assigneeId: userId,
          status: 'done',
        },
      }),
      // Unread notifications
      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    res.json({
      activeProjects: stats[0],
      pendingTasks: stats[1],
      completedTasks: stats[2],
      notifications: stats[3],
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({ error: 'Failed to fetch project stats' });
  }
};
