import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
  console.log(email, username, password);

  if (!username && !email) {
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

// ye vala tb chalega jb accesstoken expire hoga and use dubara refresh krvana hai refreshtoken ki help s kyu ki acesstoken ki life km hoti hai or harr barr toh userloggedout nahi hota token expire hone pr vo islie hi session expire nahi hota kyu ki vo bar bar refresh hota hai.

const refreshaccesstoken = asyncHandler(async (req, res) => {
  const incomingrefreshtoken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingrefreshtoken) {
    throw new ApiError(401, "Unauthorize request");
  }
  const decodedToken = jwt.verify(
    incomingrefreshtoken,
    process.env.REFRESH_TOKEN_SECRET
  );
  const user = User.findById(decodedToken._id);

  if (user && User.refreshToken !== incomingrefreshtoken) {
    throw new ApiError(401, "Refresh token is expired");
  }
  const options = {
    httpOnly: true,
    secure: true,
  };

  const { access_token, refresh_token } = await generateaccessandrefreshtoken(
    user._id
  );

  return res
    .status(201)
    .cookie("accessToken", access_token, options)
    .cookie("refreshToken", refresh_token, options)
    .json(
      new ApiResponse(
        200,
        { access_token, refresh_token },
        "access token refreshed"
      )
    );
});

const changecurrentpassword = asyncHandler(async (req, res) => {
  const { oldpassword, newpassword } = req.body;
  const user = await User.findById(req.user?._id);
  const checkpassword = await user.isPasswordCorrect(oldpassword);
  if (!checkpassword) {
    throw new ApiError(401, "Invalid password");
  }
  user.password = newpassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"));
});

const getcurrentuser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateaccountdetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  const updateduser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname, email } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updateduser, "User updated successfully"));
});

const userAvatar = asyncHandler(async (req, res) => {
  const avatarfilepath = req.file?.avatar[0]?.path;
  if (!avatarfilepath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const updatedavatar = await cloudinary(avatarfilepath);
  if (updatedavatar.url) {
    throw new ApiError(400, "Error while uploading Avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: updatedavatar.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User updated successfully"));
});

const getUserchannelprofile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }
  // aggregate pipelines hum likhte hai dusre table s data nikalne k liye kisi condition k base par.
  // $match: pehle match krvaya ek user ko db m
  // lookup ka mtlb left join join krte waqt kuch cond dete hai na jiske base pr join krte hai toh vo kia.
  //ex:- https://www.w3schools.com/mongodb/mongodb_aggregations_lookup.php
  9;

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        issubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        issubscribed: 1,
      },
    },
  ]);
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshaccesstoken,
  changecurrentpassword,
  getcurrentuser,
  updateaccountdetails,
  userAvatar,
  getUserchannelprofile,
};
