import express from "express";
import { adminLogin, adminLogout, allChats, allMessages, allUsers, getAdminData, getDashboardStats } from "../controllers/admin.js";
import { addminLoginValidator, validatorHandler } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";


const app = express.Router();

app.use(adminOnly)
app.get("/", getAdminData);
app.post("/verify",addminLoginValidator(),validatorHandler, adminLogin);
app.get("/logout", adminLogout);
app.get("/users", allUsers);
app.get("/chats", allChats);
app.get("/messages", allMessages);
app.get("/stats", getDashboardStats);






export default app;
