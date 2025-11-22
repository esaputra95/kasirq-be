import * as nodemailer from "nodemailer";

const sendEmail = async (email: string, code: string, type: 'register' | 'forgot-password'): Promise<void> => {
    try {
        if (!email) throw new Error("Email not found");

        // Use environment variables for email credentials
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
            throw new Error("Email credentials not configured in environment variables");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        // Dynamic subject based on email type
        let subject: string;
        let body: string;

        if (type === "register") {
            subject = "Verifikasi Akun Kasir Q";
            body = `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h1 style="color: #3056ff;">Kasir Q</h1>
                <p>Selamat! Kamu sudah satu langkah lebih dekat untuk terdaftar di Kasir Q, jangan sampai ketinggalan!</p>
                <p>Klik link di bawah untuk mengaktifkan akun Kamu:</p>
                <a target="_blank" href='${process.env.BE_URL || "https://kasirq.id"}/auth/verification?code=${encodeURIComponent(code)}' 
                   style="display: inline-block; padding: 10px 20px; background-color: #3056ff; color: white; text-decoration: none; border-radius: 5px;">
                    Verifikasi Akun
                </a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">
                    Jika Anda tidak mendaftar di Kasir Q, abaikan email ini.
                </p>
            </body>
            </html>`;
        } else if (type === 'forgot-password') {
            subject = "Reset Password Kasir Q";
            body = `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h1 style="color: #3056ff;">Kasir Q</h1>
                <p>Anda telah meminta untuk mereset password akun Anda.</p>
                <p>Gunakan kode berikut untuk mereset password:</p>
                <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 2px;">
                    ${code}
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">
                    Jika Anda tidak meminta reset password, abaikan email ini dan password Anda akan tetap aman.
                </p>
            </body>
            </html>`;
        } else {
            throw new Error(`Unsupported email type: ${type}`);
        }

        const mailOptions: nodemailer.SendMailOptions = {
            from: emailUser,
            to: email,
            subject: subject,
            html: body,
        };

        // Use async/await instead of callback for better error handling
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.response);
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; // Re-throw error so caller can handle it
    }
}

export default sendEmail;