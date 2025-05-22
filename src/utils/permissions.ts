import { roleTypes } from '../config/roles';
import { IUser } from '../types/IUser';

export function userHasObjectPermission(user: IUser, obj: any) {
  if (user.role === roleTypes.USER) {
    if (obj.user) {
      return obj.user.toString() === user._id.toString();
    }
  }
  return true;
}
