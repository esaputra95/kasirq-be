import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    uploadImage,
    getProductSell
} from "#controllers/masters/ProductController"
import { ImageUpload } from "#root/helpers/uploadImage";
const Route = express.Router()

Route.get('/', getData);
Route.get('/sell', getProductSell);
Route.post('/image', ImageUpload.single('images'), uploadImage);
Route.post('/',  postData);
Route.put('/:id', updateData);
Route.delete('/:id', deleteData);
Route.get('/:id', getDataById);

export default Route