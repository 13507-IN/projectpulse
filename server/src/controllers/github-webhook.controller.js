import prisma from '../config/prisma.js';

// Helper to log activities
const logActivity = async ({ type, description, projectId, taskId, userId }) => {
    try {
        await prisma.activity.create({
            data: {
                type,
                description,
                projectId,
                taskId,
                userId,
            }
        });
    } catch (err) {
        console.error('Failed to log webhook activity:', err.message);
    }
};

// Helper to create notifications
const notifyUser = async ({ type, title, message, userId, link }) => {
    try {
        await prisma.notification.create({
            data: {
                type,
                title,
                message,
                userId,
                link,
            }
        });
    } catch (err) {
        console.error('Failed to send webhook notification:', err.message);
    }
};

export const handleWebhook = async (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        const payload = req.body;

        if (!event) {
            return res.status(400).json({ error: 'Missing x-github-event header' });
        }

        const repositoryId = String(payload.repository?.id);
        if (!repositoryId) {
            return res.status(400).json({ error: 'Missing repository ID' });
        }

        // Find the project linked with this repository
        const project = await prisma.project.findFirst({
            where: { githubRepoId: repositoryId },
        });

        if (!project) {
            // Not an error, simply not a repository we sync
            return res.json({ message: `Repository ${payload.repository.full_name} is not linked to any ProjectPulse project.` });
        }

        // Handle ISSUES events
        if (event === 'issues') {
            const { action, issue } = payload;
            const issueNumber = issue.number;

            // Find existing task
            let task = await prisma.task.findFirst({
                where: { projectId: project.id, githubIssueId: issueNumber },
            });

            if (action === 'opened') {
                if (!task) {
                    task = await prisma.task.create({
                        data: {
                            title: issue.title,
                            description: issue.body || '',
                            status: 'todo',
                            column: 'To Do',
                            projectId: project.id,
                            githubIssueId: issueNumber,
                            githubIssueUrl: issue.html_url,
                            syncedWithGitHub: true,
                        },
                    });

                    await logActivity({
                        type: 'task_created',
                        description: `Task "${issue.title}" created via GitHub Issue #${issueNumber}`,
                        projectId: project.id,
                        taskId: task.id,
                        userId: project.ownerId, // Default action author to project owner
                    });
                }
            } else if (action === 'edited') {
                if (task) {
                    task = await prisma.task.update({
                        where: { id: task.id },
                        data: {
                            title: issue.title,
                            description: issue.body || '',
                        },
                    });

                    await logActivity({
                        type: 'task_updated',
                        description: `Task "${issue.title}" updated via GitHub Issue #${issueNumber}`,
                        projectId: project.id,
                        taskId: task.id,
                        userId: project.ownerId,
                    });
                }
            } else if (action === 'closed') {
                if (task) {
                    task = await prisma.task.update({
                        where: { id: task.id },
                        data: {
                            status: 'done',
                            column: 'Done',
                            completedAt: new Date(),
                        },
                    });

                    await logActivity({
                        type: 'task_completed',
                        description: `Task "${task.title}" completed via GitHub Issue #${issueNumber} closure`,
                        projectId: project.id,
                        taskId: task.id,
                        userId: project.ownerId,
                    });

                    if (task.assigneeId) {
                        await notifyUser({
                            type: 'task_assigned',
                            title: 'Task Completed',
                            message: `Your assigned task "${task.title}" was completed on GitHub.`,
                            userId: task.assigneeId,
                            link: `/project/${project.id}`,
                        });
                    }
                }
            } else if (action === 'reopened') {
                if (task) {
                    task = await prisma.task.update({
                        where: { id: task.id },
                        data: {
                            status: 'todo',
                            column: 'To Do',
                            completedAt: null,
                        },
                    });

                    await logActivity({
                        type: 'task_updated',
                        description: `Task "${task.title}" reopened via GitHub Issue #${issueNumber}`,
                        projectId: project.id,
                        taskId: task.id,
                        userId: project.ownerId,
                    });
                }
            } else if (action === 'assigned' || action === 'unassigned') {
                if (task) {
                    let assigneeId = null;
                    if (issue.assignee?.login) {
                        const user = await prisma.user.findUnique({
                            where: { githubUsername: issue.assignee.login },
                        });
                        if (user) {
                            assigneeId = user.id;
                        }
                    }

                    task = await prisma.task.update({
                        where: { id: task.id },
                        data: { assigneeId },
                    });

                    await logActivity({
                        type: 'task_updated',
                        description: assigneeId 
                            ? `Task "${task.title}" assigned to @${issue.assignee.login} via GitHub`
                            : `Task "${task.title}" unassigned via GitHub`,
                        projectId: project.id,
                        taskId: task.id,
                        userId: project.ownerId,
                    });

                    if (assigneeId && assigneeId !== project.ownerId) {
                        await notifyUser({
                            type: 'task_assigned',
                            title: 'Task Assigned',
                            message: `You have been assigned to task "${task.title}" via GitHub.`,
                            userId: assigneeId,
                            link: `/project/${project.id}`,
                        });
                    }
                }
            }

            return res.json({ message: `Successfully handled issues event: ${action}`, taskId: task?.id });
        }

        // Handle ISSUE COMMENT events
        if (event === 'issue_comment') {
            const { action, issue, comment } = payload;

            if (action === 'created') {
                const issueNumber = issue.number;

                // Find task
                const task = await prisma.task.findFirst({
                    where: { projectId: project.id, githubIssueId: issueNumber },
                });

                if (task) {
                    // Try to identify commenter
                    const commenter = await prisma.user.findUnique({
                        where: { githubUsername: comment.user.login },
                    });

                    const authorId = commenter ? commenter.id : project.ownerId;
                    const authorPrefix = commenter ? '' : `[@${comment.user.login} on GitHub]: `;

                    const newComment = await prisma.comment.create({
                        data: {
                            content: `${authorPrefix}${comment.body}`,
                            taskId: task.id,
                            userId: authorId,
                            createdAt: new Date(comment.created_at),
                        },
                    });

                    await logActivity({
                        type: 'comment_added',
                        description: `@${comment.user.login} commented on task "${task.title}"`,
                        projectId: project.id,
                        taskId: task.id,
                        userId: authorId,
                    });

                    if (task.assigneeId && task.assigneeId !== authorId) {
                        await notifyUser({
                            type: 'comment_mention',
                            title: 'New Comment',
                            message: `@${comment.user.login} commented on your task "${task.title}"`,
                            userId: task.assigneeId,
                            link: `/project/${project.id}`,
                        });
                    }

                    return res.json({ message: 'Successfully handled comment creation', commentId: newComment.id });
                }
            }
        }

        return res.json({ message: `Webhook event "${event}" received but not parsed.` });
    } catch (error) {
        console.error('Error handling GitHub webhook:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
