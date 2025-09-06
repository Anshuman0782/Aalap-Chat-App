import express from "express";
import { acceptFriendRequest,
     getMyFriends,
     getMyNotifiations,
      getMyProfile,
       login,
        logout,
         newUser,
          searchUser,
           sendFriendRequest } from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptRequestValidator,
     loginValidator,
      registerValidator,
       sendRequestValidator,
        validatorHandler } from "../lib/validators.js";


const app = express.Router();

app.post("/new", singleAvatar, registerValidator(), validatorHandler, newUser);

app.post("/login", loginValidator(), validatorHandler, login);

app.use(isAuthenticated);
app.get("/me", getMyProfile);
app.get("/logout", logout);
app.get("/search", searchUser);

app.put("/sendrequest",
    sendRequestValidator(),
    validatorHandler, 
    sendFriendRequest
);

app.put("/acceptrequest",
    acceptRequestValidator(),
    validatorHandler, 
    acceptFriendRequest
);

app.get(
    "/notification", 
    getMyNotifiations
);

app.get(
    "/friends", 
    getMyFriends
)





export default app;
