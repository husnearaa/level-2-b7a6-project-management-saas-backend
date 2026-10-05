export interface ICreateCheckoutPayload {
  amount: number;
  currency?: string;
  description?: string;
}

export interface IPaymentQuery {
  id: string;
}