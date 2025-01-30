import express from "express";
import * as TransactionOverNight from "../../controller/OverNight/TransactionOverNight.js";
import { protect } from "../../middleware/authMiddleware.js";
import multer from "multer";
import moment from "moment";

const router = express.Router();

const storageExcel = multer.memoryStorage();
const uploadExcel = multer({ storage: storageExcel });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const timestamp = moment().format("YYYYMMDDHHmmssSSS");
    const extension = file.originalname.split(".").pop();
    const newFilename = `${req.body.locationCode}_${timestamp}.${extension}`;
    cb(null, newFilename);
  },
});
const upload = multer({ storage: storage });

router.get(
  "/getAllOverNight",
  protect,
  TransactionOverNight.getDataOvernightAll
);

router.get(
  "/getAllOverNightCMS",
  protect,
  TransactionOverNight.getDataOverNightUsers
);

router.get("/get-data-recon", protect, TransactionOverNight.getDataRecon);
router.get("/exportDataOn", protect, TransactionOverNight.exportDataOverNight);
router.patch("/update-status/:id", protect, TransactionOverNight.updateStatus);

router.get(
  "/getLocation-byuser",
  protect,
  TransactionOverNight.getLocationByUser
);

router.get(
  "/input-transaction-post",
  protect,
  TransactionOverNight.saveToTransactionOverNights
);

router.get(
  "/getAllOverNightApps",
  protect,
  TransactionOverNight.getDataOverNightUsersOfficer
);

router.post(
  "/upload/imageOfficer",
  protect,
  upload.single("file"),
  TransactionOverNight.validationData
);

router.get(
  "/getbyplate-realtime",
  TransactionOverNight.getByPlateNumberRealtime
);

export default router;
