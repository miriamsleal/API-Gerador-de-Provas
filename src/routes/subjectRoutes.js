import express from "express";
import * as subjectController from "../controllers/subjectController.js";

const router = express.Router();

router.post("/", subjectController.create);
router.get("/", subjectController.getAll);
router.get("/:id", subjectController.getById);
router.patch("/:id", subjectController.update);
router.delete("/:id", subjectController.remove);

export default router;