import { Router } from "express";
import { detectAudio } from "../controllers/detection.controller.js";

const router = Router();

router.post("/detection", detectAudio);

export default router;