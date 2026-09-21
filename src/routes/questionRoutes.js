import express from "express";
import * as questionController from "../controllers/questionController.js";

const router = express.Router();

router.post("/", questionController.create);
router.get("/", questionController.getAll);
router.get("/:id", questionController.getById);
router.patch("/:id", questionController.update);
router.delete("/:id", questionController.remove);

export default router;