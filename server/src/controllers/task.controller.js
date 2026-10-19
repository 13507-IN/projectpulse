import prisma from '../config/prisma.js';

const statusByColumn = {
  'To Do': 'todo',
  'In Progress': 'in_progress',
  Done: 'done',
};
const columnByStatus = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};
const writableRoles = ['owner', 'admin', 'member'];
const managerRoles = ['owner', 'admin'];

const projectAccess = (userId, roles = writableRoles) => ({
  OR: [
    { ownerId: userId },
    { members: { some: { userId, role: { in: roles } } } },
  ],
});

const taskStateFromBody = (body, fallbackStatus = 'todo') => {
  const { status, column } = body;
  if (status === undefined && column === undefined) return null;
  if (status !== undefined && !Object.hasOwn(columnByStatus, status)) {
    return { error: 'Invalid task status' };
  }
  if (column !== undefined && !Object.hasOwn(statusByColumn, column)) {
    return { error: 'Invalid task column' };
  }
  if (status !== undefined && column !== undefined && statusByColumn[column] !== status) {
    return { error: 'Task status and column must match' };
  }
  const resolvedStatus = status ?? statusByColumn[column] ?? fallbackStatus;
  return { status: resolvedStatus, column: columnByStatus[resolvedStatus] };
};

const parseDueDate = (value) => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const validAssignee = async (project, assigneeId, db = prisma) => {
  if (!assigneeId) return true;
  if (assigneeId === project.ownerId) return true;
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: assigneeId,
      },
    },
    select: { role: true },
  });
  return Boolean(membership && writableRoles.includes(membership.role));
};

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

    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 5000)) {
      return res.status(400).json({ error: 'Description must be 5000 characters or less' });
    }
    if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }
    if (type !== undefined && !['feature', 'bug', 'docs', 'improvement'].includes(type)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }
    const taskState = taskStateFromBody({ status: status ?? undefined, column: column ?? undefined }) || {
      status: 'todo',
      column: 'To Do',
    };
    if (taskState.error) return res.status(400).json({ error: taskState.error });
    const parsedDueDate = dueDate === undefined ? null : parseDueDate(dueDate);
    if (parsedDueDate === undefined) {
      return res.status(400).json({ error: 'Invalid due date' });
    }
    if (assigneeId !== undefined && assigneeId !== null && typeof assigneeId !== 'string') {
      return res.status(400).json({ error: 'Invalid assignee' });
    }

    let targetProjectId = projectId;
    if (!targetProjectId) {
      // Find the user's first available project
      const userProject = await prisma.project.findFirst({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId, role: { in: writableRoles } } } },
          ],
        },
      });

      if (userProject) {
        targetProjectId = userProject.id;
      } else {
        // Create a default Sandbox project for them
        const defaultProject = await prisma.project.create({
          data: {
            name: 'My Sandbox Project',
            description: 'Default project created automatically for personal tasks.',
            ownerId: userId,
          },
        });
        targetProjectId = defaultProject.id;
      }
    }

    // Verify user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: targetProjectId,
        ...projectAccess(userId),
      },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }
    if (!await validAssignee(project, assigneeId)) {
      return res.status(400).json({ error: 'Assignee must be a project teammate' });
    }

    const task = await prisma.task.create({
      data: {
        projectId: targetProjectId,
        title: title.trim(),
        description: description?.trim() || null,
        status: taskState.status,
        priority: priority || 'medium',
        type: type || 'feature',
        column: taskState.column,
        assigneeId: assigneeId || null,
        dueDate: parsedDueDate,
        completedAt: taskState.status === 'done' ? new Date() : null,
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
        description: `Created task "${task.title}"`,
        projectId: targetProjectId,
        taskId: task.id,
        userId,
      },
    });

    // Create notification for assignee if different from creator
    if (task.assigneeId && task.assigneeId !== userId) {
      await prisma.notification.create({
        data: {
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned to task "${task.title}"`,
          link: `/project/${targetProjectId}`,
          userId: task.assigneeId,
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
export const createUpdateTaskHandler = (db) => async (req, res) => {
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
    } = req.body;

    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 200)) {
      return res.status(400).json({ error: 'Title must be between 1 and 200 characters' });
    }
    if (description !== undefined && description !== null &&
        (typeof description !== 'string' || description.length > 5000)) {
      return res.status(400).json({ error: 'Description must be 5000 characters or less' });
    }
    if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }
    if (type !== undefined && !['feature', 'bug', 'docs', 'improvement'].includes(type)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }
    if (assigneeId !== undefined && assigneeId !== null && typeof assigneeId !== 'string') {
      return res.status(400).json({ error: 'Invalid assignee' });
    }
    const taskState = taskStateFromBody(req.body);
    if (taskState?.error) return res.status(400).json({ error: taskState.error });
    const parsedDueDate = dueDate === undefined ? undefined : parseDueDate(dueDate);
    if (dueDate !== undefined && parsedDueDate === undefined) {
      return res.status(400).json({ error: 'Invalid due date' });
    }

    const task = await db.task.findFirst({
      where: {
        id,
        project: projectAccess(userId),
      },
      include: {
        project: { select: { id: true, ownerId: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    if (assigneeId !== undefined && !await validAssignee(task.project, assigneeId, db)) {
      return res.status(400).json({ error: 'Assignee must be a project teammate' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (type !== undefined) updateData.type = type;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (dueDate !== undefined) updateData.dueDate = parsedDueDate;
    if (taskState) {
      updateData.status = taskState.status;
      updateData.column = taskState.column;
      if (taskState.status === 'done' && task.status !== 'done') {
        updateData.completedAt = new Date();
      } else if (taskState.status !== 'done' && task.status === 'done') {
        updateData.completedAt = null;
      }
    }

    const updatedTask = await db.task.update({
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
    await db.activity.create({
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
    if (updatedTask.assigneeId && updatedTask.assigneeId !== task.assigneeId && updatedTask.assigneeId !== userId) {
      await db.notification.create({
        data: {
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `You have been assigned to task "${updatedTask.title}"`,
          link: `/project/${task.projectId}`,
          userId: updatedTask.assigneeId,
        },
      });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const updateTask = createUpdateTaskHandler(prisma);

// Delete a task
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only project owners and project admins can remove shared work.
    const task = await prisma.task.findFirst({
      where: {
        id,
        project: projectAccess(userId, managerRoles),
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

    if (typeof content !== 'string' || !content.trim() || content.trim().length > 3000) {
      return res.status(400).json({ error: 'Comment must be between 1 and 3000 characters' });
    }

    // Viewers can read the discussion but cannot post.
    const task = await prisma.task.findFirst({
      where: {
        id,
        project: projectAccess(userId),
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
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
