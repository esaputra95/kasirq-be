import { Request, Response } from "express";
import Model from "#services/PrismaService";
import { compare, genSalt, hash } from 'bcryptjs'
import { sign } from 'jsonwebtoken';
import { LoginInterface } from "#root/interfaces/AuthInterface";
import { v4 as uuidv4 } from 'uuid';
import sendEmail from "#root/helpers/sendEmail";
import path from 'path';
import moment from "moment";

const Login = async (req:Request, res:Response) => {
    try {
        const data:LoginInterface = req.body
    console.log({data});
        
        const user = await Model.users.findFirst({
            where: {
                email: data.email,
                verified: 'active'
            }
        });
        if(!user) throw new Error('Username or password incorrect')
        const match = await compare(data.password, user.password);
        if(!match) res.status(401).json({message: "Wrong username or password"});
        const accessToken = sign({
            id: user.id,
            username: user.username,
            name: user.name,
            level: user.level
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

const RegisterOwner = async (req:Request, res:Response) => {
    try {
        const body = req.body;
        console.log({body});
        
        const salt = await genSalt()
        body.password = await hash(body.password, salt)
        const token = Math.random().toString(36).substring(2,7);
        const code = await hash(token, salt)
        const data = await Model.users.create({
            data: {
                id: uuidv4(),
                name: body.name,
                password: body.password,
                email: body.email,
                username: body.email,
                token: code,
                level: 'owner'
            }
        });

        await Model.stores.create({
            data:{
                id: uuidv4(),
                ownerId: data.id,
                name: body.store,
                expiredDate: moment().add(30, 'd').format(),
                address: body.address,
            }
        })

        await sendEmail(req.body.email, code, 'register')

        res.status(200).json({
            status: true,
            message: 'success post user data',
            data: data
        })
    } catch (error) {
        console.log({error});
        
        res.status(500).json({
            status: false,
            message: `${error}`
        })
    }
}

const Verification = async (req:Request, res:Response) => {
    try {
        const query = req.query;
        const user = await Model.users.findFirst({
            where: {
                token: query.code+''??''
            }
        });
        
        if(!user) throw new Error('invalid token') 
        await Model.users.update({
            where: {
                id: user.id
            },
            data: {
                token: '',
                verified: 'active'
            }
        })

        res.sendFile(path.join(__dirname, '/../../../message.html'));
        
    } catch (error) {
        console.log({error})
    }
}

export {
    Login,
    Verification,
    RegisterOwner
}