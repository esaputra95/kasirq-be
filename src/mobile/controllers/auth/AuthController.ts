import { Request, Response } from "express";
import Model from "#root/services/PrismaService";
import { compare, genSalt, hash } from 'bcryptjs'
import { sign } from 'jsonwebtoken';
import { LoginInterface } from "#root/interfaces/AuthInterface";
import { v4 as uuidv4 } from 'uuid';
import sendEmail from "#root/helpers/sendEmail";
import path from 'path';
import moment from "moment";
import { handleErrorMessage, UnauthorizedError } from "#root/helpers/handleErrors";

const Login = async (req: Request, res: Response) => {
    try {
        const data: LoginInterface = req.body;
        
        const user = await Model.users.findFirst({
            where: {
                email: data.email,
                verified: 'active'
            }
        });
        if (!user) throw new UnauthorizedError("Username or password incorrect", 401);
        console.log({user});
        
        
        const match = await compare(data.password, user.password);
        if (!match) {
            throw new UnauthorizedError("Username or password incorrect", 401);
        }
        
        const accessToken = sign({
            id: user.id,
            username: user.username,
            name: user.name,
            level: user.level
        }, '1234567890');
        
        return res.json({ token: accessToken });
    } catch (error) {
        console.log({error});
        
        handleErrorMessage(res, error)
    }
};

const RegisterOwner = async (req:Request, res:Response) => {
    try {
        const body = req.body;
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
                token: query.token+''
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

const RequestCode = async (req:Request, rest:Response) => {
    try {
        const body = req.body;
        const data = await Model.users.findFirst({
            where: {
                email: body.email
            }
        });
        if(!data) throw Error();
        const code = Math.floor(10000 + Math.random() * 90000)
        
        await Model.users.updateMany({
            where: {
                email: data.email
            },
            data:{
                token: code+''
            }
        });
        await sendEmail(data.email??'', code+'', 'forgot-password')
        rest.status(200).json({
            status:true,
            message:'code is created'
        })
    } catch (error) {
        rest.status(500).json({
            status: false,
            message: `${error}`
        })
    }
}

const VerificationCode = async (req:Request, res:Response) => {
    try {
        
        const body = req.body;
        console.log({body});
        const data = await Model.users.findFirst({
            where: {
                token: body.code,
                email: body.email
            }
        });
        if(!data) return res.status(400).json({
            status:false,
            message: 'Code invalid'
        })
        console.log({data});
        
        res.status(200).json({
            status: true,
            message: 'Code Valid'
        })
    } catch (error) {
        console.log({error});
        
        res.status(500).json({
            status: false,
            message: `${error}`
        })
    }
}

const ForgotPassword = async (req:Request, res:Response) => {
    try {
        const body = req.body;
        const salt = await genSalt()
        body.password = await hash(body.newPassword, salt)
        if(body.newPassword !== body.newPassword) res.status(400).json({
            status: false,
            message: 'Password does not match'
        })
        await Model.users.updateMany({
            data: {
                password: body.password
            },
            where: {
                email: body.email
            }
        })
        res.status(200).json({
            status: true,
            message: 'success update password'
        })
    } catch (error) {
        console.log({error});
        
        res.status(500).json({
            status:false,
            message: `${error}`
        })
    }
}

export {
    Login,
    Verification,
    RegisterOwner,
    RequestCode,
    VerificationCode,
    ForgotPassword
}