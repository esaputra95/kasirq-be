import { handleErrorMessage } from "#root/helpers/handleErrors";
import { LoginInterface } from "#root/interfaces/AuthInterface";
import Model from "#root/services/PrismaService";
import { compare } from "bcryptjs";
import { Request, Response } from "express";
import { sign } from "jsonwebtoken";

const Login = async (req: Request, res: Response) => {
    try {
        const data: LoginInterface = req.body;
        console.log({ data });
        
        const user = await Model.users.findFirst({
            where: {
                email: data.email,
                verified: 'active',
                OR: [
                    {
                        level: 'superadmin',
                    },
                    {
                        level: 'owner'
                    }
                ]
            }
        });
        if (!user) throw new Error('Username or password incorrect');
        
        const match = await compare(data.password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Wrong username or password" });
        }
        console.log({user});
        
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

export { Login }