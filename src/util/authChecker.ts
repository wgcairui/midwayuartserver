import { AuthChecker } from 'type-graphql';
import { IContext } from '../interface';
//import { UserRole } from './constants';

export const authChecker: AuthChecker<IContext> = ({ root, args, context: { currentReqUser: { role }, }, info, }, requiredAuth): boolean => {
    const requiredAuthRole = Number(requiredAuth[0]);
    return role >= requiredAuthRole;
};