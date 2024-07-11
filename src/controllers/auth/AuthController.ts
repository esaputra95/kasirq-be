import { Request, Response } from "express";
import Model from "#services/PrismaService";
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken';
import { LoginInterface } from "#root/interfaces/AuthInterface";

export const Login = async (req:Request, res:Response) => {
    try {
        const data:LoginInterface = req.body
        console.log({data});
        
        const user = await Model.users.findFirst({
            where: {
                email: data.email
            }
        });
        if(!user) throw new Error('Username or password incorrect')
        const match = await compare(data.password, user.password);
        if(!match) res.status(401).json({message: "Wrong username or password"});
        const accessToken = sign({
            id: user.id,
            username: user.username,
            name: user.name,
            userType: 'owner'
        }, '1234567890');
        res.json({
            token: accessToken
        })
    } catch (error) {
        console.log({error});
        
        res.status(404).json({
            message: `${error}`
        })
    }
}