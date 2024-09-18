import { User } from "@app/services/user";

const userTypes: Array<User['type']> = ['doctor', 'mfa'];

const users: User[]= [{
  id: 'doctor-01',
  name: 'Doctor 01',
  email: 'doctor01@email.com',
  type: 'doctor',
  lanr: 'LANR-01',
},
{
  id: 'doctor-02',
  name: 'Doctor 02',
  email: 'doctor02@email.com',
  type: 'doctor',
  lanr: 'LANR-02',
},
{
  id: 'mfa-01',
  name: 'MFA 01',
  email: 'mfa01@email.com',
  type: 'mfa',
}];

const fixtures = {
  userTypes,
  users,
};

export default fixtures;
