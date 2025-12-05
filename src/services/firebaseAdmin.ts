import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });
}

export default admin;
