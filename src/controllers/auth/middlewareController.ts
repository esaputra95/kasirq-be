import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';

const AccessToken = async (req:Request, res:Response, next:NextFunction) => {
    try {
        const authHeader = req.headers.authorization ?? '';
        if(!authHeader) throw new Error("");
        
        const token = authHeader.split(" ")[1];
        if(token==null) return res.send(401);
        
        jwt.verify(token, '1234567890', (err, decode:any)=>{
            if(err) return res.send(403);
            res.locals.userId = decode?.id ?? ''
            res.locals.userType = decode?.userType ?? ''
            return next()
        })
    } catch (error) {
        console.log('error');
        
        res.send(403)
    }
}

export {
    AccessToken
}