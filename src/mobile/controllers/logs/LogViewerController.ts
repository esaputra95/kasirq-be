import { Request, Response } from "express";
import fs from "fs";
import path from "path";

const viewLogs = async (req: Request, res: Response) => {
    try {
        const key = req.query.key;
        const secretKey = "ceklog"; // Bisa dipindah ke .env nanti

        if (key !== secretKey) {
            return res.status(401).send("Unauthorized: Invalid Key");
        }

        const logFile = path.join(process.cwd(), "logs", "error.log");

        if (!fs.existsSync(logFile)) {
            return res.status(404).send("Log file not found.");
        }

        const logContent = fs.readFileSync(logFile, "utf-8");

        // Kirim sebagai plain text agar mudah dibaca di browser
        res.setHeader("Content-Type", "text/plain");
        res.status(200).send(logContent);
    } catch (error) {
        res.status(500).send("Internal Server Error: " + error);
    }
};

export { viewLogs };
