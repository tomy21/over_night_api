import express from "express";
import * as Users from "../../controller/OverNight/Users.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", Users.register);
router.post("/login", Users.login);
router.get("/get-all-users", Users.getUsers);
router.get("/logout", Users.logout);
router.get("/get-byid", Users.getUsersById);
router.get("/getdetail-login", protect, Users.loginDetail);
router.get("/getuser-bylocation", protect, Users.getUserByLocation);
router.get("/getById/:id", protect, Users.getById);
router.get("/get-location-byRole", protect, Users.getLocation);

router.get("/protected", protect, (req, res) => {
  const token = req.cookies.refreshToken;
  res.status(200).json({
    status: "success",
    message: "You have access to this route",
    token: token,
  });
});

export default router;
