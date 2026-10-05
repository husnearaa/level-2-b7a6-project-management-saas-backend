import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";
import { catchAsync } from "../../utils/catchAsync";

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.createCheckoutSession(
      req.user!.id,
      req.body
    );

    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Checkout session created successfully",
      data: result,
    });
  }
);

const stripeWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      res.status(400).json({
        success: false,
        message: "Stripe signature is required",
        errors: [],
      });
      return;
    }

    const result = await paymentService.handleStripeWebhook(
      req.body as Buffer,
      signature
    );

    res.status(200).json(result);
  }
);

const getPaymentById = catchAsync(
  async (req: Request, res: Response) => {
    const payment = await paymentService.getPaymentById(
      req.user!.id,
      req.user!.role,
      req.params.id as string
    );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Payment retrieved successfully",
      data: payment,
    });
  }
);

export const paymentController = {
  createCheckoutSession,
  stripeWebhook,
  getPaymentById,
};