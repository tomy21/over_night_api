import express from "express";
import * as Dashboard from "../../controller/OverNight/Dashboard.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/dashboard-count", protect, Dashboard.valueStatus);
router.get("/dashboard-topLocation", protect, Dashboard.topTransaction);
router.get("/dashboard-topStatus", protect, Dashboard.topTransactionStatus);
router.get("/status/total", protect, Dashboard.getStatusTotalByMonth);
router.get("/status/percentage", protect, Dashboard.getStatusPercentageByDate);

export default router;
