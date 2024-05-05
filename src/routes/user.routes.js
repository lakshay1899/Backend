import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshaccesstoken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();
// register user se pehle multer middleware s go-through kia taki images updload ho jaye

userRouter.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverimage", maxCount: 1 },
  ]),
  registerUser
);

userRouter.route("/login").post(loginUser);

//secured routes

userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshaccesstoken);

export default userRouter;
