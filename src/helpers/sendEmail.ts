import * as nodemailer from "nodemailer";

const sendEmail = async (email:string, code:string, type:'register' | 'forgot-password', message?:string) => {
    try {
        // if(type==="register"){
        if(!email) throw new Error ("Email not found")
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "ekosaputra.t.i@gmail.com",
                pass: "eqth ktax wxoa suei",
            },
        });
        // Define the email options

        let body:string = ''
        if(type==="register"){
            body=`<body>
            <h1>Kasir Q</h1>
            <p>Selamat! Kamu sudah satu langkah lebih dekat untuk terdaftar di Kasir Q, jangan sampai ketinggalan! Klik link di bawah untuk mengaktifkan akun Kamu</p>
            <a href='${process.env.BE_URL}/auth/verification?code=${code}'>Verifikasi disini</a>
            </body>`
        }else if(type==='forgot-password'){
            body=`<body>
            <h1>Kasir Q</h1>
            <p>Kode reset password ${code}</p>
            </body>`
        }else{
            body=`<body>
            <h1>Kasir Q</h1>
            <p>Kode reset password ${code}</p>
            </body>`
        }
        const mailOptions: nodemailer.SendMailOptions = {
            from: "itmasjidpedia@gmail.com",
            to: email,
            subject: "Perifikasi Akun Kasir Q",
            text: ``,
            html: body,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Email sent:", info.response);
            }
        });
        // }
    } catch (error) {
        
    }
}

export default sendEmail