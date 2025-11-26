import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    uploadImage,
    getProductSell,
    getPriceMember
} from "#root/mobile/controllers/masters/ProductController";
import { ImageUpload } from "#root/helpers/uploadImage";
import multer from "multer";
import validationMessage from "#root/validations/Validate";
import { ProductValidation, ProductUpdateValidation } from "#root/validations/masters/ProductValidation";

const Route = express.Router();

Route.get('/', getData);
Route.get('/sell', getProductSell);
Route.post('/image', (req, res, next) => {
    ImageUpload.single('images')(req, res, function (err) {
        if (err) {
            if (err instanceof multer.MulterError) {
                // Multer error seperti file terlalu besar
                return res.status(400).json({ error: err.message });
            } else if (err instanceof Error) {
                // Error validasi dari fileFilter (seperti format tidak valid)
                return res.status(400).json({ error: err.message });
            }
        }

        // Jika tidak ada error, lanjut ke controller
        uploadImage(req, res);
    });
});
Route.post('/', validationMessage(ProductValidation), postData);
Route.post('/check-member-price', getPriceMember);
Route.put('/:id', validationMessage(ProductUpdateValidation), updateData);
Route.delete('/:id', deleteData);
Route.get('/:id', getDataById);

export default Route;