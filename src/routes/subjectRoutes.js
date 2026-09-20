import express from "express";
import * as subjectController from "../controllers/subjectController.js";

const router = express.Router();

router.post("/", subjectController.create);
router.get("/", subjectController.getAll);
router.get("/:id", subjectController.getById);

export default router;