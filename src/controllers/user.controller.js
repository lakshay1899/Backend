import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateaccessandrefreshtoken = async (userid) => {
  try {
    const user = await User.findById(userid);
    const access_token = await user.generateaccesstoken();
    const refresh_token = await user.generaterefreshtoken();
    user.refreshToken = refresh_token;
    await user.save({ validateBeforeSave: false });

    return { access_token, refresh_token };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating refresh and acess token"
    );
  }
};

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

const loginUser = asyncHandler(async (req, res) => {
  //get userdetails
  //check the details wheather exist in db
  //password check
  //generate access and refresh token
  //send tokens through cookies

  const { email, username, password } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "Please enter Email or Username");
  }
  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(400, "Please register Email and username");
  }

  if (!password) {
    throw new ApiError(400, "Please enter password");
  }
  const ispasswordvalid = await user.isPasswordCorrect(password);

  if (!ispasswordvalid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { access_token, refresh_token } = await generateaccessandrefreshtoken(
    user._id
  );
  // loggedinuser nikala but uska password and refreshtoken nahi chiaye isliye
  const loggedInuser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  // accesstoken and refesh token ko cookies m beja hai
  return res
    .status(200)
    .cookie("accessToken", access_token, options)
    .cookie("refreshToken", refresh_token, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInuser, access_token, refresh_token },
        "user logged in succesfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // logout krna hai user ko lekin humare pass kuch data nahi hai ki kis user ko logout krna kyu ki logout ki request k waqt humne info nikalni padegi ab vo token m milega kyu ki jb token banaya tha tb info beji thi usme and vo token humne cookies m beja hai toh ab pehle cookies s token nikalna hai and then token s user info.toh iske liye humne ek middleware banaya hai auth ka.jise req m user dia hai.

  await User.findByIdAndUpdate(req.user._id, {
    $set: { refreshToken: undefined },
  });
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
