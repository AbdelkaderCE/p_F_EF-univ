import { Request, Response } from "express";
import { getTeacherPFECourses, getGroupsByPFECourse } from "../../services/pfe/pfe-assignment.service";
import logger from "../../utils/logger";

export const getTeacherCoursesHandler = async (req: Request, res: Response) => {
  try {
    const teacherId = parseInt(String(req.params.teacherId), 10);

    if (!teacherId || Number.isNaN(teacherId)) {
      return res.status(400).json({ error: "Invalid teacher ID" });
    }

    const courses = await getTeacherPFECourses(teacherId);

    return res.status(200).json({
      data: courses,
      count: courses.length,
    });
  } catch (error: any) {
    logger.error("Error in getTeacherCoursesHandler:", error);
    return res.status(500).json({
      error: error?.message || "Failed to fetch teacher courses",
    });
  }
};

export const getCourseGroupsHandler = async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(String(req.params.courseId), 10);

    if (!courseId || Number.isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const groups = await getGroupsByPFECourse(courseId);

    return res.status(200).json({
      data: groups,
      count: groups.length,
    });
  } catch (error: any) {
    logger.error("Error in getCourseGroupsHandler:", error);
    return res.status(500).json({
      error: error?.message || "Failed to fetch course groups",
    });
  }
};
