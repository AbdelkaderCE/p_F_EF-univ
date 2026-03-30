import { Request, Response, NextFunction } from "express";
import {
  getGroupStudents,
  searchAvailableStudents,
  bulkAssignStudentsToGroup,
  removeStudentFromGroup,
  setGroupLeader,
  getGroupWithTeacher,
} from "../../services/pfe/pfe-group.service";
import logger from "../../utils/logger";

/**
 * GET /api/v1/pfe/groups/:groupId/students
 * Get all students assigned to a group
 */
export const getGroupStudentsHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { groupId } = req.params;
    const groupIdNum = parseInt(String(groupId), 10);

    if (!groupIdNum || isNaN(groupIdNum)) {
      return res.status(400).json({ error: "Invalid group ID" });
    }

    const students = await getGroupStudents(groupIdNum);

    return res.status(200).json({
      data: students,
      count: students.length,
    });
  } catch (error: any) {
    logger.error("Error in getGroupStudentsHandler:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch group students",
    });
  }
};

/**
 * GET /api/v1/pfe/groups/students/search
 * Search for available students to assign to a group
 * Query params: query, groupId, limit
 */
export const searchAvailableStudentsHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { query, groupId, limit } = req.query;
    const groupIdNum = groupId ? parseInt(String(groupId), 10) : undefined;
    const limitNum = limit ? parseInt(String(limit), 10) : 20;

    // Get existing group members to exclude them from results
    let excludeIds: number[] = [];
    if (groupIdNum && !isNaN(groupIdNum)) {
      const groupStudents = await getGroupStudents(groupIdNum);
      excludeIds = groupStudents.map((s: { id: number }) => s.id);
    }

    const students = await searchAvailableStudents({
      query: String(query || ""),
      limit: limitNum,
      exclude: excludeIds,
    });

    return res.status(200).json({
      data: students,
      count: students.length,
    });
  } catch (error: any) {
    logger.error("Error in searchAvailableStudentsHandler:", error);
    return res.status(500).json({
      error: error.message || "Failed to search students",
    });
  }
};

/**
 * POST /api/v1/pfe/groups/:groupId/assign-students
 * Bulk assign students to a group
 * Body: { studentIds: number[] }
 */
export const bulkAssignStudentsHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { groupId } = req.params;
    const { studentIds } = req.body;

    const groupIdNum = parseInt(String(groupId), 10);

    if (!groupIdNum || isNaN(groupIdNum)) {
      return res.status(400).json({ error: "Invalid group ID" });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "studentIds array required and must not be empty" });
    }

    // Validate all IDs are numbers
    const validStudentIds = studentIds.every((id) => typeof id === "number" || !isNaN(parseInt(id)));
    if (!validStudentIds) {
      return res.status(400).json({ error: "All student IDs must be valid numbers" });
    }

    const result = await bulkAssignStudentsToGroup({
      groupId: groupIdNum,
      studentIds: studentIds.map((id) => parseInt(String(id), 10)),
    });

    return res.status(200).json({
      message: "Students bulk assigned successfully",
      ...result,
    });
  } catch (error: any) {
    logger.error("Error in bulkAssignStudentsHandler:", error);
    return res.status(500).json({
      error: error.message || "Failed to assign students",
    });
  }
};

/**
 * DELETE /api/v1/pfe/groups/:groupId/students/:studentId
 * Remove a student from a group
 */
export const removeStudentHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { groupId, studentId } = req.params;
    const groupIdNum = parseInt(String(groupId), 10);
    const studentIdNum = parseInt(String(studentId), 10);

    if (!groupIdNum || isNaN(groupIdNum) || !studentIdNum || isNaN(studentIdNum)) {
      return res.status(400).json({ error: "Invalid group ID or student ID" });
    }

    await removeStudentFromGroup(groupIdNum, studentIdNum);

    return res.status(200).json({
      message: "Student removed successfully",
    });
  } catch (error: any) {
    logger.error("Error in removeStudentHandler:", error);
    return res.status(500).json({
      error: error.message || "Failed to remove student",
    });
  }
};

/**
 * PUT /api/v1/pfe/groups/:groupId/leader/:studentId
 * Set a student as the group leader
 */
export const setGroupLeaderHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { groupId, studentId } = req.params;
    const groupIdNum = parseInt(String(groupId), 10);
    const studentIdNum = parseInt(String(studentId), 10);

    if (!groupIdNum || isNaN(groupIdNum) || !studentIdNum || isNaN(studentIdNum)) {
      return res.status(400).json({ error: "Invalid group ID or student ID" });
    }

    await setGroupLeader(groupIdNum, studentIdNum);

    return res.status(200).json({
      message: "Group leader set successfully",
    });
  } catch (error: any) {
    logger.error("Error in setGroupLeaderHandler:", error);
    return res.status(500).json({
      error: error.message || "Failed to set group leader",
    });
  }
};

/**
 * GET /api/v1/pfe/groups/:groupId/with-teacher
 * Get group info including assigned teacher
 */
export const getGroupWithTeacherHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { groupId } = req.params;
    const groupIdNum = parseInt(String(groupId), 10);

    if (!groupIdNum || isNaN(groupIdNum)) {
      return res.status(400).json({ error: "Invalid group ID" });
    }

    const groupData = await getGroupWithTeacher(groupIdNum);

    return res.status(200).json({
      data: groupData,
    });
  } catch (error: any) {
    logger.error("Error in getGroupWithTeacherHandler:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch group",
    });
  }
};
