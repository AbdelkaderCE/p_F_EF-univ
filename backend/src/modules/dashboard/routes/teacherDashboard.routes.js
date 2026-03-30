const express = require('express');
const router = express.Router();
const TeacherDashboardController = require('../controllers/teacherDashboard.controller');

router.get('/teacher', TeacherDashboardController.getDashboardData.bind(TeacherDashboardController));

module.exports = router;
