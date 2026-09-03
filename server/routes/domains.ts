import { Router } from "express";
import { DOMAINS } from "../domainWeights.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(DOMAINS);
});

export default router;
