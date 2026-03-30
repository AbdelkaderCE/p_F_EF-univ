const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TeacherDashboardService {
  /**
   * @param {number} userId 
   * @returns {Object} 
   */
  async getTeacherDashboardData(userId) {
    const teacherProfile = await prisma.enseignants.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            nom: true,
            prenom: true,
            email: true,
            photo: true,
            telephone: true,
          },
        },
        grade: {
          select: {
            nom: true,
          },
        },
      },
    });

    if (!teacherProfile) {
      throw new Error('Teacher profile not found for the given user ID.');
    }

    const teacherId = teacherProfile.id;

    const enseignements = await prisma.enseignements.findMany({
      where: { enseignant_id: teacherId },
      include: {
        module: { select: { nom: true, code: true, semestre: true } },
        promo: { select: { nom: true, annee_universitaire: true } },
      },
      orderBy: { annee_universitaire: 'desc' },
    });

    const pfeSujets = await prisma.pfe_sujets.findMany({
      where: { enseignant_id: teacherId },
      include: {
        promo: { select: { nom: true } },
      },
      orderBy: { annee_universitaire: 'desc' },
    });

    const enseignementIds = enseignements.map((e) => e.id);
    
    const copiesRemise = await prisma.copies_remise.findMany({
      where: { enseignement_id: { in: enseignementIds } },
      include: {
        enseignement: {
          include: {
            module: { select: { nom: true } },
            promo: { select: { nom: true } },
          },
        },
      },
      orderBy: { date_remise: 'desc' },
    });

    const documentRequests = await prisma.document_requests.findMany({
      where: { enseignant_id: teacherId },
      include: {
        type_doc: { select: { nom: true } },
      },
      orderBy: { date_demande: 'desc' },
    });

    const juryCount = await prisma.pfe_jury.count({
      where: { enseignant_id: teacherId },
    });

    return {
      profile: {
        id: teacherProfile.id,
        nom: teacherProfile.user?.nom,
        prenom: teacherProfile.user?.prenom,
        email: teacherProfile.user?.email,
        photo: teacherProfile.user?.photo,
        grade: teacherProfile.grade?.nom || 'N/A',
        bureau: teacherProfile.bureau,
        dateRecrutement: teacherProfile.date_recrutement,
      },
      enseignements,
      pfeSujets,
      copiesRemise,
      documentRequests,
      juryGroupsCount: juryCount,
    };
  }
}

module.exports = new TeacherDashboardService();
