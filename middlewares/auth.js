import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { AALAP_TOKEN } from "../constants/config.js";
import { User } from "../models/user.js";

const isAuthenticated =  TryCatch((req, res, next) => {

    const token = req.cookies[AALAP_TOKEN];

    if(!token) return next(new ErrorHandler("Please Login To Access This Route", 401));

    const decodeData = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodeData._id;

    next();
}
);

const adminOnly =  (req, res, next) => {

    const token = req.cookies["Aalap-admin-token"];

    if(!token) return next(new ErrorHandler("Only Admin Can Access This Route", 401));

    const secretKey = jwt.verify(token, process.env.JWT_SECRET);
    const isMatch = secretKey ===  adminSecretKey;

    if(!isMatch) return next(new ErrorHandler("Only Admin Can Access This Route",401));


    next();
};

const socketAuthenticator = async (err, socket, next) => {
    try {
        if(err) return next(err);

        const authToken = socket.request.cookies[AALAP_TOKEN];
        
        if(!authToken) return next(new ErrorHandler("Please Login to Access this route", 401));

        const decodeData = jwt.verify(authToken, process.env.JWT_SECRET);

        
        const user = await User.findById(decodeData._id);
        if(!user) return next(new ErrorHandler("Please login to access the route", 401));

        socket.user = user;

        return next ();

    } catch (error) {
        console.log(error);
        return next(new ErrorHandler("Please Login to Access this Route",401));

        
    }

};


export { isAuthenticated, adminOnly, socketAuthenticator };




