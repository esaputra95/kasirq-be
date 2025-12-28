import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
} from "#root/admin/controllers/masters/UserController";

const UserRoute = express.Router();

UserRoute.get("/", getData);
UserRoute.post("/", postData);
UserRoute.delete("/:id", deleteData);
UserRoute.put("/:id", updateData);
UserRoute.get("/:id", getDataById);

export default UserRoute;
