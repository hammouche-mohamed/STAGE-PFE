import prisma from '../prisma';

/**
 * A team is "committed" once it has skin in the game: one of its members is
 * enrolled in a non-cancelled internship, OR the team has an accepted topic
 * application. Once committed, members can't leave and the leader can't send
 * new invitations — the team roster is locked.
 */
export type TeamCommitment =
  | { locked: false }
  | { locked: true; reason: 'active_internship' | 'accepted_application' };

export async function getTeamCommitment(teamId: string): Promise<TeamCommitment> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { studentId: true },
  });
  const memberIds = members.map((m) => m.studentId);

  if (memberIds.length > 0) {
    const activeIntern = await prisma.internshipStudent.findFirst({
      where: {
        studentId: { in: memberIds },
        internship: { status: { notIn: ['CANCELLED'] } },
      },
      select: { id: true },
    });
    if (activeIntern) return { locked: true, reason: 'active_internship' };
  }

  const accepted = await prisma.studentApplication.findFirst({
    where: { teamId, status: 'ACCEPTED' },
    select: { id: true },
  });
  if (accepted) return { locked: true, reason: 'accepted_application' };

  return { locked: false };
}
