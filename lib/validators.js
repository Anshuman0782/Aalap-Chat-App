import { body, validationResult, param, query } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validatorHandler = ( req, res, next) => {

    const errors = validationResult(req);
    const errorMessages = errors.array().map((error) => error.msg).join (", ");

    

    if(errors.isEmpty()) return next();
    else next(new ErrorHandler(errorMessages, 400));

};
const registerValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
    body("username", "Please Enter Username").notEmpty(),
    body("bio", "Please Enter Bio").notEmpty(),
    body("password", "Please Enter Password").notEmpty(),
];


const loginValidator = () => [
    body("username", "Please Enter Username").notEmpty(),
    body("password", "Please Enter Password").notEmpty(),
];

const newGroupValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
    body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 1, max: 100 })
    .withMessage("Members must be between 1 and 100"),
];

const addMemberValidator = () => [
    body("chatId", "Please Enter Chat Id").notEmpty(),
    body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 1, max: 98 })
    .withMessage("Members must be between 1 and 98"),
];

const removeMemberValidator = () => [
    body("chatId", "Please Enter Chat Id").notEmpty(),
    body("userId", "Please Enter User Id").notEmpty(),

];


const sendAttachmentsValidator = () => [
    body("chatId", "Please Enter Chat Id").notEmpty(),
   

];

const chatIdValidator = () => [
    param("id", "Please Enter Chat Id").notEmpty(),
    
];


const renameValidator = () => [
    param("id", "Please Enter Chat Id").notEmpty(),
    body("name", "Please Enter Name").notEmpty(),
    
];

const sendRequestValidator = () => [
    body("userId", "Please Enter User ID").notEmpty(),

];

const acceptRequestValidator = () => [
    body("requestId", "Please Enter Request ID").notEmpty(),
    body("accept")
    .notEmpty()
    .withMessage("Please Add Accept")
    .isBoolean()
    .withMessage("Accept Must Be a Boolean"),

];

const addminLoginValidator = () => [
    body("secretKey", "Please Enter Secrect Key").notEmpty(),
   

];

export { registerValidator,
     validatorHandler,
      loginValidator,
       newGroupValidator,
        addMemberValidator,
         removeMemberValidator,
          sendAttachmentsValidator,
            chatIdValidator,
              renameValidator,
              sendRequestValidator,
                acceptRequestValidator,
                  addminLoginValidator };