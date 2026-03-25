const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// Course CRUD
router.post('/create', courseController.createCourseHandler);
router.get('/user/:clerkId', courseController.getUserCourses);
router.get('/:courseId', courseController.getCourseById);

// Quiz & Grading
router.post('/:courseId/module/:moduleIndex/subtopic/:subtopicIndex/generate-quiz', courseController.generateAndSaveQuiz);
router.post('/:courseId/module/:moduleIndex/subtopic/:subtopicIndex/grade', courseController.gradeQuiz);

module.exports = router;
