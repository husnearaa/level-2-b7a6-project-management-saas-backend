export interface ICreateCheckoutPayload {
  amount: number;
  currency?: string;
  description?: string;
}

export interface IPaymentQuery {
  page?: string;
  limit?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}