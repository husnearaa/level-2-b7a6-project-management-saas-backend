import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";
import type { IPaymentQuery } from "./payment.interface";
import { catchAsync } from "../../utils/catchAsync";

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await paymentService.createCheckoutSession(
        req.user!.id,
        req.body,
      );

    sendResponse(res, {
      success: true,
      statusCode: 201,
      message:
        "Stripe checkout session created successfully",
      data: result,
    });
  },
);

const getMyPayments = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await paymentService.getMyPayments(
        req.user!.id,
        req.query as unknown as IPaymentQuery,
      );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message:
        "Payment history retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const stripeWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const signature =
      req.headers["stripe-signature"];

    const result =
      await paymentService.handleStripeWebhook(
        req.body as Buffer,
        signature,
      );

    res.status(200).json(result);
  },
);

export const paymentController = {
  createCheckoutSession,
  getMyPayments,
  stripeWebhook,
};