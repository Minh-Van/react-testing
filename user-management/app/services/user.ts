type User = {
  id: string;
  name: string;
  email: string;
} & (Doctor | MFA);

type Doctor = {
  type: 'doctor';
  lanr: string;
};

type MFA = {
  type: 'mfa';
};

let datasource: Array<(User & Doctor) | (User & MFA)> = [
  {
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
  }
];

async function getUsers() {
  return Promise.resolve({ data: datasource.map(item => { 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, ...rest } = item;
    return { ...rest };
   }) });
}

async function getUser(id: string) {
  await new Promise((resole) => setTimeout(() => resole(undefined), 1000));

  const result = datasource.find(item => item.id === id);
  return result ? Promise.resolve({ data: result }) : Promise.reject({ errorCode: 'User not found' });
}

async function createUser(data: Pick<User, 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>)) {
  await new Promise((resole) => setTimeout(() => resole(undefined), 1000));

  const id = Date.now().toString();
  datasource.push({ id, ...data });
  return Promise.resolve({ data: id });
}

async function updateUser(data: Pick<User, 'id' | 'name' | 'email'> & (Pick<Doctor, 'type' | 'lanr'> | Pick<MFA, 'type'>)) {
  await new Promise((resole) => setTimeout(() => resole(undefined), 1000));

  datasource = datasource.map((item) => item.id === data.id ? { ...data } : item);
  return Promise.resolve<void>(undefined);
}

async function deleteUser(id: string) {
  await new Promise((resole) => setTimeout(() => resole(undefined), 1000));

  datasource = datasource.filter((item) => item.id !== id);
  return Promise.resolve<void>(undefined);
}

export type { User, Doctor, MFA };

const UserService = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};

export default UserService;