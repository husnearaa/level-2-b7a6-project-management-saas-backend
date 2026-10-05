import Stripe from "stripe";

import { PaymentStatus, PaymentProvider } from "../../../prisma/generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

import type { ICreateCheckoutPayload } from "./payment.interface";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

const stripe = new Stripe(stripeSecretKey);

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:3000";

const createCheckoutSession = async (
  userId: string,
  payload: ICreateCheckoutPayload
) => {
  const amountInCents = Math.round(payload.amount * 100);

  const currency = (payload.currency || "usd").toLowerCase();

  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: payload.amount,
      currency: currency.toUpperCase(),
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.PENDING,
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      provider: true,
      status: true,
      createdAt: true,
    },
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: payload.description || "Project Management SaaS Payment",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],

      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${frontendUrl}/payment/cancel`,

      metadata: {
        paymentId: payment.id,
        userId,
      },
    });

    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        stripeSessionId: session.id,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        provider: true,
        status: true,
        stripeSessionId: true,
        createdAt: true,
      },
    });

    return {
      payment: updatedPayment,
      checkoutUrl: session.url,
    };
  } catch (error) {
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    throw error;
  }
};

const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string
) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError(
      500,
      "STRIPE_WEBHOOK_SECRET is not configured"
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch {
    throw new AppError(
      400,
      "Invalid Stripe webhook signature"
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const paymentId = session.metadata?.paymentId;

      if (!paymentId) {
        break;
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      await prisma.payment.updateMany({
        where: {
          id: paymentId,
        },
        data: {
          status: PaymentStatus.PAID,
          stripePaymentIntentId: paymentIntentId,
          stripeEventId: event.id,
          paidAt: new Date(),
        },
      });

      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      const payment = await prisma.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentIntent.id,
        },
        select: {
          id: true,
        },
      });

      if (payment) {
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.FAILED,
            stripeEventId: event.id,
          },
        });
      }

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;

      const paymentId = session.metadata?.paymentId;

      if (!paymentId) {
        break;
      }

      await prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.CANCELED,
          stripeEventId: event.id,
        },
      });

      break;
    }

    default:
      break;
  }

  return {
    received: true,
  };
};

const getPaymentById = async (
  userId: string,
  userRole: string,
  paymentId: string
) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      id: true,
      userId: true,
      subscriptionId: true,
      amount: true,
      currency: true,
      provider: true,
      status: true,
      stripeSessionId: true,
      stripePaymentIntentId: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, "Payment not found");
  }

  if (userRole !== "ADMIN" && payment.userId !== userId) {
    throw new AppError(
      403,
      "You do not have permission to access this payment"
    );
  }

  return payment;
};

export const paymentService = {
  createCheckoutSession,
  handleStripeWebhook,
  getPaymentById,
};