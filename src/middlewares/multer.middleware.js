import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname);
  },
});

export const upload = multer({ storage: storage });

// ye multer middleware bnaya hai middleware ka mtlb hai ki jate hue milke jana multer humne use kia hai ki hum apne files ko localstorage m save krvaye and then ye filepath dega toh hum uss file ko cloudinary pr upload krva denge and upload hone k baad localstorage se delete kr denge.
