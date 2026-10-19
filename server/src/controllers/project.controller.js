import prisma from '../config/prisma.js';

const normalizeStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))]
    .slice(0, 20);
};

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

// Discoverable projects are opt-in; private workspaces are never returned here.
export const discoverProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, location, category, skills } = req.query;
    const where = {
      isDiscoverable: true,
      status: 'active',
      ownerId: { not: userId },
      members: { none: { userId } },
    };

    if (typeof q === 'string' && q.trim()) {
      const term = q.trim().slice(0, 100);
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { tech: { has: term } },
        { lookingFor: { has: term } },
      ];
    }
    if (typeof location === 'string' && location.trim()) {
      where.location = { contains: location.trim().slice(0, 100), mode: 'insensitive' };
    }
    if (typeof category === 'string' && category.trim()) {
      where.category = { contains: category.trim().slice(0, 80), mode: 'insensitive' };
    }
    if (typeof skills === 'string' && skills.trim()) {
      const skillList = normalizeStringList(skills.split(','));
      if (skillList.length) where.lookingFor = { hasSome: skillList };
    }

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        tech: true,
        location: true,
        commitment: true,
        lookingFor: true,
        maxTeamSize: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
            role: true,
            location: true,
            bio: true,
          },
        },
        _count: { select: { members: true } },
        applications: {
          where: { applicantId: userId },
          select: { status: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 60,
    });

    res.json(projects.map(({ applications, ...project }) => ({
      ...project,
      applicationStatus: applications[0]?.status || null,
    })));
  } catch (error) {
    console.error('Error discovering projects:', error);
    res.status(500).json({ error: 'Failed to discover projects' });
  }
};

// Get a specific project
export const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const includeTasks = req.query.includeTasks !== 'false';

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
        ...(includeTasks && {
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
        }),
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
      isDiscoverable,
      location,
      commitment,
      lookingFor,
      maxTeamSize,
    } = req.body;

    // Validate required fields
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    if (maxTeamSize != null && (!Number.isInteger(maxTeamSize) || maxTeamSize < 2 || maxTeamSize > 100)) {
      return res.status(400).json({ error: 'maxTeamSize must be between 2 and 100' });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim().slice(0, 120),
        description: typeof description === 'string' ? description.trim().slice(0, 5000) : undefined,
        githubRepoId,
        githubRepoUrl,
        githubRepoName,
        repoOwner,
        repoPrivate: repoPrivate || false,
        tech: tech || [],
        category,
        startDate: startDate ? new Date(startDate) : null,
        isDiscoverable: isDiscoverable === true,
        location: typeof location === 'string' ? location.trim().slice(0, 120) || null : null,
        commitment: typeof commitment === 'string' ? commitment.trim().slice(0, 80) || null : null,
        lookingFor: normalizeStringList(lookingFor),
        maxTeamSize: maxTeamSize ?? null,
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
      isDiscoverable,
      location,
      commitment,
      lookingFor,
      maxTeamSize,
    } = req.body;

    if (maxTeamSize != null && (!Number.isInteger(maxTeamSize) || maxTeamSize < 2 || maxTeamSize > 100)) {
      return res.status(400).json({ error: 'maxTeamSize must be between 2 and 100' });
    }

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
        isDiscoverable,
        location: typeof location === 'string' ? location.trim().slice(0, 120) || null : location,
        commitment: typeof commitment === 'string' ? commitment.trim().slice(0, 80) || null : commitment,
        lookingFor: lookingFor === undefined ? undefined : normalizeStringList(lookingFor),
        maxTeamSize,
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

// Get project statistics in real-time
export const getProjectStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total user projects
    const totalProjects = await prisma.project.count({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    });

    const activeProjects = await prisma.project.count({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
        status: { in: ['active', 'in_progress', 'IN_PROGRESS'] },
      },
    });

    // Pending tasks (status != 'done')
    const pendingTasks = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: { in: ['todo', 'in_progress', 'TODO', 'IN_PROGRESS'] },
      },
    });

    const overdueTasks = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: { in: ['todo', 'in_progress', 'TODO', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() },
      },
    });

    // Completed tasks
    const completedTasks = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: { in: ['done', 'completed', 'DONE'] },
      },
    });

    // Notifications
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    const totalNotifications = await prisma.notification.count({
      where: { userId },
    });

    // Real-time overall progress percentage
    const totalTasksCount = pendingTasks + completedTasks;
    const overallProgress = totalTasksCount > 0 
      ? Math.round((completedTasks / totalTasksCount) * 100) 
      : (totalProjects > 0 ? 100 : 0);

    res.json({
      activeProjects: activeProjects || totalProjects,
      pendingTasks,
      overdueTasks,
      completedTasks,
      notifications: unreadNotifications || totalNotifications,
      overallProgress,
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({ error: 'Failed to fetch project stats' });
  }
};
