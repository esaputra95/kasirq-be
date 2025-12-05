import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
    markAsRead,
    getUserNotification,
} from "#root/admin/controllers/masters/NotificationController";

const NotificationRoute = express.Router();

NotificationRoute.get("/", getData);
NotificationRoute.post("/", postData);
NotificationRoute.delete("/:id", deleteData);
NotificationRoute.put("/:id", updateData);
NotificationRoute.get("/users", getUserNotification);
NotificationRoute.get("/:id", getDataById);
NotificationRoute.put("/:id/read/:userId", markAsRead);

export default NotificationRoute;
