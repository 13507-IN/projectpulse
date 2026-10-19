import prisma from '../config/prisma.js';

const applicationInclude = {
  applicant: {
    select: {
      id: true,
      name: true,
      githubUsername: true,
      avatarUrl: true,
      role: true,
      location: true,
      bio: true,
      skills: true,
      interests: true,
      availability: true,
    },
  },
};

const getTeamSize = async (db, project) => {
  const otherMembers = await db.projectMember.count({
    where: {
      projectId: project.id,
      userId: { not: project.ownerId },
    },
  });
  return otherMembers + 1;
};

export const applyToProject = async (req, res) => {
  try {
    const applicantId = req.user.id;
    const { id: projectId } = req.params;
    const message = typeof req.body.message === 'string'
      ? req.body.message.trim().slice(0, 1200)
      : '';

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        isDiscoverable: true,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        maxTeamSize: true,
        members: { where: { userId: applicantId }, select: { id: true } },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project is not accepting applications' });
    if (project.ownerId === applicantId || project.members.length) {
      return res.status(400).json({ error: 'You already own or belong to this project' });
    }

    if (project.maxTeamSize != null && await getTeamSize(prisma, project) >= project.maxTeamSize) {
      return res.status(409).json({ error: 'This project has reached its team size limit' });
    }

    const application = await prisma.$transaction(async (tx) => {
      const existing = await tx.projectApplication.findUnique({
        where: { projectId_applicantId: { projectId, applicantId } },
      });
      if (existing?.status === 'pending' || existing?.status === 'accepted') {
        return { error: 'You already have an active application' };
      }

      const created = existing
        ? await tx.projectApplication.update({
            where: { id: existing.id },
            data: { message: message || null, status: 'pending' },
            include: applicationInclude,
          })
        : await tx.projectApplication.create({
            data: { projectId, applicantId, message: message || null },
            include: applicationInclude,
          });

      await tx.notification.create({
        data: {
          type: 'project_application',
          title: 'New project application',
          message: `${req.user.name || 'A student'} applied to join "${project.name}"`,
          link: `/project/${projectId}/applications`,
          userId: project.ownerId,
        },
      });
      return { application: created };
    });

    if (application.error) return res.status(409).json({ error: application.error });
    res.status(201).json(application.application);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'You already have an application for this project' });
    }
    console.error('Error applying to project:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

export const getProjectApplications = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: req.user.id },
      select: { id: true },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const applications = await prisma.projectApplication.findMany({
      where: { projectId },
      include: applicationInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    res.json(applications);
  } catch (error) {
    console.error('Error fetching project applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

export const respondToProjectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action } = req.body;
    const ownerId = req.user.id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accept or reject' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.projectApplication.findFirst({
        where: {
          id: applicationId,
          status: 'pending',
          project: { ownerId },
        },
        include: {
          project: {
            select: { id: true, name: true, ownerId: true, maxTeamSize: true },
          },
        },
      });

      if (!application) return { error: 'Application not found or already handled', status: 404 };

      if (action === 'accept') {
        if (
          application.project.maxTeamSize != null &&
          await getTeamSize(tx, application.project) >= application.project.maxTeamSize
        ) {
          return { error: 'Your team is full. Increase the team size limit before accepting.', status: 409 };
        }

        await tx.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId: application.projectId,
              userId: application.applicantId,
            },
          },
          create: {
            projectId: application.projectId,
            userId: application.applicantId,
            role: 'member',
          },
          update: {},
        });
      }

      const updated = await tx.projectApplication.update({
        where: { id: application.id },
        data: { status: action === 'accept' ? 'accepted' : 'rejected' },
        include: applicationInclude,
      });

      await tx.notification.create({
        data: {
          type: action === 'accept' ? 'project_application_accepted' : 'project_application_rejected',
          title: action === 'accept' ? 'You joined a project' : 'Application update',
          message: action === 'accept'
            ? `Your application to "${application.project.name}" was accepted`
            : `Your application to "${application.project.name}" was not accepted this time`,
          link: action === 'accept' ? `/project/${application.projectId}` : '/discover',
          userId: application.applicantId,
        },
      });

      if (action === 'accept') {
        await tx.activity.create({
          data: {
            type: 'member_joined',
            description: `${updated.applicant.name || 'A student'} joined the project`,
            projectId: application.projectId,
            userId: application.applicantId,
          },
        });
      }

      return { application: updated };
    }, { isolationLevel: 'Serializable' });

    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.application);
  } catch (error) {
    if (error.code === 'P2034') {
      return res.status(409).json({ error: 'The team changed while you were reviewing. Refresh and try again.' });
    }
    console.error('Error responding to project application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
};
