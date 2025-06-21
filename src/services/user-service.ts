import type {
  Customer,
  CustomerUpdate,
  CustomerUpdateAction,
  CustomerChangePassword,
} from '@commercetools/platform-sdk';

import { apiWithExistingTokenFlow, apiWithPasswordFlow } from './build-client';

export async function fetchCustomerRaw(): Promise<Customer> {
  const apiRoot = apiWithExistingTokenFlow();
  const resp = await apiRoot.me().get().execute();
  if (!resp.body) {
    throw new Error(`Empty profile response (status ${resp.statusCode})`);
  }
  return resp.body as Customer;
}

export async function patchCustomerRaw(
  customerId: string,
  version: number,
  actions: CustomerUpdateAction[]
): Promise<Customer> {
  const apiRoot = apiWithExistingTokenFlow();
  const upd = await apiRoot
    .customers()
    .withId({ ID: customerId })
    .post({ body: { version, actions } as CustomerUpdate })
    .execute();
  if (!upd.body) {
    throw new Error(`Empty update response (status ${upd.statusCode})`);
  }
  return upd.body as Customer;
}

export async function countCustomersByEmail(email: string): Promise<number> {
  const apiRoot = apiWithExistingTokenFlow();
  const resp = await apiRoot
    .customers()
    .get({ queryArgs: { where: `email="${email}"` } })
    .execute();
  return resp.body.count ?? 0;
}

export async function changePasswordService(
  userEmail: string,
  currentPassword: string,
  newPassword: string
): Promise<Customer> {
  // 1. Новый API-клиент по логину пользователя:
  const authRoot = apiWithPasswordFlow(userEmail, currentPassword);

  // 2. Берём профиль, чтобы получить customer.id и customer.version
  const meResp = await authRoot.me().get().execute();
  if (!meResp.body) {
    throw new Error(`Cannot fetch profile (status ${meResp.statusCode})`);
  }
  const customer = meResp.body as Customer;

  // 3. Делаем запрос смены пароля в этом же контексте
  const body: CustomerChangePassword = {
    id: customer.id,
    version: customer.version,
    currentPassword,
    newPassword,
  };
  const resp = await authRoot.customers().password().post({ body }).execute();
  if (!resp.body) {
    throw new Error(`Password change failed (status ${resp.statusCode})`);
  }

  return resp.body as Customer;
}
