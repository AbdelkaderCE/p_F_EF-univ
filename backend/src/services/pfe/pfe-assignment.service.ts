import prisma from "../../config/database";
import logger from "../../utils/logger";

export const getTeacherPFECourses = async (teacherId: number) => {
  try {
    const courses = await prisma.pfeSujet.findMany({
      where: { enseignantId: teacherId },
      orderBy: { titre: "asc" },
      select: {
        id: true,
        titre: true,
        anneeUniversitaire: true,
      },
    });

    return courses.map((course) => ({
      id: course.id,
      name: course.titre,
      code: `PFE-${course.id}`,
      promo: course.anneeUniversitaire ?? "N/A",
    }));
  } catch (error) {
    logger.error("Error fetching teacher PFE courses:", error);
    throw error;
  }
};

export const getGroupsByPFECourse = async (courseId: number) => {
  try {
    const groups = await prisma.groupPfe.findMany({
      where: { sujetFinalId: courseId },
      include: {
        groupMembers: {
          select: { id: true },
        },
      },
      orderBy: { nom: "asc" },
    });

    return groups.map((group) => ({
      id: group.id,
      nom: group.nom,
      studentCount: group.groupMembers.length,
    }));
  } catch (error) {
    logger.error("Error fetching groups by PFE course:", error);
    throw error;
  }
};
