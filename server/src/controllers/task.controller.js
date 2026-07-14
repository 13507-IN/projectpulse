import prisma from '../config/prisma.js';

// Get all tasks for a project
export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Verify user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Get tasks assigned to current user
export const getUserTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, projectId } = req.query;

    const where = { assigneeId: userId };

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
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
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ error: 'Failed to fetch user tasks' });
  }
};

// Get a specific task
export const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await prisma.task.findFirst({
      where: {
        id,
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            githubUsername: true,
            avatarUrl: true,
          },
        },
        comments: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// Create a new task
export const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      projectId,
      title,
      description,
      status,
      priority,
      type,
      column,
      assigneeId,
      dueDate,
    } = req.body;

    // Validate required fields
    if (!projectId || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }

    // Verify user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        status: status || 'todo',
        priority: priority || 'medium',
        type: type || 'feature',
        column: column || 'To Do',
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
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
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_created',
        description: `Created task "${title}"`,
        projectId,
        taskId: task.id,
        userId,
      },
    });

    // Create notification for assignee if different from creator
    if (assigneeId && assigneeId !== userId) {
      await prisma.notification.create({
        data: {
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned to task "${title}"`,
          link: `/project/${projectId}`,
          userId: assigneeId,
        },
      });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// Update a task
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      status,
      priority,
      type,
      column,
      assigneeId,
      dueDate,
      completedAt,
    } = req.body;

    // Verify user has access to the task's project
    const task = await prisma.task.findFirst({
      where: {
        id,
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      },
      include: {
        project: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    const updateData = {
      title,
      description,
      status,
      priority,
      type,
      column,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    // If status is being changed to 'done', set completedAt
    if (status === 'done' && task.status !== 'done') {
      updateData.completedAt = new Date();
    } else if (status !== 'done' && task.status === 'done') {
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
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
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_updated',
        description: `Updated task "${updatedTask.title}"`,
        projectId: task.projectId,
        taskId: id,
        userId,
        metadata: {
          changes: Object.keys(req.body),
        },
      },
    });

    // If assignee changed, notify new assignee
    if (assigneeId && assigneeId !== task.assigneeId && assigneeId !== userId) {
      await prisma.notification.create({
        data: {
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `You have been assigned to task "${updatedTask.title}"`,
          link: `/project/${task.projectId}`,
          userId: assigneeId,
        },
      });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// Delete a task
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user has access to the task's project
    const task = await prisma.task.findFirst({
      where: {
        id,
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    await prisma.task.delete({
      where: { id },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_deleted',
        description: `Deleted task "${task.title}"`,
        projectId: task.projectId,
        userId,
      },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// Add comment to task
export const addTaskComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify user has access to the task's project
    const task = await prisma.task.findFirst({
      where: {
        id,
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: id,
        userId,
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
        type: 'comment_added',
        description: `Commented on task "${task.title}"`,
        projectId: task.projectId,
        taskId: id,
        userId,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Get task comments
export const getTaskComments = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user has access to the task's project
    const task = await prisma.task.findFirst({
      where: {
        id,
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};
