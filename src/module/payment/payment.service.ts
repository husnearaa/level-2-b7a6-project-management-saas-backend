import Stripe from "stripe";

import {
  PaymentProvider,
  PaymentStatus,
} from "../../../prisma/generated/prisma/enums";

import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

import type {
  ICreateCheckoutPayload,
  IPaymentQuery,
} from "./payment.interface";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

const stripe = new Stripe(stripeSecretKey);

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:3000";

/* =========================================================
   CREATE CHECKOUT SESSION
========================================================= */

const createCheckoutSession = async (
  userId: string,
  payload: ICreateCheckoutPayload
) => {
  const amountInCents = Math.round(payload.amount * 100);

  const currency = (
    payload.currency || "usd"
  ).toLowerCase();

  /*
   * Create payment record first.
   * It starts as PENDING.
   */
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
    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        payment_method_types: ["card"],

        line_items: [
          {
            price_data: {
              currency,

              product_data: {
                name:
                  payload.description ||
                  "Project Management SaaS Payment",
              },

              unit_amount: amountInCents,
            },

            quantity: 1,
          },
        ],

        success_url:
          `${frontendUrl}/payment/success` +
          `?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${frontendUrl}/payment/cancel`,

        metadata: {
          paymentId: payment.id,
          userId,
        },
      });

    const updatedPayment =
      await prisma.payment.update({
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

/* =========================================================
   GET MY PAYMENTS
========================================================= */

const getMyPayments = async (
  userId: string,
  query: IPaymentQuery
) => {
  const page = Math.max(
    Number(query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100
  );

  const skip = (page - 1) * limit;

  const where = {
    userId,

    ...(query.status && {
      status:
        query.status as PaymentStatus,
    }),
  };

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "amount",
    "status",
    "paidAt",
  ];

  const sortBy =
    query.sortBy &&
    allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : "createdAt";

  const sortOrder =
    query.sortOrder === "asc"
      ? "asc"
      : "desc";

  const [payments, total] =
    await Promise.all([
      prisma.payment.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: sortOrder,
        },

        select: {
          id: true,
          amount: true,
          currency: true,
          provider: true,
          status: true,
          stripeSessionId: true,
          stripePaymentIntentId: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,

          subscription: {
            select: {
              id: true,
              plan: true,
              status: true,
            },
          },
        },
      }),

      prisma.payment.count({
        where,
      }),
    ]);

  const totalPages =
    Math.ceil(total / limit);

  return {
    payments,

    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/* =========================================================
   STRIPE WEBHOOK
========================================================= */

const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string
) => {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError(
      500,
      "STRIPE_WEBHOOK_SECRET is not configured"
    );
  }

  let event: Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
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
    /* =====================================================
       CHECKOUT COMPLETED
    ===================================================== */

    case "checkout.session.completed": {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const paymentId =
        session.metadata?.paymentId;

      if (!paymentId) {
        break;
      }

      const paymentIntentId =
        typeof session.payment_intent ===
        "string"
          ? session.payment_intent
          : null;

      /*
       * Prevent duplicate webhook processing.
       */
      const existingPayment =
        await prisma.payment.findUnique({
          where: {
            id: paymentId,
          },

          select: {
            status: true,
            stripeEventId: true,
          },
        });

      if (!existingPayment) {
        break;
      }

      if (
        existingPayment.status ===
          PaymentStatus.PAID &&
        existingPayment.stripeEventId ===
          event.id
      ) {
        break;
      }

      await prisma.payment.update({
        where: {
          id: paymentId,
        },

        data: {
          status: PaymentStatus.PAID,

          stripePaymentIntentId:
            paymentIntentId,

          stripeEventId: event.id,

          paidAt: new Date(),
        },
      });

      break;
    }

    /* =====================================================
       PAYMENT FAILED
    ===================================================== */

    case "payment_intent.payment_failed": {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      const payment =
        await prisma.payment.findFirst({
          where: {
            stripePaymentIntentId:
              paymentIntent.id,
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

    /* =====================================================
       CHECKOUT EXPIRED
    ===================================================== */

    case "checkout.session.expired": {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const paymentId =
        session.metadata?.paymentId;

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

export const paymentService = {
  createCheckoutSession,
  getMyPayments,
  handleStripeWebhook,
};