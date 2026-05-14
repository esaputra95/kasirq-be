import multer from 'multer';
import path from 'path';

const logoStorage = multer.diskStorage({
    // Destination to store receipt logo
    destination: path.join(__dirname, '../public/logos'),
    filename: (req, file, cb) => {
        cb(null, 'logo_' + Date.now() + path.extname(file.originalname));
    }
});

const LogoUpload = multer({
    storage: logoStorage,
    limits: {
        fileSize: 5000000, // 5 MB
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
            return cb(new Error('Please upload an image with a valid format (png, jpg, or jpeg).'));
        }
        cb(null, true);
    },
});

export { LogoUpload };
