import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get userdetails from frontend
  // validation - not empty
  // check if user already exists: username,email
  // check for images,check for avatar
  // upload them to cloudinary,avatar
  // create user object -  create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { username, email, fullname, password } = req.body;
  // check is required fields are empty or not
  if (
    [fullname, email, username, password].some((item) => item?.trim() === "")
  ) {
    throw new ApiError(400, "ALL fields are required");
  }
  // check user exist or not
  const existeduser = await User.findOne({ $or: [{ email }, { username }] });
  if (existeduser) {
    throw new ApiError(409, "Unique Username and Email is required");
  }
  // get local file path from multer
  const avatarlocalpath = req.files?.avatar[0]?.path;

  let coverimagelocalpath;
  if (
    req.files &&
    Array.isArray(req.files.coverimage) &&
    req.files.coverimage.length > 0
  ) {
    coverimagelocalpath = req.files?.coverimage[0]?.path;
  }

  if (!avatarlocalpath) {
    throw new ApiError(400, "Avatar file is required");
  }
  // upload files on cloudinary

  const uploadedavatar = await uploadoncloudinary(avatarlocalpath);
  const uploadedcover = await uploadoncloudinary(coverimagelocalpath);

  const user = await User.create({
    fullname,
    avatar: uploadedavatar.url,
    coverimage: uploadedcover?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createduser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createduser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createduser, "User registered successfully"));
});

export { registerUser };
