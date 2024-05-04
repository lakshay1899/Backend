import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const Userschema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: { type: String, required: true, trim: true, index: true },
    avatar: {
      type: String, // cloudinary url
      required: true,
    },
    coverimage: {
      type: String, // cloudinary url
    },
    watchHistory: [{ type: Schema.Types.ObjectId, ref: "Video" }],
    password: { type: String, required: [true, "password is required"] },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// pre ek hook hai or we can call it a event . yha p hum userschema ko save krne s pehle ek function run krre hai.

Userschema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    // password modify ho tabhi use encrypt krna hai
    return next();
  } else {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  }
});
// model k liye hum custom method bhi likh sakte hai , kuch predefined hote hai jo nahi hote unhe schme.methods m dot lga k likh do. yha old encrypted password compare krre hai.

Userschema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

Userschema.methods.generateaccesstoken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};
Userschema.methods.generaterefreshtoken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

export const User = mongoose.model("User", Userschema);
