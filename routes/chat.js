import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addMembers,
    deleteChat,
     getChatDetails,
      getMessages,
       getMyChats,
        getMyGroups,
         leaveGroup,
          newGroupChat, 
            removeMember,
             renameGroup,
              sendAttachments } from "../controllers/chat.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import { addMemberValidator,
   chatIdValidator,
    newGroupValidator,
     removeMemberValidator,
      renameValidator,
      sendAttachmentsValidator,
       validatorHandler } from "../lib/validators.js";


const app = express.Router();



app.use(isAuthenticated);
app.post("/new", newGroupValidator(), validatorHandler, newGroupChat);

app.get("/my",getMyChats);
app.get("/my/groups",getMyGroups);
app.put("/addmembers",addMemberValidator(), validatorHandler ,addMembers);
app.put("/removemember",removeMemberValidator(), validatorHandler, removeMember);
app.delete("/leave/:id",chatIdValidator() ,validatorHandler, leaveGroup);
app.post("/message", attachmentsMulter,sendAttachmentsValidator(),validatorHandler, sendAttachments);

app.get("/message/:id", chatIdValidator(),validatorHandler, getMessages);

app.route("/:id")
.get(chatIdValidator(), validatorHandler, getChatDetails)
.put(renameValidator(), validatorHandler, renameGroup)
.delete(chatIdValidator(), validatorHandler, deleteChat);


export default app;
